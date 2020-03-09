import React, {createContext} from 'react'

import {Api} from '../api'
import {ApiRequestFetchPolicy} from '../api/typings'

const DEFAULT_QUERY_FETCH_POLICY = 'cache-and-fetch'

interface ApiContext {
  api: Api
  defaultFetchPolicies: ApiProviderDefaultFetchPolicies
}

interface ApiProviderDefaultFetchPolicies {
  useApiQuery: ApiRequestFetchPolicy
}

export const ApiContext = createContext<ApiContext>({
  api: new Api(),
  defaultFetchPolicies: {
    useApiQuery: DEFAULT_QUERY_FETCH_POLICY
  }
})

export interface ApiProviderProps {
  /**
   * The API instance to use
   */
  api: Api

  /**
   * Sets the default `fetchPolicy` which is used by `useApiQuery`
   * if no `fetchPolicy` is provided to the hook.
   */
  defaultFetchPolicies?: Partial<ApiProviderDefaultFetchPolicies>
}

export const ApiProvider: React.FC<ApiProviderProps> = function ApiProvider(
  props
) {
  return (
    <ApiContext.Provider
      value={{
        api: props.api,
        defaultFetchPolicies: {
          useApiQuery:
            props.defaultFetchPolicies?.useApiQuery ||
            DEFAULT_QUERY_FETCH_POLICY
        }
      }}
    >
      {props.children}
    </ApiContext.Provider>
  )
}
