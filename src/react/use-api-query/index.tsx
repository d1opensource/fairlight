import {useContext, useEffect, useMemo, useReducer, useRef} from 'react'

import {READ_CACHE_POLICIES} from '../../api/constants'
import {getParamsId} from '../../api/lib'
import {
  ApiRequestFetchPolicy,
  ApiRequestMethod,
  ApiRequestParams,
  ResponseBody
} from '../../api/typings'
import {ApiContext} from '../context'
import {useApiQueryActions} from './actions'
import {useApiQueryReducer} from './reducer'

type FalsyValue = '' | 0 | false | undefined | null

interface UseApiQueryData<TResponseBody extends ResponseBody> {
  data: TResponseBody | undefined | null
  loading: boolean
  error: Error | null
}

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
  setData: (
    data: TResponseBody | ((prev: TResponseBody | null) => TResponseBody)
  ) => void
  /**
   * Performs a manual API fetch (over the network).
   *
   * Note: If fetch-policy is set to `no-cache`, it will not
   * persist to the cache.
   */
  refetch: (opts?: {
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
}

/**
 * API hook to run an api `GET` request, returning a `Loadable`
 * instance of the response data
 */
export function useApiQuery<TResponseBody extends ResponseBody>(
  params: ApiRequestParams<ApiRequestMethod, TResponseBody> | FalsyValue,
  opts: {
    fetchPolicy?: ApiRequestFetchPolicy
    deduplicate?: boolean

    /**
     * If true, will keep `data` from previous requests
     * until new data is received.
     */
    dontReinitialize?: boolean
  } = {}
): [UseApiQueryData<TResponseBody>, UseApiQueryActions<TResponseBody>] {
  const {
    api,
    defaultFetchPolicies: {useApiQuery: defaultFetchPolicy}
  } = useContext(ApiContext)
  const fetchPolicy = opts.fetchPolicy || defaultFetchPolicy
  const paramsId = params && getParamsId(params)
  const [state, dispatch] = useReducer(useApiQueryReducer, null, () => ({
    id: null,
    paramsId: null,
    loading: !!params,
    data:
      // if this api request will read from the cache,
      // initialize data to the value in the cache
      params && READ_CACHE_POLICIES.includes(fetchPolicy)
        ? api.readCachedResponse(params) || null
        : null,
    error: null
  }))

  useEffect(() => {
    if (!params) {
      dispatch(useApiQueryActions.reset())
      return undefined
    }

    const unsubscribe = api.onCacheUpdate(params, (responseBody) => {
      dispatch(useApiQueryActions.setData(responseBody))
    })

    const cachedData = READ_CACHE_POLICIES.includes(fetchPolicy)
      ? api.readCachedResponse(params)
      : null

    if (fetchPolicy === 'cache-only' && cachedData) {
      // don't bother kicking off a request
      // since we already have the cached data
      useApiQueryActions.setData(cachedData)
      return undefined
    }

    const id = Symbol()

    dispatch(
      useApiQueryActions.request({
        id,
        paramsId: paramsId as string,
        dontReinitialize: opts.dontReinitialize,
        initData: cachedData || null
      })
    )
    ;(async () => {
      try {
        const data = await api.request(params, {
          fetchPolicy,
          deduplicate: opts.deduplicate
        })
        dispatch(
          useApiQueryActions.success({
            id,
            paramsId: paramsId as string,
            data
          })
        )
      } catch (error) {
        dispatch(
          useApiQueryActions.failure({
            id,
            paramsId: paramsId as string,
            error
          })
        )
      }
    })()

    return () => {
      unsubscribe()
    }
  }, [paramsId])

  // return loading flag if `useEffect` hasn't kicked in yet
  // but the a new request is about to kick off
  const prevParamsId = usePrevious(paramsId)
  const aboutToStartNewRequest = paramsId && paramsId !== prevParamsId

  const returnedState = useMemo(
    () => ({
      loading: aboutToStartNewRequest || state.loading,
      data: state.data as TResponseBody | null | undefined,
      error: state.error
    }),
    [aboutToStartNewRequest, state.data, state.loading, state.error]
  )

  return [
    returnedState,
    {
      setData: (data) => {
        if (fetchPolicy === 'no-cache' || !params) {
          dispatch(useApiQueryActions.setData(data))
        } else {
          // write to the cache, which will in turn
          // notify the subscription and update `state.data`

          if (typeof data === 'function') {
            // function setter
            const prev = api.readCachedResponse(params)
            api.writeCachedResponse(
              params,
              (data as (prev: TResponseBody | null) => TResponseBody)(prev)
            )
          } else {
            api.writeCachedResponse(params, data)
          }
        }
      },

      refetch: async (refetchOpts = {}) => {
        if (!paramsId || !params) {
          return
        }

        const id = Symbol()

        dispatch(
          useApiQueryActions.refetchRequest({
            id,
            paramsId,
            reinitialize: refetchOpts.reinitialize
          })
        )
        try {
          const data = await api.request(params, {
            fetchPolicy:
              fetchPolicy === 'no-cache' ? 'no-cache' : 'fetch-first',
            deduplicate: refetchOpts.deduplicate ?? opts.deduplicate
          })
          dispatch(useApiQueryActions.success({id, paramsId, data}))
        } catch (error) {
          dispatch(useApiQueryActions.failure({id, paramsId, error}))
        }
      }
    }
  ]
}

/**
 * Returns previous value, or null if first render pass
 * @param value updating value
 */
function usePrevious<T extends any>(value: T | null): T | null {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
