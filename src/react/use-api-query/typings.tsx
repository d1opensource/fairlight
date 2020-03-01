import {ResponseBody} from '../../api/typings'

export interface IUseApiQueryState {
  id: symbol | null
  paramsId: string | null
  loading: boolean
  data: ResponseBody | undefined | null
  error: Error | null
}
