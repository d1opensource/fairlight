import Observable from 'zen-observable'
import PushStream from 'zen-push'

import {DEFAULT_FETCH_POLICY, READ_CACHE_POLICIES} from './constants'
import {ApiCacheMissError} from './errors'
import {GenericCache} from './generic-cache'
import {apiRequestId, parseApiRequestIdUrl} from './lib'
import {ApiRequestManager} from './request-manager'
import {
  ApiParseResponseJson,
  ApiRequestMethod,
  ApiRequestOptions,
  ApiRequestParams,
  ApiSerializeRequestJson,
  ResponseBody
} from './typings'

export {apiRequestId}

export class Api {
  private responseBodyCache = new GenericCache<ResponseBody>()

  private requestManager: ApiRequestManager

  private cacheUpdateStreams = new Map<string, PushStream<ResponseBody>>()

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
      serializeRequestJson?: ApiSerializeRequestJson
      /**
       * When provided, all API JSON response bodies will be run
       * through this transformation function before returning the response
       */
      parseResponseJson?: ApiParseResponseJson
    } = {}
  ) {
    this.requestManager = new ApiRequestManager(params)
    this.requestManager.onReceivedResponseBody.subscribe(
      ([params, responseBody]) => {
        this.writeCachedResponse(params, responseBody)
      }
    )
  }

  /**
   * Returns the `baseUrl` which was set via the constructor.
   */
  get baseUrl() {
    return this.requestManager.baseUrl
  }

  /**
   * Makes an API request
   */
  request = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>,
    options: ApiRequestOptions = {}
  ): Promise<TResponseBody> => {
    const {fetchPolicy = DEFAULT_FETCH_POLICY, maxAge} = options

    if (!READ_CACHE_POLICIES.includes(fetchPolicy)) {
      return this.requestManager.getResponseBody<TResponseBody>(
        params,
        options
      ) as Promise<TResponseBody>
    }

    const cachedResponse = this.responseBodyCache.get(apiRequestId(params), maxAge)
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
  requestInProgress = (params: ApiRequestParams): boolean => {
    return this.requestManager.requestInProgress(params)
  }

  /**
   * Saves a response directly to the cache
   */
  writeCachedResponse = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>,
    responseBody: TResponseBody
  ) => {
    const paramsId = apiRequestId(params)
    this.responseBodyCache.set(paramsId, responseBody)
    this.getCacheUpdateStream(params).next(responseBody)
  }

  /**
   * Reads a response directly from the cache
   *
   * The main reason you would use this over `Api#request` with a cached
   * fetch policy is that this runs synchronously.
   *
   * Note that if there is a cache miss, it will return `null`
   */
  readCachedResponse = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>
  ): TResponseBody | null => {
    return this.responseBodyCache.get(
      apiRequestId(params)
    ) as TResponseBody | null
  }

  /**
   * Removes all cached responses whose request `url` matches the given
   * prefix. Use this when the exact request params cannot be reconstructed
   * at the call site — for example, cache keys that include a serialized
   * request body via `extraKey`.
   *
   * This is lazy invalidation: it does not notify `onCacheUpdate`
   * subscribers, so components already mounted via `useApiQuery` keep
   * showing their current data until they refetch. The next `useApiQuery`
   * mount or `Api#request` call for any matching request will fetch fresh
   * data from the network.
   *
   * Matching stops at path/query boundaries: a prefix of `/users` matches
   * `/users`, `/users/1`, and `/users?page=2`, but not `/users-archive`.
   */
  deleteCachedResponsesByUrl = (urlPrefix: string): void => {
    for (const key of this.responseBodyCache.keys()) {
      const url = parseApiRequestIdUrl(key)

      if (!url.startsWith(urlPrefix)) {
        continue
      }

      const charAfterPrefix = url.charAt(urlPrefix.length)

      if (
        charAfterPrefix === '' ||
        charAfterPrefix === '/' ||
        charAfterPrefix === '?'
      ) {
        this.responseBodyCache.del(key)
      }
    }
  }

  /**
   * Clears the entire cache
   */
  clearCache = () => {
    this.responseBodyCache = new GenericCache<ResponseBody>()
  }

  /**
   * Subscribes to cache updates for a given param's response
   */
  onCacheUpdate = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>
  ): Observable<TResponseBody> => {
    return this.getCacheUpdateStream(params).observable
  }

  /**
   * Returns the cache update stream for the given request params.
   * If one does not already exist, create it.
   */
  private getCacheUpdateStream<TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>
  ): PushStream<TResponseBody> {
    const paramsId = apiRequestId(params)

    let pushStream = this.cacheUpdateStreams.get(paramsId)

    if (!pushStream) {
      pushStream = new PushStream<TResponseBody>()
      this.cacheUpdateStreams.set(paramsId, pushStream)
    }

    return pushStream as PushStream<TResponseBody>
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
  get onError() {
    return this.requestManager.onError
  }
}
