import {useContext, useState} from 'react'

import {Api} from '../../api'
import {
  ApiRequestMethod,
  ApiRequestOptions,
  ApiRequestParams,
  ResponseBody
} from '../../api/typings'
import {ApiContext} from '../context'

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
  {mutating: boolean}
]

export type UseApiMutationReturnFunction<TMutationArgs extends any[]> = (
  ...args: TMutationArgs
) => Promise<void>

export function useApiMutation<TMutationArgs extends any[]>(
  params: UseApiMutationParams<TMutationArgs>
): UseApiMutationReturnValue<TMutationArgs> {
  const {
    api,
    defaults: {
      useApiMutation: {fetchPolicy: defaultFetchPolicy}
    }
  } = useContext(ApiContext)
  const [numOccurringMutations, setNumOccurringMutations] = useState(0)

  /**
   * Same as `api.request` but uses default fetch policy from context
   */
  const _request: Api['request'] = <TResponseBody extends ResponseBody>(
    params: ApiRequestParams<ApiRequestMethod, TResponseBody>,
    options: ApiRequestOptions = {}
  ) => {
    return api.request(params, {
      ...options,
      fetchPolicy: options.fetchPolicy || defaultFetchPolicy
    })
  }

  const mutate: UseApiMutationReturnFunction<TMutationArgs> = async (
    ...mutationArgs
  ) => {
    setNumOccurringMutations((prev) => prev + 1)

    try {
      const mutator = params.mutation(...mutationArgs)
      await mutator({
        request: _request,
        requestInProgress: api.requestInProgress,
        readCachedResponse: api.readCachedResponse,
        writeCachedResponse: api.writeCachedResponse,
        buildUrl: api.buildUrl,
        setDefaultHeader: api.setDefaultHeader,
        baseUrl: api.baseUrl
      })
    } catch (error) {
      if (params.onError) {
        params.onError(error, {mutationArgs: mutationArgs})
      } else {
        throw error
      }
    } finally {
      setNumOccurringMutations((prev) => prev - 1)
    }
  }

  return [
    mutate,
    {
      mutating: numOccurringMutations > 0
    }
  ]
}
