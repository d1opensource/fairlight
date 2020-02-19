/* eslint-disable no-dupe-class-members */

import {
  ApiHeaders,
  ApiRequestMethod,
  IApiRequestParams,
  RequestBody,
  ResponseBody
} from '../api/typings'

export type ApiQueryParams = Record<string, string | number | boolean>

export interface IEndpointCreateRequestInit {
  query?: ApiQueryParams
  headers?: ApiHeaders
  body?: RequestBody
}

export type ApiParam = string | number

/**
 * `HttpEndpoints` provides static utilities for implementing a set of
 * API endpoints which returns requests that can be passed to `api.request`.
 */
export class HttpEndpoints {
  /**
   * The base path to prefix all underlying requests.
   */
  protected static basePath = ''

  /**
   * Some REST APIs require that requests end with a trailing slash. (ie. `/users/` instead of `/users`)
   * If `true`, will ensure that a trailing `/` is added to each request.
   */
  protected static trailingSlash = false

  /**
   * Returns a new path by appending a given `relativePath` to `this.basePath`.
   */
  protected static buildPath(relativePath: string) {
    let builtPath = `${this.basePath}${relativePath}`

    if (this.trailingSlash && builtPath[builtPath.length - 1] !== '/') {
      builtPath += '/'
    }

    return builtPath
  }

  /**
   * Creates a `GET` request.
   *
   * @param path A path relative to the base path.
   * @param requestInit Additional request parameters.
   */
  protected static get<TResponseBody extends ResponseBody = ResponseBody>(
    path: string,
    requestInit?: Omit<IEndpointCreateRequestInit, 'body'>
  ) {
    return this.createRequest<'GET', TResponseBody>('GET', path, requestInit)
  }

  /**
   * Creates a `POST` request.
   *
   * @param path A path relative to the base path.
   * @param requestInit Additional request parameters.
   */
  protected static post<TResponseBody extends ResponseBody = ResponseBody>(
    path: string,
    requestInit?: IEndpointCreateRequestInit
  ) {
    return this.createRequest<'POST', TResponseBody>('POST', path, requestInit)
  }

  /**
   * Creates a `PUT` request.
   *
   * @param path A path relative to the base path.
   * @param requestInit Additional request parameters.
   */
  protected static put<TResponseBody extends ResponseBody = ResponseBody>(
    path: string,
    requestInit?: IEndpointCreateRequestInit
  ) {
    return this.createRequest<'PUT', TResponseBody>('PUT', path, requestInit)
  }

  /**
   * Creates a `PATCH` request.
   *
   * @param path A path relative to the base path.
   * @param requestInit Additional request parameters.
   */
  protected static patch<TResponseBody extends ResponseBody = ResponseBody>(
    path: string,
    requestInit?: IEndpointCreateRequestInit
  ) {
    return this.createRequest<'PATCH', TResponseBody>(
      'PATCH',
      path,
      requestInit
    )
  }

  /**
   * Creates a `DELETE` request.
   *
   * @param path A path relative to the base path.
   * @param requestInit Additional request parameters.
   */
  protected static delete<TResponseBody extends ResponseBody = ResponseBody>(
    path: string,
    requestInit?: IEndpointCreateRequestInit
  ) {
    return this.createRequest<'DELETE', TResponseBody>(
      'DELETE',
      path,
      requestInit
    )
  }

  /**
   * Given an object of key-value pairs, will serialize the query parameters into a search string.
   * This is called internally when serializing the query parameters into the request `url`.
   *
   * To customize query parameter serialization, override this in your base class.
   */
  protected static serializeQuery(query: ApiQueryParams = {}): string {
    const queryWithoutEmptyValues = Object.entries(query).reduce(
      (prev, [key, value]) => {
        if (value !== undefined) {
          prev[key] = value
        }

        return prev
      },
      {}
    )

    const params = new URLSearchParams(
      queryWithoutEmptyValues as Record<string, string>
    )

    params.sort()

    return params.toString()
  }

  private static createRequest<
    TMethod extends ApiRequestMethod,
    TResponseBody extends ResponseBody = ResponseBody
  >(
    method: TMethod,
    path: string,
    requestInit: IEndpointCreateRequestInit = {}
  ): IApiRequestParams<TMethod, TResponseBody> {
    let url = this.buildPath(path)

    if (requestInit.query) {
      url += `?${this.serializeQuery(requestInit.query)}`
    }

    return {
      method,
      url,
      headers: requestInit.headers,
      body: requestInit.body
    } as IApiRequestParams<TMethod, TResponseBody>
  }
}

export const restful = (BaseEndpoints: typeof HttpEndpoints) =>
  class RestEndpoints extends BaseEndpoints {
    protected static collectionPath = ''

    protected static singlePath(id: ApiParam) {
      return dynamicPath('/:id', {id})
    }

    /**
     * Returns the path for a given resource id, as a convenience.
     */
    static pathToResource(id: ApiParam) {
      return this.buildPath(this.singlePath(id))
    }

    /**
     * Performs a `GET` at `/`, appending an optional `query`
     * @param query Query parameters
     */
    protected static list<TResponseBody extends ResponseBody = ResponseBody>(
      query?: ApiQueryParams
    ) {
      return this.get<TResponseBody>(this.collectionPath, {query})
    }

    /**
     * Performs a `POST` at `/`, using an optional request `body`
     */
    protected static create<TResponseBody extends ResponseBody = ResponseBody>(
      body?: RequestBody
    ) {
      return this.post<TResponseBody>(this.collectionPath, {body})
    }

    /**
     * Performs a `GET` at `/:id`
     */
    protected static findById<
      TResponseBody extends ResponseBody = ResponseBody
    >(id: ApiParam) {
      return this.get<TResponseBody>(this.singlePath(id))
    }

    /**
     * Performs a `PUT` at `/:id`, using an optional request `body`
     */
    protected static update<TResponseBody extends ResponseBody = ResponseBody>(
      id: ApiParam,
      body?: RequestBody
    ) {
      return this.put<TResponseBody>(this.singlePath(id), {body})
    }

    /**
     * Performs a `PATCH` at `/:id`, using an optional request `body`
     */
    protected static partialUpdate<
      TResponseBody extends ResponseBody = ResponseBody
    >(id: ApiParam, body?: RequestBody) {
      return this.patch<TResponseBody>(this.singlePath(id), {body})
    }

    /**
     * Performs a `DELETE` at `/:id`, using an optional request `body`
     */
    protected static delete(id: ApiParam, body?: RequestBody) {
      return this.delete(this.singlePath(id), {body})
    }
  }

/**
 * Applies colon-delimited path params to a given path pattern
 *
 * @param pattern Path pattern
 * @param params Path params
 *
 * @example `buildPath('/users/:id', { id: 4 })` => `/users/4`
 */
export function dynamicPath<TParamKey extends string>(
  pattern: string,
  params: Record<TParamKey, ApiParam>
) {
  return Object.entries(params).reduce((prev, [paramKey, paramValue]) => {
    return prev.replace(`:${paramKey}`, encodeURIComponent(String(paramValue)))
  }, pattern)
}
