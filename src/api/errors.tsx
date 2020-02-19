import {ApiResponseType, ResponseBody} from './typings'

/**
 * Thrown if a value doesn't exist in the cache
 */
export class ApiCacheMissError extends Error {}

/**
 * Thrown if a non-200 status response is received
 */
export class ApiError<T extends ResponseBody> extends Error {
  public status: number

  public responseBody: T

  public responseType: ApiResponseType

  constructor(status: number, responseBody: T, responseType?: ApiResponseType) {
    super(`API Error: ${status}`)
    this.responseBody = responseBody
    this.status = status
    this.responseType = responseType
  }
}
