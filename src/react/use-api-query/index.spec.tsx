import React from 'react'

import {cleanup} from '@testing-library/react'
import {act, renderHook} from '@testing-library/react-hooks'

import {Api} from '../../api'
import {ApiError} from '../../api/errors'
import {ApiRequestFetchPolicy, ApiRequestParams} from '../../api/typings'
import {ApiProvider} from '../context'
import {useApiQuery} from './'

let api: Api

afterEach(cleanup)

beforeEach(() => {
  api = {
    onCacheUpdate: jest.fn(() => ({
      subscribe: () => {
        const subscription = {unsubscribe: () => null}
        return subscription
      }
    })),
    readCachedResponse: jest.fn(),
    writeCachedResponse: jest.fn(),
    request: jest.fn()
  } as any
})

const wrapper = ({children}) => <ApiProvider api={api}>{children}</ApiProvider>

it('does not make a query if there are no params', () => {
  const {result} = renderHook(() => useApiQuery(null), {wrapper})
  expect(result.current[0]).toEqual({
    data: null,
    loading: false,
    error: null
  })

  // ensure it doesn't subscribe to updates
  expect(api.onCacheUpdate).not.toBeCalled()
})

it('loads api data', async () => {
  const response = {name: 'Test'}
  ;(api.request as jest.Mock).mockResolvedValue(response)

  const {result, waitForNextUpdate} = renderHook(
    () => useApiQuery({method: 'GET', url: '/endpoint'}),
    {wrapper}
  )

  expect(result.current[0]).toEqual({
    data: null,
    loading: true,
    error: null
  })

  await waitForNextUpdate()

  expect(result.current[0]).toEqual({
    data: response,
    loading: false,
    error: null
  })
})

describe('errors', () => {
  it('returns api errors', async () => {
    const error = new ApiError('GET', '/endpoint', 400, {error: true}, 'json')
    ;(api.request as jest.Mock).mockRejectedValue(error)

    const {result, waitForNextUpdate} = renderHook(
      () => useApiQuery({method: 'GET', url: '/endpoint'}),
      {wrapper}
    )

    await waitForNextUpdate()

    expect(result.current[0]).toEqual({
      data: null,
      loading: false,
      error
    })
  })

  it('can throw an error if `useErrorBoundary` is set', async () => {
    const error = new ApiError('GET', '/endpoint', 400, {error: true}, 'json')
    ;(api.request as jest.Mock).mockRejectedValue(error)

    const {result, waitForNextUpdate} = renderHook(
      () =>
        useApiQuery(
          {method: 'GET', url: '/endpoint'},
          {useErrorBoundary: true}
        ),
      {wrapper}
    )

    await waitForNextUpdate({suppressErrors: true})

    expect(result.error).toEqual(error)
  })

  it('can throw an error by default if `useErrorBoundary` is set in context', async () => {
    const error = new ApiError('GET', '/endpoint', 400, {error: true}, 'json')
    ;(api.request as jest.Mock).mockRejectedValue(error)

    const {result, waitForNextUpdate} = renderHook(
      () => useApiQuery({method: 'GET', url: '/endpoint'}),
      {
        wrapper: function Wrapper({children}) {
          return (
            <ApiProvider
              api={api}
              defaults={{useApiQuery: {useErrorBoundary: true}}}
            >
              {children}
            </ApiProvider>
          )
        }
      }
    )

    await waitForNextUpdate({suppressErrors: true})

    expect(result.error).toEqual(error)
  })
})

it('makes a new request if params change', async () => {
  const response1 = {name: 'Test'}
  ;(api.request as jest.Mock).mockResolvedValue(response1)

  const {result, waitForNextUpdate, rerender} = renderHook(
    (props: {url: string}) => useApiQuery({method: 'GET', url: props.url}),
    {wrapper, initialProps: {url: '/endpoint1'}}
  )

  await waitForNextUpdate()

  expect(result.current[0]).toEqual({
    data: response1,
    loading: false,
    error: null
  })

  const response2 = {name: 'Test2'}
  ;(api.request as jest.Mock).mockResolvedValue(response2)

  // reload
  rerender({url: '/endpoint2'})

  expect(result.current[0]).toEqual({
    data: null,
    loading: true,
    error: null
  })

  await waitForNextUpdate()

  // should get response2
  expect(result.current[0]).toEqual({
    data: response2,
    loading: false,
    error: null
  })
})

