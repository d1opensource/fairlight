import React from 'react'

import hoistNonReactStatics from 'hoist-non-react-statics'

import {getDisplayName} from '@d1g1t/lib/get-display-name'

import {Api} from '../api'
import {useApi} from './use-api'

export * from './use-api'
export * from './use-api-query/index'

export interface IWithApiProps {
  api: Api
}

export function withApi<TBaseComponentProps>(
  BaseComponent: React.ComponentType<TBaseComponentProps & IWithApiProps>
) {
  const WithApi: React.FC<TBaseComponentProps> = (props) => {
    const api = useApi()
    return <BaseComponent {...props} api={api} />
  }

  hoistNonReactStatics(WithApi, BaseComponent)
  WithApi.displayName = `WithApi(${getDisplayName(BaseComponent)})`

  return WithApi
}
