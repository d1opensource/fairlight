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
    const response = await fetch(params.url, {
      method: params.method,
      body: params.body,
      headers: params.headers
    })
    return this.parseResponseBody(response, params)
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

    return {body, bodyType: responseType, status}
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

    if (contentType.includes('application/json')) {
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
