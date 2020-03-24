import {ApiError} from '../errors'
import {
  ApiResponseType,
  RequestFetcher,
  RequestFetcherParams,
  ResponseBody
} from '../typings'

/**
 * Is called by the `RequestManager` to make the request over the network.
 *
 * Responsible for:
 * - Throwing ApiErrors for non-200 level errors
 * - Parsing response bodies
 */
export class ApiRequestFetcher implements RequestFetcher {
  getResponse = async (
    params: RequestFetcherParams
  ): Promise<{
    responseBody: ResponseBody | null
    responseType: ApiResponseType | null
  }> => {
    const request = this.createRequest(params)
    const response = await fetch(request)
    const {responseBody, responseType} = await this.parseResponseBody(
      response,
      params
    )

    this.maybeThrowApiError(params, response, responseBody, responseType)

    return {responseBody, responseType}
  }

  /**
   * Generates a `Request` instance to be passed directly to `fetch`
   */
  private createRequest(params: RequestFetcherParams): Request {
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
    params: RequestFetcherParams
  ): Promise<{
    responseBody: ResponseBody | null
    responseType: ApiResponseType | null
  }> {
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
    contentType: string | null
  ): ApiResponseType | null {
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

  /**
   * Throws `ApiError` if the response status does not match a passed success code.
   * If no success codes are passed and the fetch response is not 'ok', throws `ApiError`
   */
  private maybeThrowApiError(
    params: RequestFetcherParams,
    response: Response,
    responseBody: ResponseBody | null,
    responseType: ApiResponseType | null
  ): void {
    if (Array.isArray(params.successCodes)) {
      if (params.successCodes.every((code) => response.status !== code)) {
        throw new ApiError(response.status, responseBody, responseType)
      }
    } else if (!response.ok) {
      throw new ApiError(response.status, responseBody, responseType)
    }
  }
}
