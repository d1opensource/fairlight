import Observable from 'zen-observable'
import PushStream from 'zen-push'

import {DEFAULT_FETCH_POLICY, DEFAULT_REQUEST_METHOD} from '../constants'
import {ApiError} from '../errors'
import {GenericCache} from '../generic-cache'
import {applyHeaders, cloneHeaders, getParamsId} from '../lib'
import {ApiRequestFetcher} from '../request-fetcher'
import {
  ApiHeaders,
  ApiParseResponseJson,
  ApiRequestFetchPolicy,
  ApiRequestMethod,
  ApiRequestOptions,
  ApiRequestParams,
  ApiSerializeRequestJson,
  RequestBody,
  RequestFetcher,
  RequestFetcherResponse,
  ResponseBody
} from '../typings'

function identity<T>(value: T): T {
  return value
}

/**
 * The request manager is responsible for managing API requests.
 *
 * Responsibilities include:
 * - Implementing `getRequestBody` which is called by `Api`
 * - Caching in-progress GET requests
 * - Detecting a JSON request body by stringifying and setting the appropriate Content-Type headers
 * - Serializing / parsing JSON requests & responses
 */
export class ApiRequestManager {
  baseUrl: string

  defaultFetchPolicy: ApiRequestFetchPolicy

  private responseBodyStream = new PushStream<
    [ApiRequestParams, ResponseBody]
  >()

  private errorStream = new PushStream<Error>()

  private requestFetcher: RequestFetcher

  private serializeRequestJson: ApiSerializeRequestJson

  private parseResponseJson: ApiParseResponseJson

  private defaultHeaders: ApiHeaders = {}

  private inProgressRequestCache = new GenericCache<{
    id: symbol
    requestPromise: Promise<ResponseBody | null>
  }>()

  constructor(params: {
    /**
     * Base URL of API to prefix all requests with
     */
    baseUrl?: string
    /**
     * Base URL of API to prefix all requests with
     */
    defaultFetchPolicy?: ApiRequestFetchPolicy
    /**
     * When provided, all API JSON request bodies will be run
     * through this transformation function before the API request
     */
    serializeRequestJson?: ApiSerializeRequestJson
    /**
     * When provided, all API JSON response bodies will be run
     * through this transformation function before returning the response
     */
    parseResponseJson?: ApiParseResponseJson
    requestFetcher?: RequestFetcher
  }) {
    this.baseUrl = params.baseUrl || ''
    this.defaultFetchPolicy = params.defaultFetchPolicy || DEFAULT_FETCH_POLICY
    this.requestFetcher = params.requestFetcher || new ApiRequestFetcher()
    this.serializeRequestJson = params.serializeRequestJson || identity
    this.parseResponseJson = params.parseResponseJson || identity
  }

