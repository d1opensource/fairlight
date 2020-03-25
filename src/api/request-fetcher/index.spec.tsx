import 'jest-fetch-mock'

import {ApiResponseType} from '../typings'
import {ApiRequestFetcher} from './'

let requestFetcher: ApiRequestFetcher

beforeEach(() => {
  requestFetcher = new ApiRequestFetcher()
  fetchMock.mockClear()
})

it('does not parse the response body if it cant determine the response type', async () => {
  // no content type
  fetchMock.mockResponseOnce(JSON.stringify({num: 12345}), {
    headers: {'Content-Type': ''}
  })
  expect(
    await requestFetcher.getResponse({
      url: 'http://test.com/endpoint',
      method: 'GET'
    })
  ).toEqual({status: 200, body: null, bodyType: null})

  // unknown content type
  fetchMock.mockResponseOnce(JSON.stringify({num: 12345}), {
    headers: {'Content-Type': 'unknown'}
  })
  expect(
    await requestFetcher.getResponse({
      url: 'http://test.com/endpoint',
      method: 'GET'
    })
  ).toEqual({status: 200, body: null, bodyType: null})
})

it('throws a TypeError if an invalid responseBody is passed', async () => {
  // unknown content type
  fetchMock.mockResponseOnce(JSON.stringify({num: 12345}), {
    headers: {'Content-Type': 'unknown'}
  })
  await expect(
    requestFetcher.getResponse({
      url: 'http://test.com/endpoint',
      method: 'GET',
      responseType: 'invalid' as ApiResponseType
    })
  ).rejects.toEqual(new TypeError("'invalid' is not a valid response type"))
})
