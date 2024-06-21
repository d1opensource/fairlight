import {useContext, useState} from 'react'

import {Api} from '../../api'
import {
  ApiRequestMethod,
  ApiRequestOptions,
  ApiRequestParams,
  ResponseBody
} from '../../api/typings'
import {ApiContext} from '../context'
import {
  MutationApiHelpers,
  UseApiMutationParams,
  UseApiMutationReturnFunction,
  UseApiMutationReturnValue
} from './typings'

export * from './typings'

export function useApiMutation<
  TMutationArgs extends any[],
  TMutationReturnValue
>(
  params: UseApiMutationParams<TMutationArgs, TMutationReturnValue>
): UseApiMutationReturnValue<TMutationArgs> {
  const mutationApiHelpers = useMutationApiHelpers()
  const [mutating, {registerMutation, deregisterMutation}] = useIsMutating()

  const mutate: UseApiMutationReturnFunction<TMutationArgs> = async (
    ...mutationArgs
  ) => {
    registerMutation()

    const mutator = params.mutation(...mutationArgs)
    let returnValue: TMutationReturnValue

    try {
      returnValue = await mutator(mutationApiHelpers)
    } catch (error) {
      if (params.onError) {
        return params.onError(error as Error, {mutationArgs})
      }
      throw error
    } finally {
      deregisterMutation()
    }

    params.onSuccess?.(returnValue, {mutationArgs})
  }

  return [mutate, {mutating}]
}

function useIsMutating(): [
  boolean,
  {
    registerMutation(): void
    deregisterMutation(): void
  }
] {
  const [numOccurringMutations, setNumOccurringMutations] = useState(0)
  return [
    numOccurringMutations > 0,
    {
      registerMutation: () => setNumOccurringMutations((prev) => prev + 1),
      deregisterMutation: () => setNumOccurringMutations((prev) => prev - 1)
    }
  ]
}

function useMutationApiHelpers(): MutationApiHelpers {
  const {
    api,
    defaults: {
      useApiMutation: {fetchPolicy: defaultFetchPolicy}
    }
  } = useContext(ApiContext)

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

  return {
    request: _request,
    requestInProgress: api.requestInProgress,
    readCachedResponse: api.readCachedResponse,
    writeCachedResponse: api.writeCachedResponse,
    buildUrl: api.buildUrl,
    setDefaultHeader: api.setDefaultHeader,
    baseUrl: api.baseUrl
  }
}
