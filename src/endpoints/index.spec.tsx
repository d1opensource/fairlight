import {
  ApiParam,
  HttpEndpoints,
  IEndpointCreateRequestInit,
  RestEndpoints
} from './'

describe('HttpEndpoints', () => {
  class Endpoints extends HttpEndpoints {
    static basePath = '/base'

    static GET(init: Omit<IEndpointCreateRequestInit, 'body'>) {
      return super._get('/endpoint', init)
    }

    static POST(init: IEndpointCreateRequestInit = {}) {
      return super._post('/endpoint', init)
    }

    static PUT(init: IEndpointCreateRequestInit = {}) {
      return super._put('/endpoint', init)
    }

    static PATCH(init: IEndpointCreateRequestInit = {}) {
      return super._patch('/endpoint', init)
    }

    static DELETE(init: IEndpointCreateRequestInit = {}) {
      return super._delete('/endpoint', init)
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

  describe('trailing slash', () => {
    test('applying trailing slash to each url', () => {
      ;(Endpoints as any).trailingSlash = true

      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(Endpoints[method]()).toEqual({
          method,
          url: '/base/endpoint/'
        })
      }
    })
  })
})

describe('RestEndpoints', () => {
  interface IModel {
    name: string
  }

  class Endpoints extends RestEndpoints {
    static basePath = '/base'

    static list(query?: {limit?: number}) {
      return super._list(query)
    }

    static create(body: IModel) {
      return super._create(body)
    }

    static findById(id: ApiParam) {
      return super._findById(id)
    }

    static update(id: ApiParam, body: Partial<IModel>) {
      return super._update(id, body)
    }

    static partialUpdate(id: ApiParam, body: Partial<IModel>) {
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
