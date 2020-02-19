import {HttpEndpoints,IEndpointCreateRequestInit} from '../';

describe('HttpEndpoints', () => {
  class Endpoints extends HttpEndpoints {
    static basePath = '/base'

    static GET(init: Omit<IEndpointCreateRequestInit, 'body'>) {
      return super.get('/endpoint', init)
    }

    static POST(init: IEndpointCreateRequestInit = {}) {
      return super.post('/endpoint', init)
    }

    static PUT(init: IEndpointCreateRequestInit = {}) {
      return super.put('/endpoint', init)
    }

    static PATCH(init: IEndpointCreateRequestInit = {}) {
      return super.patch('/endpoint', init)
    }

    static DELETE(init: IEndpointCreateRequestInit = {}) {
      return super.delete('/endpoint', init)
    }
  }

  test('endpoints by method', () => {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]()).toEqual({
        method,
        url: '/base/endpoint'
      })
    }
  })

  test('request body', () => {
    const body = {test: 'body'}

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]({body})).toEqual({
        method,
        url: '/base/endpoint',
        body
      })
    }
  })

  test('request headers', () => {
    const headers = {test: 'body'}

    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]({headers})).toEqual({
        method,
        url: '/base/endpoint',
        headers
      })
    }
  })

  describe('query', () => {
    test('default query serialization', () => {
      const query = {
        str: 'string',
        num: 3,
        undefined,
        null: null,
        empty: '',
        zero: 0
      }

      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(Endpoints[method]({query})).toEqual({
          method,
          url: '/base/endpoint?empty=&null=null&num=3&str=string&zero=0'
        })
      }
    })
  })
})
