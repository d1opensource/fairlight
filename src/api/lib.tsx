import EventEmitter from 'eventemitter3'

import {DEFAULT_REQUEST_METHOD} from './constants'
import {ApiHeaders, ApiRequestMethod, ApiRequestParams} from './typings'

/**
 * Returns an id represent the request parameters.
 *
 * This is used to identify the request for caching and other purposes.
 */
export function getParamsId(
  params: ApiRequestParams<ApiRequestMethod>
): string {
  return JSON.stringify([
    params.method || DEFAULT_REQUEST_METHOD,
    params.url,
    params.responseType || '',
    serializeHeaders(params.headers),
    params.extraKey,
    serializeSuccessCodes(params.successCodes)
  ])
}

function serializeHeaders(paramHeaders?: ApiHeaders): string {
  if (!paramHeaders) {
    return ''
  }

  const headers = applyHeaders({}, paramHeaders)

  const headerPairs: string[] = []

  for (const [key, value] of Object.entries(headers)) {
    headerPairs.push(`${key}:${value};`)
  }

  headerPairs.sort()

  return headerPairs.join('')
}

function serializeSuccessCodes(successCodes?: number[]): string {
  if (!successCodes) {
    return ''
  }

  const serializedCodes = uniqueCodes(
    successCodes.filter((code) => typeof code === 'number')
  )

  serializedCodes.sort()

  return JSON.stringify(serializedCodes)
}

function uniqueCodes(codes: number[]): number[] {
  return codes.filter((value, index, self) => self.indexOf(value) === index)
}

/**
 * Given an origin ApiHeaders object and ApiHeaders object,
 * returns a new ApiHeaders object with the new headers applied.
 */
export function applyHeaders(prevHeaders: ApiHeaders, headers: ApiHeaders) {
  const nextHeaders = cloneHeaders(prevHeaders)

  for (const key of Object.keys(headers)) {
    nextHeaders[key.toLowerCase()] = headers[key]
  }

  return nextHeaders
}

export function cloneHeaders(headers: ApiHeaders): ApiHeaders {
  return {...headers}
}

export function genCacheUpdateEvent(
  params: ApiRequestParams<ApiRequestMethod>
) {
  return `cacheUpdate.${getParamsId(params)}`
}

/**
 * Adds an event listener to the given emitter using the provided event key.
 *
 * Returns an "unsubscribe" function that will remove the listener once called.
 *
 * @param emitter Event emitter to subscribe to
 * @param event Event key
 * @param listener Event listener
 */
export function createSubscription(
  emitter: EventEmitter,
  event: string,
  listener: (...args: any[]) => void
): () => void {
  emitter.on(event, listener)

  return () => {
    emitter.off(event, listener)
  }
}
