export type ApiRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiHeaders = Record<string, string>
type GetDeleteRequestMethod = Extract<ApiRequestMethod, 'GET' | 'DELETE'>
type PostPutPatchRequestMethod = Extract<
  ApiRequestMethod,
  'POST' | 'PUT' | 'PATCH'
>
export type RequestBody = BodyInit | object
export type ResponseBody = Blob | object | string
export type ApiResponseType = 'json' | 'text' | 'blob'

interface IApiCommonRequestParams<TMethod extends ApiRequestMethod> {
  url: string
  method: TMethod
  headers?: ApiHeaders
  responseType?: ApiResponseType
}

export interface IApiGetDeleteRequestParams<
  TMethod extends GetDeleteRequestMethod,
  TResponseBody extends ResponseBody = never
> extends IApiCommonRequestParams<TMethod> {}

export interface IApiMutationRequestParams<
  TMethod extends PostPutPatchRequestMethod,
  TResponseBody extends ResponseBody = never
> extends IApiCommonRequestParams<TMethod> {
  body?: RequestBody
}

export type IApiRequestParams<
  TMethod extends ApiRequestMethod = ApiRequestMethod,
  TResponseBody extends ResponseBody = ResponseBody
> = TMethod extends GetDeleteRequestMethod
  ? IApiGetDeleteRequestParams<TMethod, TResponseBody>
  : TMethod extends PostPutPatchRequestMethod
  ? IApiMutationRequestParams<TMethod, TResponseBody>
  : never

export type IApiSerializeRequestJson = (body: object) => object

export type IApiParseResponseJson = (body: object) => object

export type ApiRequestFetchPolicy =
  /**
   * Only fetch from the server, never reading from or writing to the cache.
   * This is the default fetch policy.
   */
  | 'no-cache'
  /**
   * The request will first attempt read from the cache.
   * If the data exists, return the data and do not fetch.
   * If the data doesn't exist, make a fetch and then update the cache.
   */
  | 'cache-first'
  /**
   * The request will fetch from the server, and then write the response to the cache.
   */
  | 'fetch-first'
  /**
   * The request will _only_ read from the cache and never fetch from the server.
   * If the data does not exist, it will throw an `ApiCacheMissError`.
   */
  | 'cache-only'
  /**
   * The request will simultaneously read from the cache and fetch from the server.
   * If the data is not in the cache, the promise will resolve with the result of the fetch.
   * If the data is in the cache, the promise will resolve with the cached results. Once the fetch resolves, it will update the cache and emit an event to notify listeners of the update.
   */
  | 'cache-and-fetch'

export interface IApiRequestOptions {
  /**
   * Specifies how the request interacts with the cache
   */
  fetchPolicy?: ApiRequestFetchPolicy

  /**
   * Normally, identical concurrent `GET` requests will
   * not retrigger a refetch, and will return the same promise.
   *
   * When `forceNewFetch` is set to `true`, it will trigger
   * a new request even if one is already occurring.
   */
  forceNewFetch?: boolean
}
