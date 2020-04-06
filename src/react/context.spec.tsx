import React, {useContext} from 'react'

import {renderHook} from '@testing-library/react-hooks'

import {Api} from '../api'
import {ApiContext, ApiProvider} from './context'

describe('ApiProvider', () => {
  it('defaults to a basic api', () => {
    const {result} = renderHook(() => useContext(ApiContext), {
      wrapper: function WithProvider({children}) {
        return <ApiProvider>{children}</ApiProvider>
      }
    })

    expect(result.current.api).toBeInstanceOf(Api)
  })
})
