import React, {createContext} from 'react'

import {Api} from '../api'

export const ApiContext = createContext<Api>(new Api())

export interface ApiProviderProps {
  api: Api
}

export const ApiProvider: React.FC<ApiProviderProps> = function ApiProvider(
  props
) {
  return (
    <ApiContext.Provider value={props.api}>
      {props.children}
    </ApiContext.Provider>
  )
}
