import EventEmitter from 'eventemitter3'

import {DEFAULT_FETCH_POLICY, READ_CACHE_POLICIES} from './constants'
import {ApiCacheMissError} from './errors'
import {GenericCache} from './generic-cache'
import {createSubscription, genCacheUpdateEvent, getParamsId} from './lib'
import {ApiRequestManager} from './request-manager'
import {
  ApiRequestMethod,
  IApiParseResponseJson,
  IApiRequestOptions,
  IApiRequestParams,
  IApiSerializeRequestJson,
  ResponseBody
} from './typings'

const ERROR_EVENT = 'error'

export class Api {
  defaultFetchPolicy = DEFAULT_FETCH_POLICY

  private responseBodyCache = new GenericCache<ResponseBody>()

  private requestManager: ApiRequestManager

  private emitter = new EventEmitter()

  constructor(
    params: {
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
    } = {}
  ) {
    this.requestManager = new ApiRequestManager(params)
    this.requestManager.onReceivedResponseBody(this.writeCachedResponse)
    this.requestManager.onError((error) =>
      this.emitter.emit(ERROR_EVENT, error)
    )
  }

  /**
   * Makes an API request
   */
  request = <TResponseBody extends ResponseBody>(
    params: IApiRequestParams<ApiRequestMethod, TResponseBody>,
    options: IApiRequestOptions = {}
  ): Promise<TResponseBody> => {
    const {fetchPolicy = DEFAULT_FETCH_POLICY} = options

    if (params.method !== 'GET' || !READ_CACHE_POLICIES.includes(fetchPolicy)) {
      return this.requestManager.getResponseBody<TResponseBody>(
        params,
        options
      ) as Promise<TResponseBody>
    }

    const cachedResponse = this.responseBodyCache.get(getParamsId(params))
    if (cachedResponse) {
      if (fetchPolicy === 'cache-and-fetch') {
        // kick off in the background
        // once it succeeds, the cache will be updated
        // and subscribers will be notified
        this.requestManager.getResponseBody(params, options).catch(() => {
          // ignore - can be handled via `Api#onError`
        })
      }

      return Promise.resolve(cachedResponse as TResponseBody)
    }

    if (fetchPolicy === 'cache-only') {
      return Promise.reject(new ApiCacheMissError(`Cache miss: ${params.url}`))
    }

    return this.requestManager.getResponseBody<TResponseBody>(
      params,
      options
    ) as Promise<TResponseBody>
  }

  /**
   * Returns `true` if a `GET` of `DELETE` request matches params
   */
  requestInProgress = (params: IApiRequestParams): boolean => {
    return this.requestManager.requestInProgress(params)
  }

  /**
   * Saves a response directly to the cache
   */
  writeCachedResponse = <TResponseBody extends ResponseBody>(
    params: IApiRequestParams<ApiRequestMethod, TResponseBody>,
    responseBody: TResponseBody
  ) => {
    this.responseBodyCache.set(getParamsId(params), responseBody)
    this.emitter.emit(genCacheUpdateEvent(params), responseBody)
  }

  /**
   * Reads a response directly from the cache
   *
   * The main reason you would use this over `Api#request` with a cached
   * fetch policy is that this runs synchronously.
   *
   * Note that if there is a cache miss, it will return `undefined`
   */
  readCachedResponse = <TResponseBody extends ResponseBody>(
    params: IApiRequestParams<ApiRequestMethod, TResponseBody>
  ): TResponseBody => {
    return this.responseBodyCache.get(getParamsId(params)) as TResponseBody
  }

  /**
   * Subscribes to cache updates for a given param's response
   */
  onCacheUpdate = <TResponseBody extends ResponseBody>(
    params: IApiRequestParams<ApiRequestMethod, TResponseBody>,
    listener: (responseBody: TResponseBody) => void
  ): (() => void) => {
    const event = genCacheUpdateEvent(params)
    return createSubscription(this.emitter, event, listener)
  }

  /**
   * Returns the base url concatenated with the provided path
   */
  buildUrl = (path: string): string => {
    return `${this.requestManager.baseUrl}${path}`
  }

  /**
   * Set default headers to be passed to all API requests.
   * Useful for setting an authentication token.
   *
   * @param key Header key
   * @param value Header value
   */
  setDefaultHeader = (key: string, value: string): void => {
    this.requestManager.setDefaultHeader(key, value)
  }

  /**
   * Configuring an error handler to be called on error
   */
  onError = (listener: (error: Error) => void) => {
    return createSubscription(this.emitter, ERROR_EVENT, listener)
  }
}
