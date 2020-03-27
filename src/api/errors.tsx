import {ApiResponseType, ResponseBody} from './typings'

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
  public status: number

  public responseBody: T

  public responseType?: ApiResponseType | null

  constructor(
    status: number,
    responseBody: T,
    responseType?: ApiResponseType | null
  ) {
    super(`API Error: ${status}`)
    this.responseBody = responseBody
    this.status = status
    this.responseType = responseType
  }
}
