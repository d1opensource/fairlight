import {getParamsId} from '../../api/lib'
import {IApiRequestParams} from '../../api/typings'
import {useApiQueryActions} from './actions'
import {useApiQueryReducer} from './reducer'

it('defaults to initial state', () => {
  expect(
    useApiQueryReducer(undefined, {type: '@@INIT', payload: null} as any)
  ).toEqual({
    id: null,
    paramsId: null,
    loading: false,
    data: null,
    error: null
  })
})

it('stores a successful response data if it matches the most recent request', () => {
  let state = useApiQueryReducer(
    {
      id: null,
      paramsId: null,
      loading: false,
      data: null,
      error: null
    },
    {type: '@@INIT', payload: null} as any
  )

  const params: IApiRequestParams = {
    method: 'GET',
    url: '/endpoint'
  }

  const id = Symbol()

  // matching success/failure actions

  state = useApiQueryReducer(
    state,
    useApiQueryActions.request({
      id,
      paramsId: getParamsId(params)
    })
  )

  const data = {test: 'data'}

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      id,
      paramsId: getParamsId(params),
      data
    })
  )

  expect(state.data).toEqual(data)

  const error = new Error('Something went wrong')

  state = useApiQueryReducer(
    state,
    useApiQueryActions.failure({
      id,
      paramsId: getParamsId(params),
      error
    })
  )

  expect(state.error).toEqual(error)

  // not matching success/failure actions

  state = useApiQueryReducer(state, useApiQueryActions.reset())

  expect(state.data).toEqual(null)
  expect(state.error).toEqual(null)

  const wrongId = Symbol()

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      id: wrongId,
      paramsId: getParamsId(params),
      data
    })
  )

  expect(state.data).toEqual(null)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.failure({
      id: wrongId,
      paramsId: getParamsId(params),
      error
    })
  )

  expect(state.error).toEqual(null)
})

it('only starts a refetch request if the request params are correct', () => {
  let state = useApiQueryReducer(
    {
      id: null,
      paramsId: null,
      loading: false,
      data: null,
      error: null
    },
    {type: '@@INIT', payload: null} as any
  )

  const id = Symbol()
  const params: IApiRequestParams = {
    method: 'GET',
    url: '/endpoint'
  }
  const data = {test: 'data'}

  // correct paramsId

  state = useApiQueryReducer(
    state,
    useApiQueryActions.request({
      id,
      paramsId: getParamsId(params)
    })
  )

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      id,
      paramsId: getParamsId(params),
      data
    })
  )

  expect(state.loading).toEqual(false)

  const refetchId = Symbol()

  state = useApiQueryReducer(
    state,
    useApiQueryActions.refetchRequest({
      id: refetchId, // new symbol
      paramsId: getParamsId(params) // same params
    })
  )

  expect(state.loading).toEqual(true)
  expect(state.id).toEqual(refetchId)

  // wrong paramsId

  state = useApiQueryReducer(state, useApiQueryActions.reset())

  expect(state.loading).toEqual(false)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.request({
      id,
      paramsId: getParamsId(params)
    })
  )

  state = useApiQueryReducer(
    state,
    useApiQueryActions.success({
      id,
      paramsId: getParamsId(params),
      data
    })
  )

  expect(state.loading).toEqual(false)

  state = useApiQueryReducer(
    state,
    useApiQueryActions.refetchRequest({
      id: Symbol(),
      paramsId: getParamsId({method: 'GET', url: '/refetch-endpoint'})
    })
  )

  expect(state.loading).toEqual(false)
  expect(state.id).toEqual(id) // keep original id
})
