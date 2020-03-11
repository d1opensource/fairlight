import {ActionType, getType, Reducer} from 'typesafe-actions'

import {useApiQueryActions} from './actions'
import {UseApiQueryState} from './typings'

const INITIAL_STATE = {
  id: null,
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
    case getType(useApiQueryActions.reset):
      return INITIAL_STATE
    case getType(useApiQueryActions.request):
      return {
        ...prev,
        id: action.payload.id,
        paramsId: action.payload.paramsId,
        loading: true,
        data:
          action.payload.initData ||
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
    case getType(useApiQueryActions.refetchRequest):
      // ensure that the refetch has the correct request params
      if (action.payload.paramsId === prev.paramsId) {
        return {
          ...prev,
          id: action.payload.id,
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
            ? action.payload(prev.data)
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
  action: {payload: {id: symbol; paramsId: string}}
) {
  return (
    action.payload.id === prev.id && action.payload.paramsId === prev.paramsId
  )
}
