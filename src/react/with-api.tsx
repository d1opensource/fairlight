import hoistNonReactStatics from 'hoist-non-react-statics'
import React from 'react'

import {Api} from '../api'
import {useApi} from './use-api'

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

function getDisplayName(Component: React.ComponentType): string {
  return Component.displayName || Component.name || 'Component'
}
