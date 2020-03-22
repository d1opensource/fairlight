import {applyHeaders, cloneHeaders, getParamsId} from './lib'
import {ApiRequestParams} from './typings'

describe('getParamsId', () => {
  it('serializes basic requests', () => {
    const requestParams: ApiRequestParams = {
      method: 'GET',
      url: '/endpoint'
    }

    expect(getParamsId(requestParams)).toEqual(
      getParamsId({
        url: '/endpoint' // method defaults to GET
      })
    )

    expect(getParamsId(requestParams)).not.toEqual(
      getParamsId({
        ...requestParams,
        method: 'POST'
      })
    )

    expect(getParamsId(requestParams)).not.toEqual(
      getParamsId({
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
    expect(getParamsId(requestParams)).toEqual(
      getParamsId({
        ...requestParams,
        headers: null
      })
    )

    expect(getParamsId(requestParams)).toEqual(
      getParamsId({
        ...requestParams,
        headers: {}
      })
    )

    // ensure header modifies the paramsId
    expect(
      getParamsId({
        ...requestParams,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    ).not.toEqual(getParamsId(requestParams))

    // test capitalization variance
    expect(
      getParamsId({
        ...requestParams,
        headers: {
          'CONTENT-TYPE': 'application/json'
        }
      })
    ).toEqual(
      getParamsId({
        ...requestParams,
        headers: {
          'content-type': 'application/json'
        }
      })
    )

    // test order variance
    expect(
      getParamsId({
        ...requestParams,
        headers: {
          'X-Authorization': 'x-token',
          'Content-Type': 'application/json'
        }
      })
    ).toEqual(
      getParamsId({
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

    expect(getParamsId(requestParams)).toEqual(
      getParamsId({
        ...requestParams,
        responseType: null
      })
    )

    expect(
      getParamsId({
        ...requestParams,
        responseType: 'json'
      })
    ).toEqual(
      getParamsId({
        ...requestParams,
        responseType: 'json'
      })
    )

    expect(
      getParamsId({
        ...requestParams,
        responseType: 'blob'
      })
    ).not.toEqual(
      getParamsId({
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

      expect(getParamsId(requestParams)).toEqual(
        getParamsId({
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
      expect(getParamsId(requestParams)).not.toEqual(
        getParamsId({
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
      expect(getParamsId(requestParams)).toEqual(
        getParamsId({
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
      expect(getParamsId(requestParams)).toEqual(
        getParamsId({
          ...requestParams,
          extraKey
        })
      )
    }

    expect(
      getParamsId({
        ...requestParams,
        extraKey: 'test'
      })
    ).toEqual(
      getParamsId({
        ...requestParams,
        extraKey: 'test'
      })
    )

    for (const extraKey of ['', 'one']) {
      expect(getParamsId(requestParams)).not.toEqual(
        getParamsId({
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

describe('cloneHeaders', () => {
  expect(cloneHeaders({})).not.toBe({})
})
