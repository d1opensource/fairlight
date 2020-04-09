import {ApiRequestFetchPolicy, ResponseBody} from '../../api/typings'

export interface UseApiQueryState {
  requestId: symbol | null
  paramsId: string | null
  loading: boolean
  data: ResponseBody | undefined | null
  error: Error | null
}

export interface UseApiQueryData<TResponseBody extends ResponseBody> {
  data: TResponseBody | undefined | null
  loading: boolean
  error: Error | null
}

export type UseApiQuerySetData<TResponseBody extends ResponseBody> = (
  data: TResponseBody | ((prev: TResponseBody | null) => TResponseBody)
) => void

export type UseApiQueryRefetch = (opts?: {
  /**
   * Sets `data` to `null` when the request kicks off.
   */
  reinitialize?: boolean

  /**
   * Passed as an option to `api.request` and guarantees that a
   * new request will be made.
   *
   * By default, it will use `deduplicate` from the hook's options
   * (`true` for `GET` requests, `false` for non-`GET` requests).
   */
  deduplicate?: boolean
}) => void

export interface UseApiQueryActions<TResponseBody extends ResponseBody> {
  /**
   * Sets the response data of the Api request manually.
   *
   * If this request is already reading or writing to the cache,
   * it will update the underlying cache value.
   *
   * This is useful if you mutate the data via a separate API call, and then and want to manually
   * update the data in this call.
   */
  setData: UseApiQuerySetData<TResponseBody>

  /**
   * Performs a manual API fetch (over the network).
   *
   * Note: If fetch-policy is set to `no-cache`, it will not
   * persist to the cache.
   */
  refetch: UseApiQueryRefetch
}

export interface UseApiQueryOptions {
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

  /**
   * If true, will keep `data` from previous requests
   * until new data is received.
   */
  dontReinitialize?: boolean

  /**
   * If `true`, will `throw` in the case of an error, which can then
   * be handled in an error boundary.
   *
   * Defaults to `false`, unless overridden via `ApiProvider#defaults`
   */
  useErrorBoundary?: boolean
}

export type FalsyValue = '' | 0 | false | undefined | null
