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
  UseApiMutationParams,
  UseApiMutationReturnFunction,
  UseApiMutationReturnValue
} from './typings'

export * from './typings'

export function useApiMutation<TMutationArgs extends any[]>(
  params: UseApiMutationParams<TMutationArgs>
): UseApiMutationReturnValue<TMutationArgs> {
  const {
    api,
    defaults: {
      useApiMutation: {fetchPolicy: defaultFetchPolicy}
    }
  } = useContext(ApiContext)
  const [mutating, {registerMutation, deregisterMutation}] = useIsMutating()

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
    registerMutation()

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
      deregisterMutation()
    }
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
