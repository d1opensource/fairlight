import {IApiRequestParams, IRequestFetcher} from '../typings'
import {ApiRequestManager} from './'

const requestFetcher: IRequestFetcher = {
  getResponse: jest.fn()
}

const requestManager = new ApiRequestManager({requestFetcher})

it('does not cache the response if not the most recent request for the params', async () => {
  let resolveRequest1
  const request1 = new Promise((resolve) => {
    resolveRequest1 = resolve
  })
  ;(requestFetcher.getResponse as jest.Mock).mockReturnValueOnce(request1)

  let resolveRequest2
  const request2 = new Promise((resolve) => {
    resolveRequest2 = resolve
  })
  ;(requestFetcher.getResponse as jest.Mock).mockReturnValueOnce(request2)

  const params: IApiRequestParams = {method: 'GET', url: '/endpoint'}
  const getResponseBody1 = requestManager.getResponseBody(params, {
    forceNewFetch: true
  })
  const getResponseBody2 = requestManager.getResponseBody(params, {
    forceNewFetch: true
  })

  // resolve first request before second request finishes

  resolveRequest1({responseBody: {one: true}, responseType: 'json'})
  await getResponseBody1

  // should still be in progress
  expect(requestManager.requestInProgress(params)).toEqual(true)

  resolveRequest2({responseBody: {two: true}, responseType: 'json'})
  await getResponseBody2

  expect(requestManager.requestInProgress(params)).toEqual(false)
})
