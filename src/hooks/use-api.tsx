import {useContext} from 'react'

import {Api} from '../api'
import {ApiContext} from './context'

export function useApi(): Api {
  return useContext(ApiContext)
}
