import EventEmitter from 'eventemitter3'

import {DEFAULT_FETCH_POLICY} from '../constants'
import {ApiError} from '../errors'
import {GenericCache} from '../generic-cache'
import {applyHeaders, createSubscription, getParamsId} from '../lib'
import {ApiRequestFetcher, IRequestFetcher} from '../request-fetcher'
import {
  ApiRequestMethod,
  IApiParseResponseJson,
  IApiRequestOptions,
  IApiRequestParams,
  IApiSerializeRequestJson,
  RequestBody,
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

  private emitter = new EventEmitter()

  private requestFetcher: IRequestFetcher

  private serializeRequestJson: IApiSerializeRequestJson

  private parseResponseJson: IApiParseResponseJson

  private defaultHeaders = new Headers()

  private inProgressRequestCache = new GenericCache<{
    id: symbol
    fetchPromise: Promise<ResponseBody>
  }>()

  constructor(params: {
    /**
     * Base URL of API to prefix all requests with
     */
    baseUrl?: string
    /**
     * When provided, all API JSON request bodies will be run
     * through this transformation function before the API request
     */
    serializeRequestJson?: IApiSerializeRequestJson
    /**
     * When provided, all API JSON response bodies will be run
     * through this transformation function before returning the response
     */
    parseResponseJson?: IApiParseResponseJson
  }) {
    this.baseUrl = params.baseUrl || ''
    this.requestFetcher = new ApiRequestFetcher()
    this.serializeRequestJson = params.serializeRequestJson || identity
    this.parseResponseJson = params.parseResponseJson || identity
  }

  /**
   * Returns a promise that resolves with the response body.
   *
   * If there is an in-progress request, and `options.forceNewFetch` is `false`,
   * it will return the same promise.
   *
   * On a successful fetch, it will cache the response unless `fetchPolicy` is `'no-cache'`
   */
  getResponseBody = <TResponseBody extends ResponseBody>(
    params: IApiRequestParams<ApiRequestMethod, TResponseBody>,
    options: IApiRequestOptions
  ): Promise<TResponseBody> => {
    if (params.method !== 'GET') {
      // only cache in-progress requests for GET requests
      return this.fetchResponseBody(params, options) as Promise<TResponseBody>
    }

    const paramsKey = getParamsId(params)

    // return cached promise if it exists
    const cachedRequest = this.inProgressRequestCache.get(paramsKey)
    if (cachedRequest && !options.forceNewFetch) {
      // if user hasn't explicitly requested a new fetch,
      // return the in-progress fetch promise
      return cachedRequest.fetchPromise as Promise<TResponseBody>
    }

    const id = Symbol()
    const fetchPromise = this.createGetPromise(params, options, id)

    this.inProgressRequestCache.set(paramsKey, {id, fetchPromise})

    return fetchPromise as Promise<TResponseBody>
  }

  private async createGetPromise(
    params: IApiRequestParams,
    options: IApiRequestOptions,
    id: symbol
  ): Promise<ResponseBody> {
    const paramsId = getParamsId(params)

    try {
      return await this.fetchResponseBody(params, options)
    } finally {
      const cachedRequest = this.inProgressRequestCache.get(paramsId)

      if (cachedRequest?.id === id) {
        this.inProgressRequestCache.del(paramsId)
      }
    }
  }

  /**
   * Configuring an error handler to be called on error
   */
  onReceivedResponseBody = (
    listener: (params: IApiRequestParams, responseBody: ResponseBody) => void
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
  requestInProgress = (params: IApiRequestParams): boolean => {
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
    params: IApiRequestParams,
    options: IApiRequestOptions
  ): Promise<ResponseBody> => {
    const {fetchPolicy = DEFAULT_FETCH_POLICY} = options
    try {
      let headers = new Headers(this.defaultHeaders)

      if (params.headers) {
        headers = applyHeaders(headers, params.headers)
      }

      let body: BodyInit

      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(params.method)) {
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
        method: params.method,
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
      if (error instanceof ApiError && error.responseType === 'json') {
        error.responseBody = this.parseResponseJson(error.responseBody)
      }

      this.emitter.emit(ERROR_EVENT, error)
      throw error
    }
  }
}
