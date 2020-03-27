import {useContext, useEffect, useMemo, useReducer, useRef} from 'react'
import {ActionType} from 'typesafe-actions'

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
import {INITIAL_STATE, useApiQueryReducer} from './reducer'

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

  const [state, dispatch] = useReducer(useApiQueryReducer, INITIAL_STATE)

  const paramsId: string | null = params ? getParamsId(params) : null
  const requestId = Symbol()

  /**
   * True if `paramsId` just changed, but `useEffect` hasn't triggered yet
   */
  const paramsIdChanged = useValueChanged(paramsId)

  /**
   * If we're about to kick off a new request, and the `fetchPolicy` allows
   * reading from the cache, read the cached data.
   */
  const cachedData: TResponseBody | null =
    paramsIdChanged && params && READ_CACHE_POLICIES.includes(fetchPolicy)
      ? api.readCachedResponse(params)
      : null

  /**
   * Determines which action to dispatch if `paramsId` changes
   */
  const getParamsIdChangedAction = (): ActionType<typeof useApiQueryActions> => {
    if (!params) {
      return useApiQueryActions.reset()
    }

    if (fetchPolicy === 'cache-only' && cachedData) {
      return useApiQueryActions.setData(cachedData)
    }

    return useApiQueryActions.request({
      id: requestId,
      paramsId: paramsId as string,
      dontReinitialize: opts.dontReinitialize,
      initData: cachedData
    })
  }

  /**
   * If params id changes, but `useEffect` hasn't kicked off yet,
   * derive an intermediary state via the reducer
   */
  const derivedState = paramsIdChanged
    ? useApiQueryReducer(state, getParamsIdChangedAction())
    : state

  useEffect(() => {
    dispatch(getParamsIdChangedAction())

    if (!params) {
      return undefined
    }

    const unsubscribe = api.onCacheUpdate(params, (responseBody) => {
      dispatch(useApiQueryActions.setData(responseBody))
    })

    if (fetchPolicy === 'cache-only' && cachedData) {
      return unsubscribe
    }

    ;(async () => {
      try {
        const data = await api.request(params, {
          fetchPolicy,
          deduplicate: opts.deduplicate
        })
        dispatch(
          useApiQueryActions.success({
            id: requestId,
            paramsId: paramsId as string,
            data
          })
        )
      } catch (error) {
        dispatch(
          useApiQueryActions.failure({
            id: requestId,
            paramsId: paramsId as string,
            error
          })
        )
      }
    })()

    return unsubscribe
  }, [paramsId])

  /**
   * Keep referential equality and only change if underlying
   * `loading`, `data`, or `error` state changes
   */
  const returnData = useMemo((): UseApiQueryData<TResponseBody> => {
    return {
      loading: derivedState.loading,
      data: derivedState.data as TResponseBody | null | undefined,
      error: derivedState.error
    }
  }, [derivedState.loading, derivedState.data, derivedState.error])

  return [
    returnData,
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
 * Returns true if the value changed since last render (true on first pass)
 */
function useValueChanged<T extends any>(value: T | null): boolean {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current !== value
}
