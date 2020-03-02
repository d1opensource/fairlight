import {ResponseBody} from '../../api/typings'

export interface UseApiQueryState {
  id: symbol | null
  paramsId: string | null
  loading: boolean
  data: ResponseBody | undefined | null
  error: Error | null
}
