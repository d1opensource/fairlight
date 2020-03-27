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

interface ApiCommonRequestParams<TMethod extends ApiRequestMethod> {
  url: string
  method?: TMethod
  headers?: ApiHeaders
  responseType?: ApiResponseType
  successCodes?: number[]
  extraKey?: string
}

export interface ApiGetDeleteRequestParams<
  TMethod extends GetDeleteRequestMethod,
  TResponseBody extends ResponseBody = never
> extends ApiCommonRequestParams<TMethod> {}

export interface ApiMutationRequestParams<
  TMethod extends PostPutPatchRequestMethod,
  TResponseBody extends ResponseBody = never
> extends ApiCommonRequestParams<TMethod> {
  body?: RequestBody
}

export type ApiRequestParams<
  TMethod extends ApiRequestMethod = ApiRequestMethod,
  TResponseBody extends ResponseBody = ResponseBody
> = TMethod extends GetDeleteRequestMethod
  ? ApiGetDeleteRequestParams<TMethod, TResponseBody>
  : TMethod extends PostPutPatchRequestMethod
  ? ApiMutationRequestParams<TMethod, TResponseBody>
  : never

export type ApiSerializeRequestJson = (
  body: object,
  requestParams: ApiRequestParams
) => object

export type ApiParseResponseJson = (
  body: object,
  requestParams: ApiRequestParams
) => object

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

export interface ApiRequestOptions {
  /**
   * Specifies how the request interacts with the cache
   */
  fetchPolicy?: ApiRequestFetchPolicy

  /**
   * When `true`, will ensure that it reuses any duplicate
   * requests that are currently occurring to cut down on requests.
   *
   * This is `true` by default for `GET` requests, and `false` for
   * non-`GET` requests, but you can override here on a per-request basis.
   */
  deduplicate?: boolean
}

export interface RequestFetcherParams {
  url: string
  method: ApiRequestMethod
  body?: BodyInit
  headers?: Headers
  responseType?: ApiResponseType
  successCodes?: number[]
}

export interface RequestFetcher {
  getResponse(params: RequestFetcherParams): Promise<RequestFetcherResponse>
}

export interface RequestFetcherResponse {
  body: ResponseBody | null
  bodyType: ApiResponseType | null
  status: number
}
