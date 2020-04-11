import {Api} from '../../api'

export interface UseApiMutationParams<
  TMutationArgs extends any[],
  TMutationReturnValue
> {
  mutation: UseApiMutationParamsMutationFunction<
    TMutationArgs,
    TMutationReturnValue
  >
  onError?: (error: Error, context: {mutationArgs: TMutationArgs}) => void
  onSuccess?: (
    returnValue: TMutationReturnValue,
    context: {mutationArgs: TMutationArgs}
  ) => void
}

export type MutationApiHelpers = Pick<
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
  TMutationArgs extends any[],
  TMutationReturnValue
> = (
  ...args: TMutationArgs
) => (apiHelpers: MutationApiHelpers) => Promise<TMutationReturnValue>

export type UseApiMutationReturnValue<TMutationArgs extends any[]> = [
  UseApiMutationReturnFunction<TMutationArgs>,
  UseApiMutationData
]

export type UseApiMutationReturnFunction<TMutationArgs extends any[]> = (
  ...args: TMutationArgs
) => Promise<void>

export interface UseApiMutationData {
  mutating: boolean
}