it('can disable reinitialization of data between successive requests', async () => {
  const response1 = {name: 'Test'}
  ;(api.request as jest.Mock).mockResolvedValue(response1)

  const {result, waitForNextUpdate, rerender} = renderHook(
    (props: {url: string}) =>
      useApiQuery({method: 'GET', url: props.url}, {dontReinitialize: true}),
    {wrapper, initialProps: {url: '/endpoint1'}}
  )

  await waitForNextUpdate()

  expect(result.current[0]).toEqual({
    data: response1,
    loading: false,
    error: null
  })

  const response2 = {name: 'Test2'}
  ;(api.request as jest.Mock).mockResolvedValue(response2)

  // reload
  rerender({url: '/endpoint2'})

  expect(result.current[0]).toEqual({
    data: response1, // ie not `null`
    loading: true,
    error: null
  })

  await waitForNextUpdate()

  // should get response2
  expect(result.current[0]).toEqual({
    data: response2,
    loading: false,
    error: null
  })
})

describe('cache', () => {
  it('defaults fetchPolicy to cache-and-fetch', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const {waitForNextUpdate} = renderHook(() => useApiQuery(params), {
      wrapper
    })

    await waitForNextUpdate()

    expect(api.request).toBeCalledWith(params, {
      deduplicate: undefined,
      fetchPolicy: 'cache-and-fetch'
    })
  })

  it('uses defaultFetchPolicy from context', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const defaultFetchPolicy = 'no-cache'
    const {waitForNextUpdate} = renderHook(() => useApiQuery(params), {
      wrapper: function Wrapper({children}) {
        return (
          <ApiProvider
            api={api}
            defaults={{useApiQuery: {fetchPolicy: defaultFetchPolicy}}}
          >
            {children}
          </ApiProvider>
        )
      }
    })

    await waitForNextUpdate()

    expect(api.request).toBeCalledWith(params, {
      deduplicate: undefined,
      fetchPolicy: defaultFetchPolicy
    })
  })

  it('initializes the data to null if there is no cached value for a cache-first policy', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const response = {name: 'Test'}
    const cacheFirstPolicies: ApiRequestFetchPolicy[] = [
      'cache-first',
      'cache-only',
      'cache-and-fetch'
    ]

    for (const fetchPolicy of cacheFirstPolicies) {
      ;(api.request as jest.Mock).mockResolvedValue(response)
      ;(api.readCachedResponse as jest.Mock).mockReturnValue(null)

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      expect(api.readCachedResponse).toBeCalledWith(params)

      expect(result.current[0]).toEqual({
        data: null,
        loading: true,
        error: null
      })

      if (fetchPolicy !== 'cache-only') {
        // eslint-disable-next-line
        await waitForNextUpdate()

        expect(result.current[0]).toEqual({
          data: response,
          loading: false,
          error: null
        })

        expect(api.request).toBeCalledWith(params, {fetchPolicy})
      }
    }
  })

  it('initializes data to the cached value if its a cache-first policy', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const response = {name: 'Test'}
    const cacheFirstPolicies: ApiRequestFetchPolicy[] = [
      'cache-first',
      'cache-only',
      'cache-and-fetch'
    ]

    for (const fetchPolicy of cacheFirstPolicies) {
      ;(api.request as jest.Mock).mockResolvedValue(response)
      ;(api.readCachedResponse as jest.Mock).mockReturnValue(response)

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      expect(api.readCachedResponse).toBeCalledWith(params)

      expect(result.current[0]).toEqual({
        data: response,
        loading: fetchPolicy === 'cache-only' ? false : true,
        error: null
      })

      if (fetchPolicy !== 'cache-only') {
        // eslint-disable-next-line
        await waitForNextUpdate()

        expect(result.current[0]).toEqual({
          data: response,
          loading: false,
          error: null
        })

        expect(api.request).toBeCalledWith(params, {fetchPolicy})
      }
    }
  })

  it('does not initialize to the cached value if its a fetch-first policy', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const response = {name: 'Test'}
    const fetchFirstPolicies: ApiRequestFetchPolicy[] = [
      'no-cache',
      'fetch-first'
    ]

    for (const fetchPolicy of fetchFirstPolicies) {
      ;(api.request as jest.Mock).mockResolvedValue(response)

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      expect(result.current[0]).toEqual({
        data: null,
        loading: true,
        error: null
      })

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: response,
        loading: false,
        error: null
      })
    }
  })

  it('updates data on to api cache updates', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const response = {name: 'Test'}

    const fetchPolicies: ApiRequestFetchPolicy[] = [
      'cache-first',
      'cache-only',
      'cache-and-fetch',
      'no-cache',
      'fetch-first'
    ]
    ;(api.request as jest.Mock).mockResolvedValue(response)

    for (const fetchPolicy of fetchPolicies) {
      // set up onCacheUpdate listener
      let listener
      const subscribe = jest.fn((_listener) => {
        listener = _listener
        return {unsubscribe}
      })
      const unsubscribe = jest.fn()
      const onCacheUpdate = jest.fn((params) => ({subscribe}))
      ;(api.onCacheUpdate as jest.Mock) = onCacheUpdate

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      expect(result.current[0]).toEqual({
        data: null,
        loading: true,
        error: null
      })

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: response,
        loading: false,
        error: null
      })

      expect(api.request).toBeCalledWith(params, {fetchPolicy})

      expect(onCacheUpdate).toBeCalledWith(params)
      expect(subscribe).toBeCalledWith(listener)

      const response2 = {name: 'Test 2'}
      act(() => {
        listener(response2)
      })

      expect(result.current[0]).toEqual({
        data: response2,
        loading: false,
        error: null
      })
    }
  })
})

