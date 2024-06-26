import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef
} from 'react'

import {apiRequestId} from '../../api'
import {READ_CACHE_POLICIES} from '../../api/constants'
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

export * from './typings'

/**
 * API hook to run an api `GET` request, returning a `Loadable`
 * instance of the response data
 */
export function useApiQuery<TResponseBody extends ResponseBody>(
  params: ApiRequestParams<ApiRequestMethod, TResponseBody> | FalsyValue,
  opts: UseApiQueryOptions<TResponseBody> = {}
): [UseApiQueryData<TResponseBody>, UseApiQueryActions<TResponseBody>] {
  const {
    api,
    defaults: {
      useApiQuery: {
        fetchPolicy: defaultFetchPolicy,
        useErrorBoundary: defaultUseErrorBoundary
      }
    }
  } = useContext(ApiContext)

  const fetchPolicy = opts.fetchPolicy ?? defaultFetchPolicy
  const useErrorBoundary = opts.useErrorBoundary ?? defaultUseErrorBoundary

  const [state, dispatch] = useReducer(useApiQueryReducer, INITIAL_STATE)

  const paramsId: string | null = params ? apiRequestId(params) : null

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
          initialData: opts.initialData,
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
  useLayoutEffect(() => {
    dispatch(useApiQueryActions.replaceState(derivedState))

    if (!params) {
      return undefined
    }

    const subscription = api.onCacheUpdate(params).subscribe((responseBody) => {
      dispatch(useApiQueryActions.setData(responseBody))
    })

    const cleanup = () => subscription.unsubscribe()

    if (fetchPolicy === 'cache-only' && cachedData) {
      // no need to make a request
      return cleanup
    }

    ;(async function requestQueryData() {
      try {
        const data = await api.request(params, {
          fetchPolicy,
          deduplicate: opts.deduplicate
        })
        dispatch(
          useApiQueryActions.success({
            requestId,
            paramsId: paramsId as string,
            data
          })
        )
      } catch (error) {
        dispatch(
          useApiQueryActions.failure({
            requestId,
            paramsId: paramsId as string,
            error: error as Error
          })
        )
      }
    })()

    return cleanup
  }, [paramsId])

  /**
   * Keep referential equality and only change if underlying
   * `loading`, `data`, or `error` state changes
   */
  const returnData = useMemo(
    (): UseApiQueryData<TResponseBody> => ({
      loading: derivedState.loading,
      data: derivedState.data as TResponseBody | null | undefined,
      error: derivedState.error
    }),
    [derivedState.loading, derivedState.data, derivedState.error]
  )

  /**
   * Optionally throw the error to handle in error boundary
   */
  if (returnData.error && useErrorBoundary) {
    throw returnData.error
  }

  const handleSetData: UseApiQuerySetData<TResponseBody> = (data) => {
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

  const handleRefetch: UseApiQueryRefetch = async (refetchOpts = {}) => {
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
        deduplicate: refetchOpts.deduplicate ?? false
      })
      dispatch(useApiQueryActions.success({requestId, paramsId, data}))
    } catch (error) {
      dispatch(
        useApiQueryActions.failure({requestId, paramsId, error: error as Error})
      )
    }
  }

  return [returnData, {setData: handleSetData, refetch: handleRefetch}]
}

/**
 * Returns true if the value changed since last render (true on first pass)
 */
function useValueChanged<T>(value: T | null): boolean {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current !== value
}
