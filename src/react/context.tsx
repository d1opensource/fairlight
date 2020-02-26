import {createContext} from 'react'

import {Api} from '../api'

export const ApiContext = createContext<Api>(new Api())

export const ApiProvider = ApiContext.Provider
