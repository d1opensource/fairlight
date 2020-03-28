import {Api} from '../../api'

export interface UseApiMutationParams<TMutationArgs extends any[]> {
  mutation: UseApiMutationParamsMutationFunction<TMutationArgs>
  onError?: (error: Error, context: {mutationArgs: TMutationArgs}) => void
}

type MutationApiHelpers = Pick<
  Api,
  | 'request'
  | 'requestInProgress'
  | 'readCachedResponse'
  | 'writeCachedResponse'
  | 'buildUrl'
  | 'setDefaultHeader'
  | 'baseUrl'
>

export type UseApiMutationParamsMutationFunction<
  TMutationArgs extends any[]
> = (
  ...args: TMutationArgs
) => (apiHelpers: MutationApiHelpers) => Promise<void>

export type UseApiMutationReturnValue<TMutationArgs extends any[]> = [
  UseApiMutationReturnFunction<TMutationArgs>,
  UseApiMutationData
]

export type UseApiMutationReturnFunction<TMutationArgs extends any[]> = (
  ...args: TMutationArgs
) => Promise<void>

interface UseApiMutationData {
  mutating: boolean
}
