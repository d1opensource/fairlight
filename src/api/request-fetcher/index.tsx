import {
  ApiResponseType,
  RequestFetcher,
  RequestFetcherParams,
  RequestFetcherResponse
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
  ): Promise<RequestFetcherResponse> => {
    const request = this.createRequest(params)
    const response = await fetch(request)
    return this.parseResponseBody(response, params)
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
  ): Promise<RequestFetcherResponse> {
    const {status} = response

    const responseType =
      params.responseType ||
      this.inferResponseTypeUsingContentType(
        response.headers.get('Content-Type')
      )

    if (!responseType) {
      return {body: null, bodyType: null, status}
    }

    const body = await (() => {
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

    return {body: body, bodyType: responseType, status}
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
}
