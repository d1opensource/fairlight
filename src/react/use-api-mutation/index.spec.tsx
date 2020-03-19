import React from 'react'

import {cleanup} from '@testing-library/react'
import {act, renderHook} from '@testing-library/react-hooks'

import {Api} from '../../api'
import {ApiRequestFetchPolicy} from '../../api/typings'
import {ApiProvider} from '../context'
import {useApiMutation} from './'

let api: Api

afterEach(cleanup)

beforeEach(() => {
  api = {
    onCacheUpdate: jest.fn(() => () => null),
    readCachedResponse: jest.fn(),
    writeCachedResponse: jest.fn(),
    request: jest.fn()
  } as any
})

const wrapper = ({children}) => <ApiProvider api={api}>{children}</ApiProvider>

it('can perform mutations and update a loading flag', async () => {
  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: (firstName: string, lastName: string) => async (api) => {
          await api.request({
            method: 'POST',
            url: '/some-endpoint',
            body: {firstName, lastName}
          })
        }
      }),
    {wrapper}
  )

  expect(result.current[1].mutating).toEqual(false)

  act(() => {
    result.current[0]('Test', 'User')
  })
  expect(result.current[1].mutating).toEqual(true)

  await waitForNextUpdate()

  expect(result.current[1].mutating).toEqual(false)

  expect(api.request).toBeCalledWith(
    {
      method: 'POST',
      url: '/some-endpoint',
      body: {firstName: 'Test', lastName: 'User'}
    },
    {fetchPolicy: 'no-cache'}
  )
})

it('defaults fetch policy via ApiProvider', async () => {
  const defaultFetchPolicy: ApiRequestFetchPolicy = 'fetch-first'

  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: () => async (api) => {
          await api.request({url: '/some-endpoint'})
        }
      }),
    {
      wrapper: function Wrapper({children}) {
        return (
          <ApiProvider
            api={api}
            defaults={{useApiMutation: {fetchPolicy: defaultFetchPolicy}}}
          >
            {children}
          </ApiProvider>
        )
      }
    }
  )

  act(() => {
    result.current[0]()
  })

  await waitForNextUpdate()

  expect(api.request).toBeCalledWith(
    {url: '/some-endpoint'},
    {fetchPolicy: defaultFetchPolicy}
  )
})

it('calls onError on an error', async () => {
  const onError = jest.fn()

  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: (firstName: string, lastName: string) => async () => {
          throw new Error('Something happened')
        },
        onError
      }),
    {wrapper}
  )
  expect(result.current[1].mutating).toEqual(false)

  act(() => {
    result.current[0]('Test', 'User')
  })
  expect(result.current[1].mutating).toEqual(true)

  await waitForNextUpdate()

  expect(result.current[1].mutating).toEqual(false)
  expect(onError).toBeCalledWith(new Error('Something happened'), {
    mutationArgs: ['Test', 'User']
  })
})

it('throws an error if no onError is provided', async () => {
  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: () => async () => {
          throw new Error('Something happened')
        }
      }),
    {wrapper}
  )

  let promise: Promise<any>

  act(() => {
    promise = result.current[0]()
  })

  await Promise.all([
    expect(promise).rejects.toEqual(new Error('Something happened')),
    waitForNextUpdate()
  ])
})

it('tracks multiple concurrent mutations', async () => {
  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: (promise: Promise<any>) => {
          return () => promise
        }
      }),
    {wrapper}
  )

  expect(result.current[1].mutating).toEqual(false)

  let resolveMutation1: Function
  let resolveMutation2: Function
  const mutationPromise1 = new Promise((resolve) => {
    resolveMutation1 = resolve
  })
  const mutationPromise2 = new Promise((resolve) => {
    resolveMutation2 = resolve
  })

  act(() => {
    result.current[0](mutationPromise1)
    result.current[0](mutationPromise2)
  })
  expect(result.current[1].mutating).toEqual(true)

  resolveMutation1()
  await waitForNextUpdate()
  expect(result.current[1].mutating).toEqual(true)

  resolveMutation2()
  await waitForNextUpdate()
  expect(result.current[1].mutating).toEqual(false)
})

it('returns a promise that resolves once the mutation completes', async () => {
  let resolveMutation
  let mutationFinished = false
  const {result, waitForNextUpdate} = renderHook(
    () =>
      useApiMutation({
        mutation: () => async () => {
          await new Promise((resolve) => {
            resolveMutation = resolve
          })
          mutationFinished = true
        }
      }),
    {wrapper}
  )

  let mutationPromise
  act(() => {
    mutationPromise = result.current[0]()
  })

  resolveMutation()
  await Promise.all([mutationPromise, waitForNextUpdate()])

  expect(mutationFinished).toEqual(true)
})
