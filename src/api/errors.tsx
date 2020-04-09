import {ApiRequestMethod, ApiResponseType, ResponseBody} from './typings'

/**
 * Thrown if a value doesn't exist in the cache
 */
export class ApiCacheMissError extends Error {}

/**
 * Thrown if a response is received with an incorrect status code.
 */
export class ApiError<
  T extends ResponseBody | null = ResponseBody
> extends Error {
  public method: ApiRequestMethod

  public url: string

  public status: number

  public responseBody: T | null

  public responseType?: ApiResponseType | null

  constructor(
    method: ApiRequestMethod,
    url: string,
    status: number,
    responseBody: T,
    responseType?: ApiResponseType | null
  ) {
    super(`API Error: \`${method} ${url}\` failed with status ${status}`)
    this.method = method
    this.url = url
    this.responseBody = responseBody
    this.status = status
    this.responseType = responseType
  }
}