describe('refetch', () => {
  it('refetches data', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const fetchPolicies: ApiRequestFetchPolicy[] = [
      null,
      'cache-first',
      'cache-only',
      'cache-and-fetch',
      'no-cache',
      'fetch-first'
    ]

    for (const fetchPolicy of fetchPolicies) {
      const response1 = {name: 'Test'}
      ;(api.request as jest.Mock).mockResolvedValue(response1)

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: response1,
        loading: false,
        error: null
      })

      const response2 = {name: 'Test2'}
      ;(api.request as jest.Mock).mockClear()
      ;(api.request as jest.Mock).mockResolvedValue(response2)

      act(() => {
        result.current[1].refetch()
      })

      expect(api.request).toBeCalledWith(params, {
        fetchPolicy: fetchPolicy === 'no-cache' ? 'no-cache' : 'fetch-first',
        deduplicate: false
      })

      expect(result.current[0]).toEqual({
        data: response1, // doesnt reinitialize by default
        loading: true,
        error: null
      })

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: response2,
        loading: false,
        error: null
      })
    }
  })

  it('can override deduplicate', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}

    const response1 = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(response1)

    const {result, waitForNextUpdate} = renderHook(() => useApiQuery(params), {
      wrapper
    })

    // eslint-disable-next-line
    await waitForNextUpdate()
    ;(api.request as jest.Mock).mockClear()

    act(() => {
      result.current[1].refetch({deduplicate: true})
    })

    expect(api.request).toBeCalledWith(params, {
      deduplicate: true,
      fetchPolicy: 'fetch-first'
    })

    // eslint-disable-next-line
    await waitForNextUpdate()
  })

  it('stores a refetch error', async () => {
    const response1 = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(response1)

    const {result, waitForNextUpdate} = renderHook(
      () => useApiQuery({method: 'GET', url: '/endpoint'}),
      {wrapper}
    )

    await waitForNextUpdate()

    const error = new ApiError('GET', '/endpoint', 400, {error: true}, 'json')
    ;(api.request as jest.Mock).mockRejectedValue(error)

    act(() => {
      result.current[1].refetch()
    })

    await waitForNextUpdate()

    expect(result.current[0]).toEqual({
      data: null,
      loading: false,
      error
    })
  })

  it('can reinitialize data', async () => {
    const response1 = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(response1)

    const {result, waitForNextUpdate} = renderHook(
      () => useApiQuery({method: 'GET', url: '/endpoint'}),
      {wrapper}
    )

    await waitForNextUpdate()

    const response2 = {name: 'Test2'}
    ;(api.request as jest.Mock).mockResolvedValue(response2)

    act(() => {
      result.current[1].refetch({reinitialize: true})
    })

    expect(result.current[0]).toEqual({
      data: null, // reinitializes data
      loading: true,
      error: null
    })

    await waitForNextUpdate()

    expect(result.current[0]).toEqual({
      data: response2,
      loading: false,
      error: null
    })
  })

  it('does not make a request if there are no params defined', async () => {
    const {result} = renderHook(() => useApiQuery(null), {
      wrapper
    })

    act(() => {
      result.current[1].refetch()
    })

    expect(api.request as jest.Mock).not.toBeCalled()
  })
})

