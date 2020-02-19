import {createStandardAction} from 'typesafe-actions'

export const useApiQueryActions = {
  /**
   * Resets to the default state.
   *
   * This is useful if no request params are passed to the hook.
   */
  reset: createStandardAction('RESET')(),

  /**
   * A request has begun.
   */
  request: createStandardAction('REQUEST')<{
    id: symbol
    paramsId: string
    dontReinitialize?: boolean
    initData?: any
  }>(),

  /**
   * A refetchRequest has begun.
   */
  refetchRequest: createStandardAction('REFETCH_REQUEST')<{
    id: symbol
    paramsId: string
    reinitialize?: boolean
  }>(),

  /**
   * A request (or refetchRequest) has completed.
   */
  success: createStandardAction('SUCCESS')<{
    id: symbol
    paramsId: string
    data: any
  }>(),

  /**
   * A request (or refetchRequest) has failed.
   */
  failure: createStandardAction('FAILURE')<{
    id: symbol
    paramsId: string
    error: Error
  }>(),

  /**
   * The `data` should be set manually.
   */
  setData: createStandardAction('SET_DATA')<any>()
}
