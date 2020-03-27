import {ActionType, getType, Reducer} from 'typesafe-actions'

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

export const useApiQueryReducer: Reducer<
  UseApiQueryState,
  ActionType<typeof useApiQueryActions>
> = (prev = INITIAL_STATE, action) => {
  switch (action.type) {
    case getType(useApiQueryActions.newRequest):
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
          action.payload.cachedData ||
          (action.payload.dontReinitialize ? prev.data : null)
      }
    case getType(useApiQueryActions.success):
      if (isLiveRequest(prev, action)) {
        return {
          ...prev,
          loading: false,
          data: action.payload.data,
          error: null
        }
      }

      return prev
    case getType(useApiQueryActions.failure):
      if (isLiveRequest(prev, action)) {
        return {
          ...prev,
          loading: false,
          data: null,
          error: action.payload.error
        }
      }

      return prev
    case getType(useApiQueryActions.replaceState):
      return action.payload
    case getType(useApiQueryActions.refetchRequest):
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
    case getType(useApiQueryActions.setData):
      return {
        ...prev,
        data:
          typeof action.payload === 'function'
            ? action.payload(prev.data as ResponseBody)
            : action.payload
      }
    default:
      return prev
  }
}

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
