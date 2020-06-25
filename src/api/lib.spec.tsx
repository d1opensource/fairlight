import {apiRequestId, applyHeaders, cloneHeaders} from './lib'
import {ApiRequestParams} from './typings'

describe('apiRequestId', () => {
  it('serializes basic requests', () => {
    const requestParams: ApiRequestParams = {
      method: 'GET',
      url: '/endpoint'
    }

    expect(apiRequestId(requestParams)).toEqual(
      apiRequestId({
        url: '/endpoint' // method defaults to GET
      })
    )

    expect(apiRequestId(requestParams)).not.toEqual(
      apiRequestId({
        ...requestParams,
        method: 'POST'
      })
    )

    expect(apiRequestId(requestParams)).not.toEqual(
      apiRequestId({
        ...requestParams,
        url: '/endpoint-2'
      })
    )
  })

  it('serializes headers', () => {
    const requestParams: ApiRequestParams = {
      method: 'GET',
      url: '/endpoint'
    }

    // empty header checks
    expect(apiRequestId(requestParams)).toEqual(
      apiRequestId({
        ...requestParams,
        headers: null
      })
    )

    expect(apiRequestId(requestParams)).toEqual(
      apiRequestId({
        ...requestParams,
        headers: {}
      })
    )

    // ensure header modifies the paramsId
    expect(
      apiRequestId({
        ...requestParams,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    ).not.toEqual(apiRequestId(requestParams))

    // test capitalization variance
    expect(
      apiRequestId({
        ...requestParams,
        headers: {
          'CONTENT-TYPE': 'application/json'
        }
      })
    ).toEqual(
      apiRequestId({
        ...requestParams,
        headers: {
          'content-type': 'application/json'
        }
      })
    )

    // test order variance
    expect(
      apiRequestId({
        ...requestParams,
        headers: {
          'X-Authorization': 'x-token',
          'Content-Type': 'application/json'
        }
      })
    ).toEqual(
      apiRequestId({
        ...requestParams,
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': 'x-token'
        }
      })
    )
  })

  it('serializes response type', () => {
    const requestParams: ApiRequestParams = {
      method: 'GET',
      url: '/endpoint',
      responseType: null
    }

    expect(apiRequestId(requestParams)).toEqual(
      apiRequestId({
        ...requestParams,
        responseType: null
      })
    )

    expect(
      apiRequestId({
        ...requestParams,
        responseType: 'json'
      })
    ).toEqual(
      apiRequestId({
        ...requestParams,
        responseType: 'json'
      })
    )

    expect(
      apiRequestId({
        ...requestParams,
        responseType: 'blob'
      })
    ).not.toEqual(
      apiRequestId({
        ...requestParams,
        responseType: 'json'
      })
    )
  })

  it('serializes success codes', () => {
    for (const successCodes of [null, undefined]) {
      const requestParams: ApiRequestParams = {
        url: '/endpoint'
      }

      expect(apiRequestId(requestParams)).toEqual(
        apiRequestId({
          ...requestParams,
          successCodes
        })
      )
    }

    const requestParams: ApiRequestParams = {
      url: '/endpoint',
      successCodes: [200, 201]
    }

    for (const successCodes of [[], [200], [201], [200, 201, 202]]) {
      expect(apiRequestId(requestParams)).not.toEqual(
        apiRequestId({
          ...requestParams,
          successCodes
        })
      )
    }

    for (const successCodes of [
      [200, 201],
      [201, 200],
      [200, null, 201, null]
    ]) {
      expect(apiRequestId(requestParams)).toEqual(
        apiRequestId({
          ...requestParams,
          successCodes
        })
      )
    }
  })

  it('serializes an extra key', () => {
    const requestParams: ApiRequestParams = {
      method: 'GET',
      url: '/endpoint'
    }

    for (const extraKey of [null, undefined]) {
      expect(apiRequestId(requestParams)).toEqual(
        apiRequestId({
          ...requestParams,
          extraKey
        })
      )
    }

    expect(
      apiRequestId({
        ...requestParams,
        extraKey: 'test'
      })
    ).toEqual(
      apiRequestId({
        ...requestParams,
        extraKey: 'test'
      })
    )

    for (const extraKey of ['', 'one']) {
      expect(apiRequestId(requestParams)).not.toEqual(
        apiRequestId({
          ...requestParams,
          extraKey
        })
      )
    }
  })
})

test('applyHeaders', () => {
  const prevHeaders = {'content-type': 'application/json'}
  expect(applyHeaders(prevHeaders, {})).not.toBe(prevHeaders) // ensure it doesn't mutate original headers

  // no change
  expect(applyHeaders(prevHeaders, {})).toEqual(prevHeaders)

  // new header
  expect(applyHeaders(prevHeaders, {'x-authorization': 'x-token'})).toEqual({
    'content-type': 'application/json',
    'x-authorization': 'x-token'
  })

  // override existing header
  expect(applyHeaders(prevHeaders, {'content-type': 'text/plain'})).toEqual({
    'content-type': 'text/plain'
  })
})

test('cloneHeaders', () => {
  expect(cloneHeaders({'content-type': 'text/plain'})).toEqual({
    'content-type': 'text/plain'
  })
  // shouldn't be the same obj
  expect(cloneHeaders({})).not.toBe({})
})
