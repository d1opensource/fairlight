import {ApiError} from '../errors'
import {ApiRequestMethod, ApiResponseType, ResponseBody} from '../typings'

export interface IRequestFetcherParams {
  url: string
  method: ApiRequestMethod
  body?: BodyInit
  headers?: Headers
  responseType?: ApiResponseType
}

export interface IRequestFetcher {
  getResponse(
    params: IRequestFetcherParams
  ): Promise<{responseBody: ResponseBody; responseType: ApiResponseType}>
}

/**
 * Is called by the `RequestManager` to make the request over the network.
 *
 * Responsible for:
 * - Throwing ApiErrors for non-200 level errors
 * - Parsing response bodies
 */
export class ApiRequestFetcher implements IRequestFetcher {
  getResponse = async (
    params: IRequestFetcherParams
  ): Promise<{responseBody: ResponseBody; responseType: ApiResponseType}> => {
    const request = this.createRequest(params)
    const response = await fetch(request)
    const {responseBody, responseType} = await this.parseResponseBody(
      response,
      params
    )

    if (!response.ok) {
      throw new ApiError(response.status, responseBody, responseType)
    }

    return {responseBody, responseType}
  }

  /**
   * Generates a `Request` instance to be passed directly to `fetch`
   */
  private createRequest(params: IRequestFetcherParams): Request {
    return new Request(params.url, {
      method: params.method,
      body: params.body,
      headers: params.headers
    })
  }

  /**
   * Parses response body from `fetch`'s `Response`
   */
  private async parseResponseBody(
    response: Response,
    params: IRequestFetcherParams
  ): Promise<{responseBody: ResponseBody; responseType: ApiResponseType}> {
    const responseType =
      params.responseType ||
      this.inferResponseTypeUsingContentType(
        response.headers.get('Content-Type')
      )

    if (!responseType) {
      return {responseBody: null, responseType: null}
    }

    const responseBody = await (() => {
      switch (responseType) {
        case 'json':
          return response.json()
        case 'text':
          return response.text()
        case 'blob':
          return response.blob()
        default:
          throw new TypeError(`'${responseType}' is not a valid response type`)
      }
    })()

    return {responseBody, responseType}
  }

  /**
   * Attempts to infer the response type for parsing using the
   * 'Content-Type' header
   */
  private inferResponseTypeUsingContentType(
    contentType: string
  ): ApiResponseType {
    if (!contentType) {
      return null
    }

    if (contentType === 'application/json') {
      return 'json'
    }

    if (
      ['application/', 'image/', 'video/'].some((prefix) =>
        contentType.startsWith(prefix)
      )
    ) {
      return 'blob'
    }

    if (contentType.startsWith('text/')) {
      return 'text'
    }

    return null
  }
}
