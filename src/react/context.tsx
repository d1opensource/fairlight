import React, {createContext} from 'react'

import {Api} from '../api'
import {ApiRequestFetchPolicy} from '../api/typings'

const DEFAULT_QUERY_FETCH_POLICY = 'cache-and-fetch'
const DEFAULT_QUERY_USE_ERROR_BOUNDARY = false
const DEFAULT_MUTATION_FETCH_POLICY = 'no-cache'

interface UseApiQueryDefaults {
  fetchPolicy: ApiRequestFetchPolicy
  useErrorBoundary: boolean
}

interface UseApiMutationDefaults {
  fetchPolicy: ApiRequestFetchPolicy
}

interface ApiProviderDefaults {
  useApiQuery: UseApiQueryDefaults
  useApiMutation: UseApiMutationDefaults
}

interface ApiContextProps {
  api: Api
  defaults: ApiProviderDefaults
}

const defaultApi = new Api()

const DEFAULT_API_CONTEXT: ApiContextProps = {
  api: defaultApi,
  defaults: {
    useApiQuery: {
      fetchPolicy: DEFAULT_QUERY_FETCH_POLICY,
      useErrorBoundary: DEFAULT_QUERY_USE_ERROR_BOUNDARY
    },
    useApiMutation: {
      fetchPolicy: DEFAULT_MUTATION_FETCH_POLICY
    }
  }
}

export const ApiContext = createContext<ApiContextProps>(DEFAULT_API_CONTEXT)

export interface ApiProviderProps {
  /**
   * The API instance to use
   */
  api?: Api

  children: React.ReactNode

  /**
   * Sets the default `fetchPolicy` which is used by `useApiQuery`
   * if no `fetchPolicy` is provided to the hook.
   */
  defaults?: {
    useApiQuery?: Partial<UseApiQueryDefaults>
    useApiMutation?: Partial<UseApiMutationDefaults>
  }
}

export const ApiProvider: React.FC<ApiProviderProps> = function ApiProvider(
  props
) {
  return (
    <ApiContext.Provider
      value={{
        api: props.api || DEFAULT_API_CONTEXT.api,
        defaults: {
          useApiQuery: {
            fetchPolicy:
              props.defaults?.useApiQuery?.fetchPolicy ||
              DEFAULT_API_CONTEXT.defaults.useApiQuery.fetchPolicy,
            useErrorBoundary:
              props.defaults?.useApiQuery?.useErrorBoundary ||
              DEFAULT_API_CONTEXT.defaults.useApiQuery.useErrorBoundary
          },
          useApiMutation: {
            fetchPolicy:
              props.defaults?.useApiMutation?.fetchPolicy ||
              DEFAULT_API_CONTEXT.defaults.useApiMutation.fetchPolicy
          }
        }
      }}
    >
      {props.children}
    </ApiContext.Provider>
  )
}
