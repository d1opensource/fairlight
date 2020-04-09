import React, {createContext} from 'react'

import {Api} from '../api'
import {ApiRequestFetchPolicy} from '../api/typings'

const DEFAULT_QUERY_FETCH_POLICY = 'cache-and-fetch'
const DEFAULT_QUERY_USE_ERROR_BOUNDARY = false

interface ApiContext {
  api: Api
  defaults: ApiProviderDefaults
}

interface ApiProviderDefaults {
  useApiQuery: UseApiQueryDefaults
}

interface UseApiQueryDefaults {
  fetchPolicy: ApiRequestFetchPolicy
  useErrorBoundary: boolean
}

const defaultApi = new Api()

const DEFAULT_API_CONTEXT: ApiContext = {
  api: defaultApi,
  defaults: {
    useApiQuery: {
      fetchPolicy: DEFAULT_QUERY_FETCH_POLICY,
      useErrorBoundary: DEFAULT_QUERY_USE_ERROR_BOUNDARY
    }
  }
}

export const ApiContext = createContext<ApiContext>(DEFAULT_API_CONTEXT)

export interface ApiProviderProps {
  /**
   * The API instance to use
   */
  api?: Api

  /**
   * Sets the default `fetchPolicy` which is used by `useApiQuery`
   * if no `fetchPolicy` is provided to the hook.
   */
  defaults?: {
    useApiQuery?: Partial<UseApiQueryDefaults>
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
          }
        }
      }}
    >
      {props.children}
    </ApiContext.Provider>
  )
}
