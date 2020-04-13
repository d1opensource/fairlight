import {createAction} from 'typesafe-actions'

import {ApiRequestFetchPolicy, ResponseBody} from '../../api/typings'
import {UseApiQueryState} from './typings'

export const useApiQueryActions = {
  /**
   * A new query request has begun
   */
  newRequest: createAction('NEW_REQUEST')<{
    requestId: symbol
    paramsId: string | null
    fetchPolicy: ApiRequestFetchPolicy
    cachedData: ResponseBody | null
    dontReinitialize?: boolean
    initialData?: ResponseBody
  }>(),

  /**
   * Used to sync post-`newRequest` state at the start of `useEffect`
   */
  replaceState: createAction('REPLACE_STATE')<UseApiQueryState>(),

  /**
   * A refetchRequest has begun.
   */
  refetchRequest: createAction('REFETCH_REQUEST')<{
    requestId: symbol
    paramsId: string
    reinitialize?: boolean
  }>(),

  /**
   * A request (or refetchRequest) has completed.
   */
  success: createAction('SUCCESS')<{
    requestId: symbol
    paramsId: string
    data: ResponseBody
  }>(),

  /**
   * A request (or refetchRequest) has failed.
   */
  failure: createAction('FAILURE')<{
    requestId: symbol
    paramsId: string
    error: Error
  }>(),

  /**
   * The `data` should be set manually.
   */
  setData: createAction('SET_DATA')<
    ResponseBody | ((prev: ResponseBody) => ResponseBody)
  >()
}
