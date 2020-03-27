import {createStandardAction} from 'typesafe-actions'

import {ApiRequestFetchPolicy, ResponseBody} from '../../api/typings'
import {UseApiQueryState} from './typings'

export const useApiQueryActions = {
  /**
   * A new query request has begun
   */
  newRequest: createStandardAction('NEW_REQUEST')<{
    requestId: symbol
    paramsId: string | null
    fetchPolicy: ApiRequestFetchPolicy
    cachedData: ResponseBody | null
    dontReinitialize?: boolean
  }>(),

  /**
   * Used to sync post-`newRequest` state at the start of `useEffect`
   */
  replaceState: createStandardAction('REPLACE_STATE')<UseApiQueryState>(),

  /**
   * A refetchRequest has begun.
   */
  refetchRequest: createStandardAction('REFETCH_REQUEST')<{
    requestId: symbol
    paramsId: string
    reinitialize?: boolean
  }>(),

  /**
   * A request (or refetchRequest) has completed.
   */
  success: createStandardAction('SUCCESS')<{
    requestId: symbol
    paramsId: string
    data: ResponseBody
  }>(),

  /**
   * A request (or refetchRequest) has failed.
   */
  failure: createStandardAction('FAILURE')<{
    requestId: symbol
    paramsId: string
    error: Error
  }>(),

  /**
   * The `data` should be set manually.
   */
  setData: createStandardAction('SET_DATA')<
    ResponseBody | ((prev: ResponseBody) => ResponseBody)
  >()
}