  /**
   * Returns a promise that resolves with the response body.
   *
   * If there is an in-progress request, and `options.deduplicate` is `true`,
   * it will return the same promise.
   *
   * On a successful fetch, it will cache the response unless `fetchPolicy` is `'no-cache'`
   */
  getResponseBody = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>,
    options: ApiRequestOptions
  ): Promise<TResponseBody | null> => {
    const paramsKey = getParamsId(params)

    // return cached promise if it exists
    const cachedRequest = this.inProgressRequestCache.get(paramsKey)
    const deduplicate = options.deduplicate ?? defaultDeduplicate(params)
    if (cachedRequest && deduplicate) {
      // if user hasn't explicitly requested a new fetch,
      // return the in-progress fetch promise
      return cachedRequest.requestPromise as Promise<TResponseBody>
    }

    const id = Symbol()
    const fetchPromise = this.createRequestPromise(params, options, id)

    this.inProgressRequestCache.set(paramsKey, {
      id,
      requestPromise: fetchPromise
    })

    return fetchPromise as Promise<TResponseBody>
  }

  private async createRequestPromise(
    params: ApiRequestParams,
    options: ApiRequestOptions,
    id: symbol
  ): Promise<ResponseBody | null> {
    const paramsId = getParamsId(params)

    try {
      return await this.fetchResponseBody(params, options)
    } finally {
      const cachedRequest = this.inProgressRequestCache.get(paramsId)

      if (cachedRequest && cachedRequest.id === id) {
        this.inProgressRequestCache.del(paramsId)
      }
    }
  }

  /**
   * Configuring an error handler to be called on error
   */
  get onReceivedResponseBody(): Observable<[ApiRequestParams, ResponseBody]> {
    return this.responseBodyStream.observable
  }

  /**
   * Configuring an error handler to be called on error
   */
  get onError(): Observable<Error> {
    return this.errorStream.observable
  }

  /**
   * Returns `true` if a `GET` request matches params
   */
  requestInProgress = (params: ApiRequestParams): boolean => {
    return this.inProgressRequestCache.has(getParamsId(params))
  }

  /**
   * Set default headers to be passed to all API requests.
   * Useful for setting an authentication token.
   *
   * @param key Header key
   * @param value Header value
   */
  setDefaultHeader = (key: string, value: string): void => {
    this.defaultHeaders = applyHeaders(this.defaultHeaders, {[key]: value})
  }

  private fetchResponseBody = async (
    params: ApiRequestParams,
    options: ApiRequestOptions
  ): Promise<ResponseBody | null> => {
    const {fetchPolicy = this.defaultFetchPolicy} = options
    try {
      const {body, headers} = this.getRequestHeadersAndBody(params)

      const response = await this.requestFetcher.getResponse({
        method: params.method || DEFAULT_REQUEST_METHOD,
        url: `${this.baseUrl}${params.url}`,
        body,
        headers,
        responseType: params.responseType,
        successCodes: params.successCodes
      })

      const parsedResponse: RequestFetcherResponse = {
        ...response,
        body:
          response.bodyType === 'json'
            ? this.parseResponseJson(response.body as object, params)
            : response.body
      }

      this.maybeThrowApiError(params, parsedResponse)

      const {body: responseBody} = parsedResponse

      if (fetchPolicy !== 'no-cache') {
        this.responseBodyStream.next([params, responseBody as ResponseBody])
      }

      return responseBody
    } catch (error) {
      this.errorStream.next(error)
      throw error
    }
  }

  /**
   * Modifies request headers and body to use for the request.
   * - Headers are merged with any defined default headers.
   * - For JSON request bodies, it is serialized to a string and
   *   sets the appropriate 'Content-Type' header.
   */
  private getRequestHeadersAndBody(
    params: ApiRequestParams
  ): {headers: ApiHeaders; body: BodyInit | undefined} {
    let headers: ApiHeaders = cloneHeaders(this.defaultHeaders)

    if (params.headers) {
      headers = applyHeaders(headers, params.headers)
    }

    let body: BodyInit | undefined

    if (
      params.method &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(params.method)
    ) {
      const paramBody = (params as {body: RequestBody}).body

      if (
        paramBody &&
        ![Blob, FormData, URLSearchParams, ReadableStream].some(
          (bodyType) => paramBody instanceof bodyType
        ) &&
        typeof paramBody !== 'string'
      ) {
        // prepare JSON body and add header
        body = JSON.stringify(
          this.serializeRequestJson(paramBody as object, params)
        )
        headers['content-type'] = 'application/json'
      } else {
        body = paramBody as BodyInit
      }
    }

    return {headers, body}
  }

  /**
   * Throws `ApiError` if the response status does not match a passed success code.
   * If no success codes are passed and the fetch response is not 'ok', throws `ApiError`
   */
  private maybeThrowApiError(
    params: ApiRequestParams,
    {status, body, bodyType}: RequestFetcherResponse
  ): void {
    if (Array.isArray(params.successCodes)) {
      if (params.successCodes.every((code) => status !== code)) {
        throw new ApiError(
          params.method ?? DEFAULT_REQUEST_METHOD,
          params.url,
          status,
          body,
          bodyType
        )
      }
    } else if (status < 200 || status > 299) {
      throw new ApiError(
        params.method ?? DEFAULT_REQUEST_METHOD,
        params.url,
        status,
        body,
        bodyType
      )
    }
  }
}

function defaultDeduplicate(params: ApiRequestParams) {
  return params.method === 'GET' ? true : false
}
