import {apiRequestId} from '../../api/lib'
import {ApiRequestParams} from '../../api/typings'
import {useApiQueryActions} from './actions'
import {useApiQueryReducer} from './reducer'

it('defaults to initial state', () => {
  expect(
    useApiQueryReducer(undefined, {type: '@@INIT', payload: null} as any)
  ).toEqual({
    requestId: null,
    paramsId: null,
    loading: false,
    data: null,
    error: null
  })
})

it('stores a successful response data if it matches the most recent request', () => {
  let state = useApiQueryReducer(
    {
      requestId: null,
      paramsId: null,
      loading: false,
      data: null,
      error: null
    },
    {type: '@@INIT', payload: null} as any
  )

  const params: ApiRequestParams = {
    method: 'GET',
    url: '/endpoint'
  }

  const requestId = Symbol()

  // matching success/failure actions

  state = useApiQueryReducer(
    state,
    useApiQueryActions.newRequest({
      requestId,
      paramsId: apiRequestId(params),
      fetchPolicy: 'no-cache',
      cachedData: null
    })
  )

  const data = {test: 'data'}

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      requestId,
      paramsId: apiRequestId(params),
      data
    })
  )

  expect(state.data).toEqual(data)

  const error = new Error('Something went wrong')

  state = useApiQueryReducer(
    state,
    useApiQueryActions.failure({
      requestId,
      paramsId: apiRequestId(params),
      error
    })
  )

  expect(state.error).toEqual(error)

  // not matching success/failure actions

  state = useApiQueryReducer(
    state,
    useApiQueryActions.newRequest({
      requestId,
      paramsId: null,
      fetchPolicy: 'no-cache',
      cachedData: null
    })
  )

  expect(state.data).toEqual(null)
  expect(state.error).toEqual(null)

  const wrongId = Symbol()

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      requestId: wrongId,
      paramsId: apiRequestId(params),
      data
    })
  )

  expect(state.data).toEqual(null)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.failure({
      requestId: wrongId,
      paramsId: apiRequestId(params),
      error
    })
  )

  expect(state.error).toEqual(null)
})

it('only starts a refetch request if the request params are correct', () => {
  let state = useApiQueryReducer(
    {
      requestId: null,
      paramsId: null,
      loading: false,
      data: null,
      error: null
    },
    {type: '@@INIT', payload: null} as any
  )

  const requestId = Symbol()
  const params: ApiRequestParams = {
    method: 'GET',
    url: '/endpoint'
  }
  const data = {test: 'data'}

  // correct paramsId

  state = useApiQueryReducer(
    state,
    useApiQueryActions.newRequest({
      requestId,
      paramsId: apiRequestId(params),
      fetchPolicy: 'no-cache',
      cachedData: null
    })
  )

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      requestId,
      paramsId: apiRequestId(params),
      data
    })
  )

  expect(state.loading).toEqual(false)

  const refetchId = Symbol()

  state = useApiQueryReducer(
    state,
    useApiQueryActions.refetchRequest({
      requestId: refetchId, // new symbol
      paramsId: apiRequestId(params) // same params
    })
  )

  expect(state.loading).toEqual(true)
  expect(state.requestId).toEqual(refetchId)

  // wrong paramsId

  state = useApiQueryReducer(
    state,
    useApiQueryActions.newRequest({
      requestId,
      paramsId: null,
      fetchPolicy: 'no-cache',
      cachedData: null
    })
  )

  expect(state.loading).toEqual(false)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.newRequest({
      requestId,
      paramsId: apiRequestId(params),
      fetchPolicy: 'no-cache',
      cachedData: null
    })
  )

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      requestId,
      paramsId: apiRequestId(params),
      data
    })
  )

  expect(state.loading).toEqual(false)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.refetchRequest({
      requestId: Symbol(),
      paramsId: apiRequestId({method: 'GET', url: '/refetch-endpoint'})
    })
  )

  expect(state.loading).toEqual(false)
  expect(state.requestId).toEqual(requestId) // keep original id
})
