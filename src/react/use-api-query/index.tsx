import {useContext, useEffect, useMemo, useReducer, useRef} from 'react'

import {READ_CACHE_POLICIES} from '../../api/constants'
import {getParamsId} from '../../api/lib'
import {
  ApiRequestMethod,
  ApiRequestParams,
  ResponseBody
} from '../../api/typings'
import {ApiContext} from '../context'
import {useApiQueryActions} from './actions'
import {INITIAL_STATE, useApiQueryReducer} from './reducer'
import {
  FalsyValue,
  UseApiQueryActions,
  UseApiQueryData,
  UseApiQueryOptions,
  UseApiQueryRefetch,
  UseApiQuerySetData
} from './typings'

/**
 * API hook to run an api `GET` request, returning a `Loadable`
 * instance of the response data
 */
export function useApiQuery<TResponseBody extends ResponseBody>(
  params: ApiRequestParams<ApiRequestMethod, TResponseBody> | FalsyValue,
  opts: UseApiQueryOptions = {}
): [UseApiQueryData<TResponseBody>, UseApiQueryActions<TResponseBody>] {
  const {
    api,
    defaultFetchPolicies: {useApiQuery: defaultFetchPolicy}
  } = useContext(ApiContext)

  const fetchPolicy = opts.fetchPolicy || defaultFetchPolicy

  const [state, dispatch] = useReducer(useApiQueryReducer, INITIAL_STATE)

  const paramsId: string | null = params ? getParamsId(params) : null

  /**
   * Used to identify the current request for concurrency management
   */
  const requestId = Symbol()

  /**
   * True if `paramsId` just changed, but `useEffect` hasn't triggered yet.
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
   * If params id changes, but `useEffect` hasn't kicked off yet,
   * derive an intermediary state via the reducer.
   */
  const derivedState = paramsIdChanged
    ? useApiQueryReducer(
        state,
        useApiQueryActions.newRequest({
          requestId,
          paramsId,
          fetchPolicy,
          cachedData,
          dontReinitialize: opts.dontReinitialize
        })
      )
    : state

  /**
   * When `paramsId` changes
   * - Update reducer state with the derived state for the new request
   * - Sunscribe to cache updates
   * - Make the request
   */
  useEffect(() => {
    dispatch(useApiQueryActions.replaceState(derivedState))

    if (!params) {
      return undefined
    }

    const unsubscribe = api.onCacheUpdate(params, (responseBody) => {
      dispatch(useApiQueryActions.setData(responseBody))
    })

    if (fetchPolicy === 'cache-only' && cachedData) {
      // no need to make a request
      return unsubscribe
    }

    ;(async function requestQueryData() {
      try {
        const data = await api.request(params, {
          fetchPolicy,
          deduplicate: opts.deduplicate
        })
        dispatch(
          useApiQueryActions.success({
            requestId: requestId,
            paramsId: paramsId as string,
            data
          })
        )
      } catch (error) {
        dispatch(
          useApiQueryActions.failure({
            requestId: requestId,
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

  const handleSetData: UseApiQuerySetData<TResponseBody> = function handleSetData(
    data
  ) {
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
  }

  const handleRefetch: UseApiQueryRefetch = async function handleRefetch(
    refetchOpts = {}
  ) {
    if (!paramsId || !params) {
      return
    }

    const requestId = Symbol()

    dispatch(
      useApiQueryActions.refetchRequest({
        requestId,
        paramsId,
        reinitialize: refetchOpts.reinitialize
      })
    )
    try {
      const data = await api.request(params, {
        fetchPolicy: fetchPolicy === 'no-cache' ? 'no-cache' : 'fetch-first',
        deduplicate: refetchOpts.deduplicate ?? opts.deduplicate
      })
      dispatch(useApiQueryActions.success({requestId, paramsId, data}))
    } catch (error) {
      dispatch(useApiQueryActions.failure({requestId, paramsId, error}))
    }
  }

  return [returnData, {setData: handleSetData, refetch: handleRefetch}]
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
