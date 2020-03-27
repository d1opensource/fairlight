import {ResponseBody} from '../../api/typings'

export interface UseApiQueryState {
  requestId: symbol | null
  paramsId: string | null
  loading: boolean
  data: ResponseBody | undefined | null
  error: Error | null
}
