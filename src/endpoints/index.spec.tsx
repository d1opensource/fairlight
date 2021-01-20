import {
  ApiParam,
  EndpointCreateRequestInit,
  HttpEndpoints,
  RestEndpoints
} from './'

describe('HttpEndpoints', () => {
  class Endpoints extends HttpEndpoints {
    static basePath = '/base'

    static HEAD(init: Omit<EndpointCreateRequestInit, 'body'>) {
      return super._head('/endpoint', init)
    }

    static GET(init: Omit<EndpointCreateRequestInit, 'body'>) {
      return super._get('/endpoint', init)
    }

    static POST(init: EndpointCreateRequestInit = {}) {
      return super._post('/endpoint', init)
    }

    static PUT(init: EndpointCreateRequestInit = {}) {
      return super._put('/endpoint', init)
    }

    static PATCH(init: EndpointCreateRequestInit = {}) {
      return super._patch('/endpoint', init)
    }

    static DELETE(init: EndpointCreateRequestInit = {}) {
      return super._delete('/endpoint', init)
    }
  }

  test('endpoints by method', () => {
    for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
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

    for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]({headers})).toEqual({
        method,
        url: '/base/endpoint',
        headers
      })
    }
  })

  test('default query serialization', () => {
    const query = {
      str: 'string',
      num: 3,
      undefined,
      null: null,
      empty: '',
      zero: 0
    }

    for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]({query})).toEqual({
        method,
        url: '/base/endpoint?empty=&null=null&num=3&str=string&zero=0'
      })

      // ensure no `?` is appended if an empty {} is passed
      expect(Endpoints[method]({query: {}}).url).toEqual('/base/endpoint')
    }
  })

  test('extra key', () => {
    for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(Endpoints[method]({extraKey: 'test'})).toEqual({
        method,
        url: '/base/endpoint',
        extraKey: 'test'
      })
    }
  })

  describe('trailing slash', () => {
    test('applying trailing slash to each url', () => {
      ;(Endpoints as any).trailingSlash = true

      for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(Endpoints[method]()).toEqual({
          method,
          url: '/base/endpoint/'
        })
      }
    })
  })

  describe('trailing slash', () => {
    test('applying trailing slash to each url', () => {
      ;(Endpoints as any).trailingSlash = true

      for (const method of ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(Endpoints[method]()).toEqual({
          method,
          url: '/base/endpoint/'
        })
      }
    })
  })
})

describe('RestEndpoints', () => {
  interface Model {
    name: string
  }

  class Endpoints extends RestEndpoints {
    static basePath = '/base'

    static list(query?: {limit?: number}) {
      return super._list(query)
    }

    static create(body: Model) {
      return super._create(body)
    }

    static findById(id: ApiParam) {
      return super._findById(id)
    }

    static update(id: ApiParam, body: Partial<Model>) {
      return super._update(id, body)
    }

    static partialUpdate(id: ApiParam, body: Partial<Model>) {
      return super._partialUpdate(id, body)
    }

    static destroy(id: ApiParam) {
      return super._destroy(id)
    }
  }

  test('list', () => {
    expect(Endpoints.list()).toEqual({
      method: 'GET',
      url: '/base'
    })

    expect(Endpoints.list({limit: 5})).toEqual({
      method: 'GET',
      url: '/base?limit=5'
    })
  })

  test('create', () => {
    expect(Endpoints.create({name: 'test'})).toEqual({
      method: 'POST',
      url: '/base',
      body: {name: 'test'}
    })
  })

  test('findById', () => {
    expect(Endpoints.findById(3)).toEqual({
      method: 'GET',
      url: '/base/3'
    })
  })

  test('update', () => {
    expect(Endpoints.update(4, {name: 'test 2'})).toEqual({
      method: 'PUT',
      url: '/base/4',
      body: {name: 'test 2'}
    })
  })

  test('partialUpdate', () => {
    expect(Endpoints.partialUpdate(5, {name: 'test 2'})).toEqual({
      method: 'PATCH',
      url: '/base/5',
      body: {name: 'test 2'}
    })
  })

  test('delete', () => {
    expect(Endpoints.destroy(6)).toEqual({
      method: 'DELETE',
      url: '/base/6'
    })
  })

  test('pathToResource', () => {
    expect(Endpoints.pathToResource(7)).toEqual('/base/7')
  })
})
