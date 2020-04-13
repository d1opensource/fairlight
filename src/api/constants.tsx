import {ApiRequestFetchPolicy, ApiRequestMethod} from './typings'

/**
 * Fetch policies which will return the cached value (if exists)
 */
export const READ_CACHE_POLICIES: ApiRequestFetchPolicy[] = [
  'cache-first',
  'cache-only',
  'cache-and-fetch'
]

export const DEFAULT_FETCH_POLICY: ApiRequestFetchPolicy = 'no-cache'

export const DEFAULT_REQUEST_METHOD: ApiRequestMethod = 'GET'
