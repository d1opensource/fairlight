import React from 'react'

import {renderHook} from '@testing-library/react-hooks'

import {Api} from '../api'
import {ApiProvider} from './context'
import {useApi} from './use-api'

it('returns the provided API instance', () => {
  const api = new Api()
  const {result} = renderHook(() => useApi(), {
    wrapper: function Wrapper({children}) {
      return <ApiProvider api={api}>{children}</ApiProvider>
    }
  })
  expect(result.current).toEqual(api)
})
