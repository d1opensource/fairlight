import React, {createContext} from 'react'

import {Api} from '../api'

export const ApiContext = createContext<Api>(new Api())

export interface IApiProviderProps {
  api: Api
}

export const ApiProvider: React.FC<IApiProviderProps> = function ApiProvider(
  props
) {
  return (
    <ApiContext.Provider value={props.api}>
      {props.children}
    </ApiContext.Provider>
  )
}
