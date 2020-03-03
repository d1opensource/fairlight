# restii

Energize your REST API 🌿 with React hooks and a centralized cache.

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/d1g1tinc/restii/build) ![Code Climate coverage](https://img.shields.io/codeclimate/coverage/d1g1tinc/restii) ![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/d1g1tinc/restii) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/restii) ![npm type definitions](https://img.shields.io/npm/types/restii) ![GitHub stars](https://img.shields.io/github/stars/d1g1tinc/restii?style=social)

**Features**:

- 🚀 A set of React hooks for querying HTTP API data
- 💾 Turnkey API response caching
- 🖇 Parallel request de-duplication
- 📡 Support for API requests and cache queries outside of React components (in sagas, thunks, etc.)
- 📥 Parses response bodies of any data type (`'json'`, `'blob'`, `'text'`)
- 💡 Designed with full Typescript support

**Contents**:

- [Motivation](#motivation)
- [Basic Usage](#basic-usage)
- [Installation & Setup](#installation--setup)
- [Guide](#guide)
  - [Response Cache](#response-cache)
    - [Interacting with the cache when requesting data](#interacting-with-the-cache-when-requesting-data)
    - [Using the cache directly](#using-the-cache-directly)
    - [How request cache keys are determined](#how-request-cache-keys-are-determined)
  - [Re-fetching a query](#re-fetching-a-query)
  - [Dependent queries](#dependent-queries)
  - [Custom response body parsing](#custom-response-body-parsing)
  - [Custom query string serialization](#custom-query-string-serialization)
  - [Setting default headers (ie. an auth token) for all requests](#setting-default-headers-ie-an-auth-token-for-all-requests)
  - [Error handling](#error-handling)
  - [Typescript](#typescript)
  - [Usage with Redux](#usage-with-redux)
- [Comparison to similar libraries](#comparison-to-similar-libraries)
- [API Documentation](#api-documentation)
  - [`useApiQuery(params: object, opts?: object)`](#useapiqueryparams-object-opts-object)
  - [`ApiProvider`](#apiprovider)
  - [`HttpEndpoints`](#httpendpoints)
  - [`RestEndpoints`](#restendpoints)
  - [`Api`](#api)
    - [`Constructor`](#constructor)
    - [`request(params: object, opts?: object)`](#requestparams-object-opts-object)
    - [`requestInProgress(params: object)`](#requestinprogressparams-object)
    - [`writeCachedResponse(params: object, responseBody?: Blob | object | string)`](#writecachedresponseparams-object-responsebody-blob--object--string)
    - [`readCachedResponse(params: object)`](#readcachedresponseparams-object)
    - [`onCacheUpdate(params: object, listener: Function)`](#oncacheupdateparams-object-listener-function)
    - [`setDefaultHeader(key: string, value: string)`](#setdefaultheaderkey-string-value-string)
    - [`onError(listener: Function)`](#onerrorlistener-function)

## Motivation

At [d1g1t](https://github.com/d1g1tinc), we make over 400 REST API calls in our enterprise investment advisor platform. Over time, as we started using React hooks and wanted to introduce caching optimizations, it was clear that we needed to overhaul our internal REST API fetching library to use patterns that scale with our app.

`restii` synthesizes patterns from other libraries, such as [`apollo-client`](https://www.apollographql.com/docs/react/), [`swp`](https://github.com/zeit/swr), and [`react-query`](https://github.com/tannerlinsley/react-query). The primary difference is that it's specifically designed for making HTTP calls to your API. It allows you to request API data with URL paths, query parameters, request bodies, and HTTP headers. The caching layer will deterministically map these HTTP request parameters to response bodies, allowing the user to easily query their API and defer caching logic to `restii`.

Since it works well for d1g1t's purposes, we decided to open-source the library to help others who are building REST API-consuming React applications.

## Basic Usage

Query your API (ex. fetching a user's profile):

```jsx
import React from 'react'
import {useApiQuery} from 'restii'

const MyComponent = (props) => {
  const [userQuery] = useApiQuery({url: `/users/${props.userId}`})

  if (userQuery.error) {
    // display error
  }

  if (userQuery.loading) {
    // display loading state
  }

  return <h1>{userQuery.data.firstName}</h1>
}
```

As you start adding more API requests, we strongly recommend organizing your request definitions into centralized "endpoint" classes, grouped by domain/resource.

Continuing our example, we'll create a `UserEndpoints` class to define endpoints under the `'/users'` base path. We'll subclass `restii#HttpEndpoints`, which gives us static HTTP helper methods:

```jsx
import {HttpEndpoints} from 'restii'

export class UserEndpoints extends HttpEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._get('', {query})
  }

  static create(body) {
    return super._post('', {body})
  }
}
```

_(All `HttpEndpoints` methods are documented [here](#httpendpoints))_

If your endpoints follow common REST-ful conventions, you can subclass `restii#RestEndpoints` (which subclasses `restii#HttpEndpoints`) to reduce REST boilerplate:

```jsx
import {RestEndpoints} from 'restii'

export class UserEndpoints extends RestEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._list(query)
  }

  static create(body) {
    return super._create(body)
  }

  static findById(id) {
    return super._findById(id)
  }

  static update(id, body) {
    return super._update(id, body)
  }

  static partialUpdate(id, body) {
    return super._partialUpdate(id, body)
  }

  static destroy(id) {
    return super._destroy(id)
  }
}
```

_(All `RestEndpoints` methods are documented [here](#restendpoints))_

Then you can use these endpoints to make queries:

```jsx
import React from 'react'
import {useApiQuery} from 'restii'

import {UserEndpoints} from 'my-app/endpoints'

const MyComponent = (props) => {
  const [usersQuery] = useApiQuery(UserEndpoints.list({limit: 10}))
  const [userQuery] = useApiQuery(UserEndpoints.findById(props.userId))
  // ... etc
}
```

To make one-off requests (ie. form submissions, deletions, etc), you can use the `Api` client instance directly:

```jsx
import React, {useState} from 'react'
import {useApi} from 'restii'

import {UserEndpoints} from 'my-app/endpoints'

const DeleteUser = (props) => {
  const api = useApi()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)

    try {
      await api.request(UserEndpoints.destroy(props.userId))
      // navigate to a different page, etc.
    } catch (error) {
      // handle error
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button type='button' onClick={handleDeleteUser} disabled={deleting}>
        Delete User
      </button>
    </>
  )
}
```

## Installation & Setup

Install the package as a dependency:

```bash
npm install --save restii

# or

yarn add restii
```

Create an `Api` instance and provide it to your app:

```jsx
import {Api, ApiProvider} from 'restii'

const api = new Api({
  // ↓ prefixes all request urls
  baseUrl: 'http://your-api.com'
})

const App = () => (
  <ApiProvider api={api}>{/* render your app here */}</ApiProvider>
)
```

You can now start defining endpoints and making requests in your app.

## Guide

### Response Cache

#### Interacting with the cache when requesting data

The caching functionality of `useApiQuery` is determined by its `fetchPolicy`. By default, this is set to `cache-and-fetch`: the first time you use `useApiQuery` for a given request, it will fetch the data and save it. The next time `useApiQuery` is used for that same request, the hook will return the cached response `data` and make a request for a fresh version, allowing the UI to display a value quickly to the user. This pattern is called [`stale-while-invalidate`](https://web.dev/stale-while-revalidate/).

This fetch policy can be overridden on a per-request:

```jsx
const [users] = useApiQuery(UserEndpoints.list(), {
  fetchPolicy: 'no-cache' // disables the cache altogether
})
```

Here are the possible fetch policies:

| Field             | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-cache`        | Only fetch from the server and never read from or write to the cache.                                                                                                                                                                                                                                                                                                                            |
| `cache-first`     | The request will first attempt to read from the cache.<br />If the data is cached, return the data and do not fetch.<br /> If the data isn't cached, make a fetch and then update the cache.                                                                                                                                                                                                     |
| `fetch-first`     | The request will fetch from the server, and then write the response to the cache.                                                                                                                                                                                                                                                                                                                |
| `cache-only`      | The request will _only_ read from the cache and never fetch from the server.<br />If the data does not exist, it will throw an `ApiCacheMissError`                                                                                                                                                                                                                                               |
| `cache-and-fetch` | The request will simultaneously read from the cache and fetch from the server.<br />If the data is in the cache, the promise will resolve with the cached results. Once the fetch resolves, it will update the cache and emit an event to notify listeners of the update.<br />If the data is not in the cache, the promise will resolve with the result of the fetch and then update the cache. |

If you'd like to override the default `fetchPolicy` for `useApiQuery`, you can pass a `defaultFetchPolicy` prop to `<ApiProvider />`:

```jsx
const App = () => (
  <ApiProvider api={api} defaultFetchPolicy='fetch-first'>
    {/* Render app */}
  </ApiProvider>
)
```

Similarly, you can pass a `fetchPolicy` when calling `api.request` directly:

```jsx
const users = await api.request(UserEndpoints.list(), {
  fetchPolicy: 'cache-only'
})
```

`api.request` has a default `fetchPolicy` of `fetch-first`, but can be overridden in the `Api` constructor:

```jsx
const api = new Api({defaultFetchPolicy: 'no-cache'})
```

#### Using the cache directly

It can be useful to read and write directly to and from the cache. For this, you can use `Api#readCachedResponse` and `Api#writeCachedResponse`. View the [API examples](#writecachedresponseparams-object-responsebody-blob--object--string) for usage.

#### How request cache keys are determined

Requests are keyed by a deterministic hash of its params. These properties include: `url`, `method`, `headers`, `responseType`, and `extrakEy`.

Note that the `body` is _not_ included in the cache key, so equivalent `POST` requests with different `body` would have the same cache key. In these instances, if you would like to utilize the cache, you can set an `extraKey` for that request. See the documentation for [`api.request`](#requestparams-object-opts-object) for more details.

### Re-fetching a query

Sometimes, it may be desirable to fetch a new query. This can be done using the `refetch()` action returned by the hook:

Example:

```jsx
const [users, usersQueryActions] = useApiQuery(UserEndpoints.list())

return (
  <button
    type='button'
    onClick={() => {
      usersQueryActions.refresh()
    }}
  >
    Refresh Users
  </button>
)
```

- If `deduplicate` is `true` for the query and there is currently a request in flight, it will not make an additional request. You can force a new fetch by passing a `deduplicate` option: `refresh({ deduplicate: false })`.
- If you want to reinitialize `data` to `null` when you call `refresh`, you can do so by passing a `reinitialize` option: `refresh({ reinitialize: true })`

Full documentation is available [here](#useapiqueryparams-object-opts-object).

### Dependent queries

If one query depends on data that isn't yet available, or on the results of another query, you can pass a falsy value to `useApiQuery`. `query.data` will be `null` and `query.loading` will be `false`.

Example:

```jsx
const [users] = useApiQuery(UserEndpoints.list({email: props.userEmail}))
const [friends, friendsQueryActions] = useApiQuery(
  users.data &&
    users.data.length > 0 &&
    UserProfileEndpoints.list(users.data[0].id)
)

// friends.data === null
// friends.loading === false

// note that `refetch` will be a NOOP at this time:
friendsQueryActions.refetch()
```

### Custom response body parsing

By default, responses will attempt to be parsed to `'json'`, `'text'`, or `'blob'` formats using the `Content-Type` header on the response:

| Pattern                           | Parsed Value |
| --------------------------------- | ------------ |
| `'application/json'`              | `'json'`     |
| `'text/*'`                        | `'text'`     |
| `'(application\|image\|video)/*'` | `'blob'`     |

However, you can manually specify the parse type by passing `responseType: 'json' | 'text' | 'blob'` to your request:

```jsx
class TransactionEndpoints extends HttpEndpoints {
  static basePath = '/transactions'

  static csvExport() {
    return super._get('/export.csv', {
      responseType: 'text'
    })
  }
}

const csv = await api.request(TransactionEndpoints.csvExport)

// typeof csv === 'string'
```

### Custom query string serialization

If you want to provide your own query string serialization, you can override `HttpEndpoints#_serializeQuery`.

Note that it may be useful to apply this logic to _all_ of your endpoints by creating a `BaseEndpoints` class and extending from that:

```jsx
import {qs} from 'qs'

class BaseEndpoints extends HttpEndpoints {
  static _serializeQuery(query) {
    return qs.stringify(query)
  }
}

class UserEndpoints extends BaseEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._get('/', {query}) // will use `qs.stringify`
  }
}
```

### Setting default headers (ie. an auth token) for all requests

A common use case is to pass an authentication token to requests after a user has logged in. This can be achieved using default headers:

```jsx
api.setDefaultHeader('X-Auth-Token', token)
```

Now, all of your queries will pass this additional header to requests.

### Error handling

Api requests can return two types of errors:

**ApiError**

If a request returns a non-200 status code, an `ApiError` is thrown. You can catch these errors and perform additional handling:

```jsx
import {ApiError} from 'restii'

try {
  await api.request(UserEndpoints.create({name: 'ExistingUser'}))
} catch (err) {
  if (
    error instanceof ApiError &&
    error.status === 400 &&
    error.responseBody?.code === '4120'
  ) {
    // handle error
    return
  }

  // bubble unexpected error up
  throw error
}
```

**ApiCacheMissError**

When making an Api request with `fetchPolicy: 'cache-only'`, and a cache value does not exist, an `ApiCacheMissError` will be thrown. While you _could_ handle this error by re-fetching over the network, you could simply just use `fetchPolicy: 'cache-and-fetch'` instead.

### Typescript

The library was internally written in Typescript and supports strong request/response typings.

Example:

```tsx
interface IUser {
  id: number
  firstName: string
  lastName: string
}

class UserEndpoints extends RestEndpoints {
  list(query?: {limit?: number; page?: number}) {
    return super._list<IUser[]>(query)
  }

  create(body?: Omit<IUser, 'id'>) {
    return super._create<IUser>(body)
  }
}

const users = await api.request(
  UserEndpoints.list({
    limit: 5,
    page: 2
  })
)

// `users` has type `IUser[]`

const user = await api.request(
  UserEndpoints.create({
    firstName: 'Jane',
    lastName: 'Doe'
  })
)

// `user` has type `IUser`
```

### Usage with Redux

While it is recommended to use the `useApiQuery` hook to make requests in your components, it's possible to make `Api` calls in your Redux middleware (ie. sagas, thunks):

**Usage with `redux-thunk`**:

When you instantiate your redux store, you can pass your `Api` client instance as an [extra argument](https://github.com/reduxjs/redux-thunk#injecting-a-custom-argument) to your thunk middleware:

```jsx
import {createStore, applyMiddleware} from 'redux'
import {Provider} from 'react-redux'
import thunk from 'redux-thunk'
import {Api} from 'restii'

const api = new Api()

const store = createStore(
  reducer,
  applyMiddleware(thunk.withExtraArgument({api}))
)

const App = () => (
  <Provider store={store}>
    <ApiProvider api={api}>{/* Render your app here */}</ApiProvider>
  </Provider>
)
```

Then you can make API calls in your thunks:

```jsx
const loadUsers = () => async (dispatch, getState, {api}) => {
  dispatch(userActions.request())
  try {
    const user = await api.request(UserEndpoints.list())
    dispatch(userActions.success(user))
  } catch (error) {
    dispatch(userActions.failure(error))
  }
}
```

**Usage with `redux-saga`**:

When you instantiate your saga middleware, you can pass your `Api` client instance to your sagas via [saga context](https://redux-saga.js.org/docs/api/).

The following example is likely be broken down into separate files, but is included in one example for simplicity:

```jsx
import {createStore, applyMiddleware} from 'redux'
import createSagaMiddleware from 'redux-saga'
import {Provider} from 'react-redux'
import {Api} from 'restii'

// define root saga
function* rootSaga(api) {
  // set `api` in the saga context
  yield setContext('api', api)
}

// create store with saga middleware
function createStore(api) {
  const sagaMiddleware = createSagaMiddleware()
  const store = createStore(reducer, applyMiddleware(sagaMiddleware))

  // pass api to root saga
  sagaMiddleware.run(rootSaga, api)
  return store
}

sagaMiddleware.run(rootSaga)

// create api and pass to `createStore`:
const api = new Api()
const store = createStore(api)

const App = () => (
  <Provider store={store}>
    <ApiProvider api={api}>{/* Render your app here */}</ApiProvider>
  </Provider>
)
```

Then you can make API calls in your sagas:

```jsx
function* loadUsers() {
  const api = yield getContext('api')
  yield put(userActions.request())
  try {
    const user = yield call(api.request, UserEndpoints.list())
    yield put(userActions.success(user))
  } catch (error) {
    yield put(userActions.failure(error))
  }
}
```

## Comparison to similar libraries

TODO: add comparisons to `react-query`/`swr`, `rest-hooks`, `apollo-graphql` (with `apollo-link-rest`)

## API Documentation

### `useApiQuery(params: object, opts?: object)`

<details><summary>Example</summary>

```jsx
import {useApiQuery} from 'restii'

const [user, userQueryActions] = useApiQuery(UserEndpoints.list(), {
  fetchPolicy: 'cache-and-fetch',
  deduplicate: true
})

const {data, loading, error} = user

// to refetch:
userQueryActions.refetch()

// to imperatively set the data:
userQueryActions.setData({id: 1, name: 'Jane'})
```

</details>

<details><summary>Details</summary>

`params` fields:

Standard request params. See [Api#request()](#requestparams-object-opts-object) for options.

`opts` fields:

| Field                                                                                             | Description                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | The fetch policy to use for the request. This is passed directly to `api.request` under the hood. By default, this is set to `cache-and-fetch` but can be overridden via `ApiProvider`                                                                                     |
| `deduplicate?: boolean`                                                                           | If `true`, will deduplicate equivalent requests, ensuring that it only runs once concurrently and returns an equal promise for each parallel call. This is `true` by default for `GET` requests, and `false` by default for `POST`, `PUT`, `PATCH`, and `DELETE` requests. |
| `dontReinitialize?: boolean`                                                                      | If true, will keep `data` from previous requests until new data is received (ie. it won't reinitialize to `null`).                                                                                                                                                         |

Returns `[queryData, queryActions]`:

`queryData` fields:

| Field                                    | Description                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `loading: boolean`                       | `true` if there is currently a `request` in-flight.                    |
| `data: object \| Blob \| string \| null` | The response body. Will `null` if none has been received yet.          |
| `error: Error \| null`                   | If an error occurs, will be the instance of the error that was thrown. |

`queryActions` fields:

| Field                                                                         | Description                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refetch: (opts?: { deduplicate?: boolean, reinitialize?: boolean }) => void` | When called, triggers a data refetch. You can manually override `deduplicate`, which uses the value passed to the hook by default. You can also set `reinitialize: true` to clear `data` (`false` by default) |
| `setData: (responseBody: object \| Blob \| string)`                           | Manually sets the response `data` of the hook. If `fetchPolicy` is not set to `no-cache`, it will store the response body in the cache as well.                                                               |

</details>

### `ApiProvider`

Provides an `Api` instance to a React app.

<details><summary>Example</summary>

```jsx
import {ApiProvider} from 'restii'

const api = new Api({baseUrl: 'http://your-api.com/api'})

const App = () => (
  <ApiProvider api={api} defaultFetchPolicy='cache-and-fetch'>
    {/* render app here */}
  </ApiProvider>
)
```

</details>

<details><summary>Details</summary>

`props`:

| Field                                                                                                    | Description                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `api: Api`                                                                                               | `Api` instance to provide to your app.                                                          |
| `defaultFetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | Sets the default `fetchPolicy` for all `useApiQuery()` requests. Defaults to `cache-and-fetch`. |

</details>

### `HttpEndpoints`

This class should be extended to provide your own endpoints for a given `basePath`.

<details><summary>Example</summary>

```jsx
class UserEndpoints extends HttpEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._get('', {query})
    // {method: 'GET', url: '/users?serializedQuery'}
  }

  static create(body) {
    return super._post('', {body})
    // {method: 'POST', url: '/users'}
  }

  static findById(id) {
    return super._get(`/${id}`)
    // {method: 'GET', url: `/users/${id}`}
  }

  static update(id, body) {
    return super._put(`/${id}`, {body})
    // {method: 'PUT', url: `/users/${id}`, body}
  }

  static partialUpdate(id, body) {
    return super._patch(`/${id}`, {body})
    // {method: 'PATCH', url: `/users/${id}`, body}
  }

  static destroy(id) {
    return super._delete(`/${id}`)
    // {method: 'DELETE', url: `/users/${id}`}
  }

  // ad-hoc, custom request:
  static requestPasswordReset(id, resetToken, body) {
    return super._post(`/users/${id}`, {
      body,
      headers: {'x-reset-token': resetToken}
    })
    // {method: 'POST', url: `/users/${id}`, headers: {'x-reset-token': resetToken}, body}
  }
}
```

</details>

<details><summary>Details</summary>

Static properties and methods:

| Field                                                               | Description                                                                                                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static basePath?: string`                                          | Base path of the resource. This will automatically prefix the `url` returned by each endpoint you define.                                                                        |
| `static trailingSlash?: boolean`                                    | If set to `true`, will append a trailing `/` at the end of each request. Eg. `/users/:id` will turn to `/users/:id/`. This is `false` by default).                               |
| `static _get?: (path: string, init?: RequestInit): RequestParams`   | Creates a `get` request for the given path. See below for `RequestInit` fields.                                                                                                  |
| `static _post: (path: string, init?: RequestInit): RequestParams`   | Creates a `post` request for the given path. See below for `RequestInit` fields.                                                                                                 |
| `static _put: (path: string, init?: RequestInit): RequestParams`    | Creates a `put` request for the given path. See below for `RequestInit` fields.                                                                                                  |
| `static _patch: (path: string, init?: RequestInit): RequestParams`  | Creates a `patch` request for the given path. See below for `RequestInit` fields.                                                                                                |
| `static _delete: (path: string, init?: RequestInit): RequestParams` | Creates a `delete` request for the given path. See below for `RequestInit` fields.                                                                                               |
| `static _serializeQuery: (query: object): string`                   | Serializes a `query` object passed to `RequestInit#query` into a search string. The default implementation uses `URLSearchParams`, but can be overrided in a subclass if needed. |

`RequestInit` fields:

| Field                                                                                                          | Description                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query?: { [key: string]: string \| number \| boolean }`                                                       | Query parameters. These will run through `_serializeQuery` and append to the returned `url` as the search string.                                         |
| `headers?: { [key: string]: string }`                                                                          | Custom HTTP headers to pass to the request.                                                                                                               |
| `body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>` | HTTP request body (only for non-`GET` requests). If a plain JS object is passed, the `Content-Type: 'application/json'` header will automatically be set. |

</details>

### `RestEndpoints`

This class should be extended to provide your own endpoints for a given `basePath`. It provides RESTful methods that you can call to generate common requests (`list`, `create`, etc).

`RestEndpoints` extends `HttpEndpoints` and inherits all of its functionality.

<details><summary>Example</summary>

```jsx
class UserEndpoints extends HttpEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._get('', {query})
    // {method: 'GET', url: '/users?serializedQuery'}
  }

  static create(body) {
    return super._post('', {body})
    // {method: 'POST', url: '/users'}
  }

  static findById(id) {
    return super._get(`/${id}`)
    // {method: 'GET', url: `/users/${id}`}
  }

  static update(id, body) {
    return super._put(`/${id}`, {body})
    // {method: 'PUT', url: `/users/${id}`, body}
  }

  static partialUpdate(id, body) {
    return super._patch(`/${id}`, {body})
    // {method: 'PATCH', url: `/users/${id}`, body}
  }

  static destroy(id) {
    return super._delete(`/${id}`)
    // {method: 'DELETE', url: `/users/${id}`}
  }

  // ad-hoc, custom request:
  static requestPasswordReset(id, resetToken, body) {
    return super._post(`/users/${id}`, {
      body,
      headers: {'x-reset-token': resetToken}
    })
    // {method: 'POST', url: `/users/${id}`, headers: {'x-reset-token': resetToken}, body}
  }
}
```

</details>

<details><summary>Details</summary>

In addition to the methods inherited from [`HttpEndpoints`](#httpendpoints), `RestEndpoints` has the following static protected methods:

| Field                                                                                                                                                         | Description                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `static _list?: (query?: { [key: string]: string \| number \| boolean })`                                                                                     | `GET /?search` request. You can optionally pass query parameters to filter the results.                       |
| `static _create?: (body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>)`                             | `POST /` request. You can pass the request `body` as the first argument.                                      |
| `static _findById?: (id: string \| number)`                                                                                                                   | `GET /:id` request. The resource `id` is the first argument.                                                  |
| `static _update?: (id: string \| number, body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>)`       | `PUT /:id` request. The resource `id` is the first argument, and the request `body` is the second argument.   |
| `static _partialUpdate?: (id: string | number, body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>)` | `PATCH /:id` request. The resource `id` is the first argument, and the request `body` is the second argument. |
| `static _destroy?: (id: string \| number, body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>)`      | `DELETE /:id` request. The resource `id` is the first argument.                                               |

</details>

### `Api`

#### `Constructor`

<details><summary>Example</summary>

```jsx
import {Api} from 'restii'

const api = new Api({
  baseUrl: 'http://your-api.com/api',
  defaultFetchPolicy: 'fetch-first',
  serializeRequestJson: (body) => camelize(body),
  serializeRequestJson: (body) => snakify(body)
})
```

</details>

<details><summary>Details</summary>

Constructor fields:

| Field                                                                                                    | Description                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `baseUrl?: string`                                                                                       | Base URL of the API. This will prefix all requests.                                                                     |
| `defaultFetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | Sets the default `fetchPolicy` for all `api.request` calls. Defaults to `fetch-first`.                                  |
| `serializeRequestJson?(body: object): object`                                                            | When provided, all JSON request bodies will be run through this transformation function before the API request.         |
| `parseResponseJson?(body: object): object`                                                               | When provided, all JSON response bodies will be run through this transformation function before returning the response. |

</details>

#### `request(params: object, opts?: object)`

Makes an API request and returns the parsed response body.

<details><summary>Example</summary>

```jsx
// Recommended usage with endpoints:
const user = await api.request(UserEndpoints.list(), {
  fetchPolicy: 'no-cache',
  deduplicate: true // true by default for `GET` requests
})

// Full API:
const user = await api.request({
  // Required fields:
  url: '/users',

  // Optional fields:
  method: 'POST',
  body: {name: 'Example User',}
  headers: {'x-user-id': '12345'},
  responseType: 'json',
  extraKey: 'extra_cache_key'
}, {
  fetchPolicy: 'no-cache',
  deduplicate: true
})
```

</details>

<details><summary>Details</summary>

`params` fields:

| Field                                                                                                          | Description                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url: string`                                                                                                  | URL path for the request. This will be appended to the `baseUrl` which was passed to the `Api` constructor.                                                                                          |
| `method?: 'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'`                                                     | HTTP method for the request. Defaults to `GET` if not provided.                                                                                                                                      |
| `headers?: { [key: string]: string }`                                                                          | An object of key-value headers for the request.                                                                                                                                                      |
| `body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>` | HTTP request body. If a plain JS object is passed, the `Content-Type: 'application/json'` header will automatically be set.                                                                          |
| `responseType?: 'json' \| 'text' \| 'blob'`                                                                    | Expected response body format. If provided, the response body will be parsed to the provided format. If not passed, the response body type will be inferred from the `Content-Type` response header. |
| `extraKey?: string`                                                                                            | An additional key to be serialized into the caching key.                                                                                                                                             |

`opts` fields:

| Field                                                                                             | Description                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | The fetch policy to use for the request (ie. how to interact with the cache, if at all).                                                                                                                                                                                   |
| `deduplicate?: boolean`                                                                           | If `true`, will deduplicate equivalent requests, ensuring that it only runs once concurrently and returns an equal promise for each parallel call. This is `true` by default for `GET` requests, and `false` by default for `POST`, `PUT`, `PATCH`, and `DELETE` requests. |

Returns `Promise<object | Blob | string>`:

The response body.

</details>

#### `requestInProgress(params: object)`

If `true`, indicates that an equivalent matching request is currently in progress.

<details><summary>Example</summary>

```jsx
const user = await api.requestInProgress(UserEndpoints.list())
```

</details>

<details><summary>Details</summary>

`params` fields:

Standard request params. See [Api#request()](#requestparams-object-opts-object) for options.

Returns:

`boolean`

</details>

#### `writeCachedResponse(params: object, responseBody?: Blob | object | string)`

Sets the cached response body for a given set of request params.

<details><summary>Example</summary>

```jsx
const user = await api.writeCachedResponse(UserEndpoints.list(), [
  {id: 1, name: 'Jane'},
  {id: 2, name: 'Joe'}
])
```

</details>

<details><summary>Details</summary>

`params` fields:

Standard request params. See [Api#request()](#requestparams-object-opts-object) for options.

`responseBody`:

The response body to cache.

</details>

#### `readCachedResponse(params: object)`

Reads a response directly from the cache.

The main reason you would use this over `Api#request` with a cached fetch policy is that this runs synchronously.

Note that if there is a cache miss, it will return `undefined`.

<details><summary>Example</summary>

```jsx
const user = api.readCachedResponse(UserEndpoints.findById(3))
```

</details>

<details><summary>Details</summary>

`params` fields:

Standard request params. See [Api#request()](#requestparams-object-opts-object) for options.

Returns `object | Blob | string`:

The cached response body, or `undefined` on cache miss.

</details>

#### `onCacheUpdate(params: object, listener: Function)`

Subscribes to cache updates for a given param's response.

<details><summary>Example</summary>

```jsx
const unsubscribe = api.onCacheUpdate(UserEndpoints.list(), (users) => {
  // handle updated `users` in cache
})

// invoke returned function to unsubscribe:
unsubscribe()
```

</details>

<details><summary>Details</summary>

`params` fields:

Standard request params. See [Api#request()](#requestparams-object-opts-object) for options.

`listener: (responseBody: object | blob | string) => void`

Invoked when the cache updates for the given request params.

Returns `() => void`:

A function that, when called, unsubscribes the listener.

</details>

#### `setDefaultHeader(key: string, value: string)`

Sets a default header that is passed to all requests.

<details><summary>Example</summary>

```jsx
api.setDefaultHeader('X-Auth-Token', '123456')
```

</details>

#### `onError(listener: Function)`

Subscribes to Api errors. This is useful for error reporting or to handle an invalid auth token by logging out.

<details><summary>Example</summary>

```jsx
import {ApiError} from 'restii'

api.onError((error) => {
  // handle error
})

// invoke returned function to unsubscribe:
unsubscribe()
```

</details>

<details><summary>Details</summary>

`listener: (error: Error) => void`

Invoked when an error occurred. It's likely an instance of `ApiError` for a non-200 status code.

Returns `() => void`:

A function that, when called, unsubscribes the listener.

</details>
