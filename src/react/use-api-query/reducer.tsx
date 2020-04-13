import {ActionType, createReducer, getType} from 'typesafe-actions'

import {ResponseBody} from '../../api/typings'
import {useApiQueryActions} from './actions'
import {UseApiQueryState} from './typings'

export const INITIAL_STATE: UseApiQueryState = {
  requestId: null,
  paramsId: null,
  loading: false,
  data: null,
  error: null
}

export const useApiQueryReducer = createReducer<
  UseApiQueryState,
  ActionType<typeof useApiQueryActions>
>(INITIAL_STATE, {
  [getType(useApiQueryActions.newRequest)]: (
    prev: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['newRequest']>
  ) => {
    if (!action.payload.paramsId) {
      return INITIAL_STATE
    }

    if (
      action.payload.fetchPolicy === 'cache-only' &&
      action.payload.cachedData
    ) {
      return {
        ...INITIAL_STATE,
        data: action.payload.cachedData
      }
    }

    return {
      requestId: action.payload.requestId,
      paramsId: action.payload.paramsId,
      loading: true,
      error: null,
      data:
        action.payload.initialData ??
        action.payload.cachedData ??
        (action.payload.dontReinitialize ? prev.data : null)
    }
  },

  [getType(useApiQueryActions.success)]: (
    prev: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['success']>
  ) => {
    if (isLiveRequest(prev, action)) {
      return {
        ...prev,
        loading: false,
        data: action.payload.data,
        error: null
      }
    }

    return prev
  },

  [getType(useApiQueryActions.failure)]: (
    prev: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['failure']>
  ) => {
    if (isLiveRequest(prev, action)) {
      return {
        ...prev,
        loading: false,
        data: null,
        error: action.payload.error
      }
    }

    return prev
  },

  [getType(useApiQueryActions.replaceState)]: (
    _: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['replaceState']>
  ) => action.payload,
  [getType(useApiQueryActions.refetchRequest)]: (
    prev: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['refetchRequest']>
  ) => {
    // ensure that the refetch has the correct request params
    if (action.payload.paramsId === prev.paramsId) {
      return {
        ...prev,
        requestId: action.payload.requestId,
        paramsId: action.payload.paramsId,
        loading: true,
        data: action.payload.reinitialize ? null : prev.data
      }
    }

    return prev
  },

  [getType(useApiQueryActions.setData)]: (
    prev: UseApiQueryState,
    action: ActionType<typeof useApiQueryActions['setData']>
  ) => {
    return {
      ...prev,
      data:
        typeof action.payload === 'function'
          ? action.payload(prev.data as ResponseBody)
          : action.payload
    }
  }
})

/**
 * Ensures that the completed request was the last one that was called
 */
function isLiveRequest(
  prev: UseApiQueryState,
  action: {payload: {requestId: symbol; paramsId: string}}
) {
  return (
    action.payload.requestId === prev.requestId &&
    action.payload.paramsId === prev.paramsId
  )
}
