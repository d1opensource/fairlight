import EventEmitter from 'eventemitter3'

import {DEFAULT_FETCH_POLICY, DEFAULT_REQUEST_METHOD} from '../constants'
import {ApiError} from '../errors'
import {GenericCache} from '../generic-cache'
import {applyHeaders, createSubscription, getParamsId} from '../lib'
import {ApiRequestFetcher} from '../request-fetcher'
import {
  ApiParseResponseJson,
  ApiRequestFetchPolicy,
  ApiRequestMethod,
  ApiRequestOptions,
  ApiRequestParams,
  ApiSerializeRequestJson,
  RequestBody,
  RequestFetcher,
  ResponseBody
} from '../typings'

function identity<T>(value: T): T {
  return value
}

const RECEIVED_RESPONSE_BODY_EVENT = 'received_response_body'

const ERROR_EVENT = 'error'

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

  private emitter = new EventEmitter()

  private requestFetcher: RequestFetcher

  private serializeRequestJson: ApiSerializeRequestJson

  private parseResponseJson: ApiParseResponseJson

  private defaultHeaders = new Headers()

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
  onReceivedResponseBody = (
    listener: (params: ApiRequestParams, responseBody: ResponseBody) => void
  ) => {
    return createSubscription(
      this.emitter,
      RECEIVED_RESPONSE_BODY_EVENT,
      listener
    )
  }

  /**
   * Configuring an error handler to be called on error
   */
  onError = (listener: (error: Error) => void) => {
    return createSubscription(this.emitter, ERROR_EVENT, listener)
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
    this.defaultHeaders.set(key, value)
  }

  private fetchResponseBody = async (
    params: ApiRequestParams,
    options: ApiRequestOptions
  ): Promise<ResponseBody | null> => {
    const {method = DEFAULT_REQUEST_METHOD} = params
    const {fetchPolicy = this.defaultFetchPolicy} = options
    try {
      let headers = new Headers(this.defaultHeaders)

      if (params.headers) {
        headers = applyHeaders(headers, params.headers)
      }

      let body: BodyInit | undefined

      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        const paramBody = (params as {body: RequestBody}).body

        if (
          paramBody &&
          ![Blob, FormData, URLSearchParams, ReadableStream].some(
            (bodyType) => paramBody instanceof bodyType
          ) &&
          typeof paramBody !== 'string'
        ) {
          // prepare JSON body and add header
          body = JSON.stringify(this.serializeRequestJson(paramBody as object))
          headers.set('Content-Type', 'application/json')
        } else {
          body = paramBody as BodyInit
        }
      }

      const response = await this.requestFetcher.getResponse({
        method,
        url: `${this.baseUrl}${params.url}`,
        body,
        headers,
        responseType: params.responseType
      })

      const responseBody =
        response.responseType === 'json'
          ? this.parseResponseJson(response.responseBody as object)
          : response.responseBody

      if (fetchPolicy !== 'no-cache') {
        this.emitter.emit(RECEIVED_RESPONSE_BODY_EVENT, params, responseBody)
      }

      return responseBody
    } catch (error) {
      /* istanbul ignore next */
      if (error instanceof ApiError && error.responseType === 'json') {
        error.responseBody = this.parseResponseJson(error.responseBody)
      }

      this.emitter.emit(ERROR_EVENT, error)
      throw error
    }
  }
}

function defaultDeduplicate(params: ApiRequestParams) {
  return params.method === 'GET' ? true : false
}