describe('setData', () => {
  it('imperatively sets data directly if there is no cache', async () => {
    const response = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(response)
    ;(api.writeCachedResponse as jest.Mock).mockClear()

    const {result, waitForNextUpdate} = renderHook(
      () =>
        useApiQuery(
          {method: 'GET', url: '/endpoint'},
          {fetchPolicy: 'no-cache'}
        ),
      {wrapper}
    )

    // eslint-disable-next-line
    await waitForNextUpdate()

    expect(result.current[0]).toEqual({
      data: response,
      loading: false,
      error: null
    })

    const nextData = {next: 'data'}

    act(() => {
      result.current[1].setData(nextData)
    })

    expect(api.writeCachedResponse).not.toBeCalled()

    expect(result.current[0]).toEqual({
      data: nextData,
      loading: false,
      error: null
    })
  })

  it('accepts a function setter', async () => {
    const initialData = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(initialData)
    ;(api.writeCachedResponse as jest.Mock).mockClear()

    const {result, waitForNextUpdate} = renderHook(
      () =>
        useApiQuery(
          {method: 'GET', url: '/endpoint'},
          {fetchPolicy: 'no-cache'}
        ),
      {wrapper}
    )

    // eslint-disable-next-line
    await waitForNextUpdate()

    expect(result.current[0]).toEqual({
      data: initialData,
      loading: false,
      error: null
    })

    const nextData = {next: 'data'}

    act(() => {
      result.current[1].setData((prev: object) => ({...prev, ...nextData}))
    })

    expect(api.writeCachedResponse).not.toBeCalled()

    expect(result.current[0]).toEqual({
      data: {
        ...initialData,
        ...nextData
      },
      loading: false,
      error: null
    })
  })

  it('writes to the cache if fetchPolicy is not no-cache', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const response = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(response)
    const fetchPolicies: ApiRequestFetchPolicy[] = [
      'cache-first',
      'cache-only',
      'cache-and-fetch',
      'fetch-first'
    ]

    for (const fetchPolicy of fetchPolicies) {
      ;(api.writeCachedResponse as jest.Mock).mockClear()
      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: response,
        loading: false,
        error: null
      })

      const nextData = {next: 'data'}

      act(() => {
        result.current[1].setData(nextData)
      })

      expect(api.writeCachedResponse).toBeCalledWith(params, nextData)
    }
  })

  it('accepts a function setter to write to the cache if fetchPolicy is not no-cache', async () => {
    const params: ApiRequestParams = {method: 'GET', url: '/endpoint'}
    const initialData = {name: 'Test'}
    ;(api.request as jest.Mock).mockResolvedValue(initialData)
    const fetchPolicies: ApiRequestFetchPolicy[] = [
      'cache-first',
      'cache-only',
      'cache-and-fetch',
      'fetch-first'
    ]

    for (const fetchPolicy of fetchPolicies) {
      ;(api.writeCachedResponse as jest.Mock).mockClear()
      ;(api.readCachedResponse as jest.Mock).mockReturnValue(undefined)

      const {result, waitForNextUpdate} = renderHook(
        () => useApiQuery(params, {fetchPolicy}),
        {wrapper}
      )

      // eslint-disable-next-line
      await waitForNextUpdate()

      expect(result.current[0]).toEqual({
        data: initialData,
        loading: false,
        error: null
      })
      ;(api.readCachedResponse as jest.Mock).mockReturnValue(initialData)
      const nextData = {next: 'data'}

      act(() => {
        result.current[1].setData((prev: object) => ({...prev, ...nextData}))
      })

      expect(api.writeCachedResponse).toBeCalledWith(params, {
        ...initialData,
        ...nextData
      })
    }
  })
})

it('allows initialData to be set', async () => {
  const response = {name: 'Test'}
  ;(api.request as jest.Mock).mockResolvedValue(response)

  const initialData = {name: 'Initial'}

  const {result, waitForNextUpdate} = renderHook(
    () => useApiQuery({method: 'GET', url: '/endpoint'}, {initialData}),
    {wrapper}
  )

  expect(result.current[0]).toEqual({
    data: initialData,
    loading: true,
    error: null
  })

  await waitForNextUpdate()

  expect(result.current[0]).toEqual({
    data: response,
    loading: false,
    error: null
  })
})
