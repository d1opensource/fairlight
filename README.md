# fairlight

Illuminate your REST API 💡 with React hooks and a centralized cache.

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/d1g1tinc/fairlight/build)](https://github.com/d1g1tinc/fairlight/actions?query=branch%3Amaster) [![Code Climate coverage](https://img.shields.io/codeclimate/coverage/d1g1tinc/fairlight)](https://codeclimate.com/github/d1g1tinc/fairlight) [![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/d1g1tinc/fairlight)](https://codeclimate.com/github/d1g1tinc/fairlight) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/fairlight)](https://bundlephobia.com/result?p=fairlight@latest) ![npm type definitions](https://img.shields.io/npm/types/fairlight)

```tsx
const [{data, loading, error}] = useApiQuery({url: `/users/${id}`})
```

**Features**:

- 🚀 React hook for querying HTTP API data
- 💾 Turnkey API response caching
- 🖇 Parallel request de-duplication
- 📡 Support for API requests and cache queries outside of React components (in redux sagas, thunks, etc.)
- 📥 Parses response bodies of any data type (`'json'`, `'blob'`, `'text'`)
- 🗞 Compatible with almost any REST API
- 🌳 Exports tree-shakable ES modules
- ![TS](./typescript.svg) Designed with full [Typescript](https://www.typescriptlang.org/) support

**Contents**:

- [Installation & Setup](#installation--setup)
- [Basic Usage](#basic-usage)
- [Guide](#guide)
  - [Response Cache](#response-cache)
    - [Interacting with the cache when requesting data](#interacting-with-the-cache-when-requesting-data)
    - [Using the cache directly](#using-the-cache-directly)
    - [How request cache keys are determined](#how-request-cache-keys-are-determined)
  - [Re-fetching a query](#re-fetching-a-query)
  - [Dependent queries](#dependent-queries)
  - [Manually updating query data](#manually-updating-query-data)
  - [Custom response body parsing](#custom-response-body-parsing)
  - [Success response codes](#success-response-codes)
  - [Custom query string serialization](#custom-query-string-serialization)
  - [Setting default headers (ie. an auth token) for all requests](#setting-default-headers-ie-an-auth-token-for-all-requests)
  - [Testing](#testing)
  - [Error handling](#error-handling)
  - [Typescript](#typescript)
  - [Usage with Redux](#usage-with-redux)
  - [Server-side rendering (SSR)](#server-side-rendering-ssr)
- [Motivation](#motivation)
- [Comparison to similar libraries](#comparison-to-similar-libraries)
- [Feature Roadmap](#feature-roadmap)
- [API Documentation](#api-documentation)
  - [`useApiQuery(params: object, opts?: object)`](#useapiqueryparams-object-opts-object)
  - [`useApiMutation(params: object)`](#useapimutationparams-object)
  - [`ApiProvider`](#apiprovider)
  - [`HttpEndpoints`](#httpendpoints)
  - [`RestEndpoints`](#restendpoints)
  - [`Api`](#api)
    - [`Constructor`](#constructor)
    - [`baseUrl`](#baseurl)
    - [`request(params: object, opts?: object)`](#requestparams-object-opts-object)
    - [`requestInProgress(params: object)`](#requestinprogressparams-object)
    - [`writeCachedResponse(params: object, responseBody?: Blob | object | string)`](#writecachedresponseparams-object-responsebody-blob--object--string)
    - [`readCachedResponse(params: object)`](#readcachedresponseparams-object)
    - [`onCacheUpdate(params: object)`](#oncacheupdateparams-object)
    - [`setDefaultHeader(key: string, value: string)`](#setdefaultheaderkey-string-value-string)
    - [`onError`](#onerror)

## Installation & Setup

Install the package as a dependency:

```bash
npm install --save fairlight

# or

yarn add fairlight
```

Create an `Api` instance, add your API's `baseUrl`, and provide it to your app:

```jsx
import {Api, ApiProvider} from 'fairlight'

const api = new Api({
  // ↓ prefixes all request urls
  baseUrl: 'http://your-api.com'
})

const App = () => (
  <ApiProvider api={api}>{/* render your app here */}</ApiProvider>
)
```

You can now define endpoints and make requests in your app.

## Basic Usage

Query your API:

```jsx
import React from 'react'
import {useApiQuery} from 'fairlight'

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

As you add more API requests, we strongly recommend organizing your request definitions into centralized "endpoint" classes, grouped by domain/resource. This will help to encapsulate request-specific logic, reduce path-prefixing boilerplate, and automatically serialize query parameters.

Continuing our example, we'll create a `UserEndpoints` class to define endpoints under the `'/users'` base path. We'll subclass `HttpEndpoints`, which gives us static HTTP helper methods:

```jsx
import {HttpEndpoints} from 'fairlight'

export class UserEndpoints extends HttpEndpoints {
  static basePath = '/users'

  static list(query) {
    return super._get('', {query})
  }

  static create(body) {
    return super._post('', {body})
  }

  // etc.
}
```

_(All `HttpEndpoints` methods are documented [here](#httpendpoints))_

If your endpoints follow common REST-ful conventions, you can subclass `RestEndpoints` (which subclasses `HttpEndpoints`) to reduce REST boilerplate:

```jsx
import {RestEndpoints} from 'fairlight'

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
import {useApiQuery} from 'fairlight'

import {UserEndpoints} from 'my-app/endpoints'

const MyComponent = (props) => {
  const [usersQuery] = useApiQuery(UserEndpoints.list({limit: 10}))
  const [userQuery] = useApiQuery(UserEndpoints.findById(props.userId))
  // ... etc
}
```

To create an event handler for form submissions, deletions, etc., use the `useApiMutation` hook.

The hook takes a curried mutation handler which is passed the [`api`](#api) for making queries. It returns a mutation function and a `mutating` loading flag which you can use for a loading state.

```jsx
import React, {useState} from 'react'
import {useApiMutation} from 'fairlight'

import {UserEndpoints} from 'my-app/endpoints'

const CreateUserForm = (props) => {
  const [createUser, {mutating: creatingUser}] = useApiMutation({
    mutation: (firstName: string, lastName: string) => async (api) => {
      return api.request(UserEndpoints.create({firstName, lastName}))
    },
    onError: (error) => console.error(error),
    onSuccess: (user) => console.log(`Created user ${firstName}`)
  })

  return (
    <>
      {creatingUser && <LoadingSpinner />}
      <CreateUserForm
        onSubmit={(firstName, lastName) => {
          createUser(firstName, lastName)
        }}
      />
    </>
  )
}
```

_(`useApiMutation` API documentation is [here](#useapimutationparams-object))_

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

| Field             | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-cache`        | Only fetch from the server and never read from or write to the cache.                                                                                                                                                                                                                                                                                                                                              |
| `cache-first`     | The request will first attempt to read from the cache.<br />If the data is cached, return the data and do not fetch.<br /> If the data isn't cached, make a fetch and then update the cache.                                                                                                                                                                                                                       |
| `fetch-first`     | The request will fetch from the server, and then write the response to the cache.                                                                                                                                                                                                                                                                                                                                  |
| `cache-only`      | The request will _only_ read from the cache and never fetch from the server.<br />If the data does not exist, it will throw an `ApiCacheMissError`.                                                                                                                                                                                                                                                                |
| `cache-and-fetch` | The request will simultaneously read from the cache and fetch from the server.<br />If the data is in the cache, the promise will resolve with the cached results. Once the fetch resolves, it will update the cache in the background and emit an event to notify listeners of the update.<br />If the data is not in the cache, the promise will resolve with the result of the fetch and then update the cache. |

If you'd like to override the default `fetchPolicy` for `useApiQuery`, you can pass a `defaultFetchPolicies` prop to `<ApiProvider />`:

```jsx
const App = () => (
  <ApiProvider api={api} defaultFetchPolicies={{useApiQuery: 'fetch-first'}}>
    {/* Render app */}
  </ApiProvider>
)
```

Note that calling `api.request()` directly always defaults `fetchPolicy` to `'no-cache'`, but you can override this per-request if you'd like to interact with the cache.

#### Using the cache directly

It can be useful to read and write directly to and from the cache. For this, you can use `Api#readCachedResponse` and `Api#writeCachedResponse`. View the [API examples](#writecachedresponseparams-object-responsebody-blob--object--string) for usage.

#### How request cache keys are determined

Requests are keyed by a deterministic hash of its params. These properties include: `url`, `method`, `headers`, `responseType`, and `extraKey`.

Note that the `body` is _not_ included in the cache key, so equivalent `POST` requests with different `body` payloads would have the same cache key. In these instances, if you would like to utilize the cache, you can set an `extraKey` for that request. See the documentation for [`api.request`](#requestparams-object-opts-object) for more details.

### Re-fetching a query

Sometimes, it may be desirable to re-fetch the data in response to a user action. This can be done using the `refetch()` action returned by the hook:

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

- This will _always_ make a fetch to the user, no matter what `fetchPolicy` is.
- If `fetchPolicy: 'no-cache'` is passed to `useApiQuery`, the cache will _not_ be updated after the fetch completes. If `fetchPolicy` is set to anything else, the cache will be updated after the request completes.
- By default, `deduplicate` is always `false`, meaning it will always make a fresh request. You can override this by passing a `deduplicate` option: `refresh({ deduplicate: true })`.
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

// note that `refetch` will be a NOOP:
friendsQueryActions.refetch()
```

### Manually updating query data

`useApiQuery` returns a `setData` method which allows you to manually set the data stored by the hook (similar to [react#useState](https://reactjs.org/docs/hooks-reference.html#functional-updates)'s functional updates).

For example, suppose we have a query to get a user:

```tsx
const [user] = useApiQuery(UserEndpoints.findById(1))
```

Now, suppose we also have a mutation which updates a user. This API request happens to returns the updated user, so we can use `setData` to update our `useApiQuery` data with the most up-to-date user.

```tsx
const [user, userQueryActions] = useApiQuery(UserEndpoints.findById(1))

const [saveUser] = useApiMutation({
  mutation: (values) => (api) => {
    return api.request(UserEndpoints.partialUpdate(1, values))
  },

  onSuccess: (updatedUser) => {
    userQueryActions.setData(updatedUser)
    // ↑↑ this updates `user.data`
  },

  onError: (error) => {
    // etc
  }
})
```

Note: if `fetchPolicy` is not `no-cache`, this will persist directly to the response cache.

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

### Success response codes

By default, requests with response statuses in the `200`-range (200-299) will be considered successful, with anything outside of the range throwing an `ApiError`. If you'd like to customize the success statuses, you can set `successCodes`:

```tsx
class UserEndpoints extends HttpEndpoints {
  static basePath = '/users'

  static create(body) {
    return super._post('', {
      body,
      successCodes: [201]
    })
  }
}

await api.request(
  UserEndpoints.create({
    firstName: 'Jane',
    lastName: 'Doe'
  })
)
// ↑ any response status other than `201` will throw `ApiError`
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

### Testing

Currently, the recommended method of testing is to mock `fetch` at the source. [`jest-fetch-mock`](https://github.com/jefflau/jest-fetch-mock#readme) is a useful tool for this.

Here is an example of testing a `useApiQuery` using [`React Testing Library`](https://testing-library.com/docs/react-testing-library/intro):

```tsx
// Component file:
const MyComponent = (props) => {
  const [user] = useApiQuery({url: `/users/${id}`})

  if (user.error) {
    return <p>'An error occurred'</p>
  }

  if (user.loading) {
    return <p>'Loading ...'</p>
  }

  return <p>User: {user.firstName}</p>
}

// Test file:
import {render, waitFor, screen} from '@testing-library/react'

it('renders the user name', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({firstName: 'Thomas'}), {
    headers: {'content-type': 'application/json'}
  })

  const {getByText} = render(<MyComponent id />)
  await waitFor(() => getByText('User: Thomas'))
})
```

### Error handling

Api requests can return two types of errors:

**ApiError**

If a request returns a non-200 status code, an `ApiError` is thrown. You can catch these errors and perform additional handling:

```jsx
import {ApiError} from 'fairlight'

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

When making an Api request with `fetchPolicy: 'cache-only'`, and a cache value does not exist, an `ApiCacheMissError` will be thrown. In cases where you want to handle this error by re-fetching over the network, you could just use `fetchPolicy: 'cache-first'` which will make the fetch for you.

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

  patch(id: number, body: Partial<Omit<IUser, 'id'>>) {
    return super._update<IUser>(id, body)
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

const updatedUser = await api.request(
  UserEndpoints.patch(user.id, {
    firstName: 'Jane'
  })
)
// `updatedUser` has type `IUser`
```

### Usage with Redux

While it is recommended to use the `useApiQuery` hook to make requests in your components, it's possible to make `Api` calls in your Redux middleware (ie. sagas, thunks).

**Usage with `redux-thunk`**:

When you instantiate your redux store, you can pass your `Api` client instance as an [extra argument](https://github.com/reduxjs/redux-thunk#injecting-a-custom-argument) to your thunk middleware:

```jsx
import {createStore, applyMiddleware} from 'redux'
import {Provider} from 'react-redux'
import thunk from 'redux-thunk'
import {Api} from 'fairlight'

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
import {Api} from 'fairlight'

// define root saga
function* rootSaga(api) {
  // set `api` in the saga context
  yield setContext('api', api)
}

// create store with saga middleware
function createStore(api) {
  const sagaMiddleware = createSagaMiddleware()
  const store = createStore(reducer, applyMiddleware(sagaMiddleware))

  // pass `api` to root saga
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

### Server-side rendering (SSR)

This library uses `fetch` internally to make requests, so you'll need to globally polyfill `fetch` on the server. One popular option is [`isomorphic-unfetch`](https://www.npmjs.com/package/isomorphic-unfetch).

---

To make requests on the server (ex. using [`next.js`](https://nextjs.org/)), you can create an `api` instance and make requests with it:

```tsx
import {Api} from 'fairlight'
import {UserEndpoints} from 'my-app/endpoints'

const api = new Api()

// fetch data server-side:
export async function getServerSideProps(context) {
  const user = await api.request(UserEndpoints.findById(context.params.id))
  return {props: {user}}
}

// define your component:
const UserProfile = (props) => {
  // we can now use `props.user`
}

export default UserProfile
```

If you need to share an `api` instance across your server, you can create an `api` singleton file and import that into each file that needs it.

Note that instances of `useApiQuery` will return a `loading` flag for the initial render, and will _not_ run the request since it's performed in a `useEffect` hook. If you'd like to render data on the server and _also_ trigger a new fetch for the same endpoint using `useApiQuery`, you can pass `initialData` to the hook using the props passed by the server fetch:

```tsx
import {Api} from 'fairlight'
import {UserEndpoints} from 'my-app/endpoints'

const api = new Api()

export async function getServerSideProps(context) {
  const user = await api.request(UserEndpoints.findById(context.params.id))
  return {props: {user}}
}

const UserProfile = (props) => {
  const [user] = useApiQuery(UserEndpoints.findById(user.id), {
    initialData: props.user
  })
}

export default UserProfile
```

## Motivation

At [d1g1t](https://github.com/d1g1tinc), we make over 400 REST API calls in our enterprise investment advisor platform. Over time, as we started using React hooks and wanted to introduce caching optimizations, it was clear that we needed to overhaul our internal REST API fetching library to use patterns that scale with our app.

Since it works well for d1g1t's purposes, we decided to open-source the library to help others who are building REST API-consuming React applications.

## Comparison to similar libraries

`fairlight` synthesizes patterns from other libraries, such as [`apollo-client`](https://www.apollographql.com/docs/react/), [`swp`](https://github.com/zeit/swr), and [`react-query`](https://github.com/tannerlinsley/react-query). It mainly differs in that it's specifically designed for making HTTP calls to your API. It allows you to request API data with URL paths, query parameters, request bodies, and HTTP headers. The caching layer will deterministically map these HTTP request parameters to response bodies, allowing the user to easily query their API and defer caching logic to `fairlight`.

It's most similar to the out-of-the-box, batteries-included solution that `apollo-client` provides, but for REST rather than GraphQL.

## Feature Roadmap

Here is the current roadmap of features we have in mind:

- Suspense API [#11](https://github.com/d1g1tinc/fairlight/issues/11)
- Mutations & Optimistic responses [#28](https://github.com/d1g1tinc/fairlight/issues/28)
- Opt-in cache data normalization [#7](https://github.com/d1g1tinc/fairlight/issues/7)
- Cache redirects [#10](https://github.com/d1g1tinc/fairlight/issues/10)
- Polling mechanism [#9](https://github.com/d1g1tinc/fairlight/issues/9)
- Query pagination [#8](https://github.com/d1g1tinc/fairlight/issues/8)

Feedback is encouraged 🙂.

If you'd like to make a feature request, please [submit an issue](https://github.com/d1g1tinc/fairlight/issues).

## API Documentation

### `useApiQuery(params: object, opts?: object)`

<details><summary>Example</summary>

```jsx
import {useApiQuery} from 'fairlight'

const [user, userQueryActions] = useApiQuery(UserEndpoints.list(), {
  fetchPolicy: 'cache-and-fetch',
  deduplicate: true
})

const {data, loading, error} = user

// to refetch:
userQueryActions.refetch()

// to imperatively set the data:
userQueryActions.setData({id: 1, name: 'Jane'})
// setting the data using a function setter:
userQueryActions.setData((prev) => ({
  ...prev,
  name: 'Jane'
}))
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
| `useErrorBoundary?: boolean`                                                                      | If true, will throw on error that will bubble up to an error boundary. This is `false` by default, but can be overridden globally via `ApiProvider`.                                                                                                                       |

Returns `[queryData, queryActions]`:

`queryData` fields:

| Field                                    | Description                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `loading: boolean`                       | `true` if there is currently a `request` in-flight.                    |
| `data: object \| Blob \| string \| null` | The response body. Will `null` if none has been received yet.          |
| `error: Error \| null`                   | If an error occurs, will be the instance of the error that was thrown. |

`queryActions` fields:

| Field                                                                                          | Description                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refetch: (opts?: { deduplicate?: boolean, reinitialize?: boolean }) => void`                  | When called, triggers a data refetch. You can manually override `deduplicate`, which uses the value passed to the hook by default. You can also set `reinitialize: true` to clear `data` (`false` by default)                                           |
| `setData: (responseBody: object \| Blob \| string \| ((prev) => object \| Blob \| string \|))` | Manually sets the response `data` of the hook.<br />If `fetchPolicy` is not set to `no-cache`, it will store the response body in the cache as well.<br />If a function is passed to `setData`, the data can be set as a function of its previous data. |

</details>

### `useApiMutation(params: object)`

<details><summary>Example</summary>

```jsx
import {useApiQuery} from 'fairlight'

const [createUser, {creating: creatingUser}] = useApiMutation({
  mutation: (firstName: string, lastName: string) => (api) => {
    return api.request(UserEndpoints.create({firstName, lastName}))
  },
  onError: (error) => console.error(error)
  onSuccess: (user) => console.log(`Created user ${user.firstName}`)
})
```

</details>

<details><summary>Details</summary>

`params` fields:

| Field       | Description                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `mutation`  | The mutation function. The return value is called with an object containing all [`api`](#api) methods.  |
| `onError`   | Invoked if the mutation returns a rejected promise. This eliminates the need for a `try`/`catch` block. |
| `onSuccess` | Invoked if the mutation returns a resolved promise.                                                     |

Returns `[mutate, mutationData]`:

`mutate` function:

Invokes the mutation. This will call your provided `mutation` function with the `api` helpers. The `mutating` flag will be set to `true` while the mutation is occurring, and `false` once it completes.

`mutationData` fields:

| Field               | Description                                    |
| ------------------- | ---------------------------------------------- |
| `mutating: boolean` | `true` if a mutation is currently in progress. |

</details>

### `ApiProvider`

Provides an `Api` instance to a React app.

<details><summary>Example</summary>

```jsx
import {ApiProvider} from 'fairlight'

const api = new Api({baseUrl: 'http://your-api.com/api'})

const App = () => (
  <ApiProvider
    api={api}
    defaults={{
      useApiQuery: {
        fetchPolicy: 'cache-and-fetch'
      },
      useApiMutation: {
        fetchPolicy: 'fetch-first'
      }
    }}
  >
    {/* render app here */}
  </ApiProvider>
)
```

</details>

<details><summary>Details</summary>

`props`:

| Field              | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `api: Api`         | `Api` instance to provide to your app.                              |
| `defaults: object` | Sets the defaults to use for hooks. See below for possible options. |

`defaults` fields:

| Field                                                                                                             | Description                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `useApiQuery.fetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'`     | The `fetchPolicy` to use by default for the `useApiQuery` hook. Defaults to `cache-and-fetch` if not specified.                                 |
| `useApiQuery.useErrorBoundary?: boolean`                                                                          | The `useErrorBoundary` to use by default for the `useApiQuery` hook. Defaults to `true` if not specified.                                       |
| `useMutationQuery.fetchPolicy: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | The `fetchPolicy` to use by default for `api.request` calls within `useApiMutation` mutation handlers. Defaults to `no-cache` if not specified. |

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
import {Api} from 'fairlight'

const api = new Api({
  baseUrl: 'http://your-api.com/api',
  serializeRequestJson: (body) => camelize(body),
  serializeRequestJson: (body) => snakify(body)
})
```

</details>

<details><summary>Details</summary>

Constructor fields:

| Field                                         | Description                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `baseUrl?: string`                            | Base URL of the API. This will prefix all requests.                                                                     |
| `serializeRequestJson?(body: object): object` | When provided, all JSON request bodies will be run through this transformation function before the API request.         |
| `parseResponseJson?(body: object): object`    | When provided, all JSON response bodies will be run through this transformation function before returning the response. |

</details>

#### `baseUrl`

The `baseUrl` that was set via the `Api` constructor.

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
  successCodes: [200],
  extraKey: 'extra_cache_key'
}, {
  fetchPolicy: 'no-cache',
  deduplicate: true
})
```

</details>

<details><summary>Details</summary>

`params` fields:

| Field                                                                                                          | Description                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url: string`                                                                                                  | URL path for the request. This will be appended to the `baseUrl` which was passed to the `Api` constructor.                                                                                                                                                 |
| `method?: 'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'`                                                     | HTTP method for the request. Defaults to `GET` if not provided.                                                                                                                                                                                             |
| `headers?: { [key: string]: string }`                                                                          | An object of key-value headers for the request.                                                                                                                                                                                                             |
| `body?: object \| string \| Blob \| BufferSource \| FormData \| URLSearchParams \| ReadableStream<Uint8Array>` | HTTP request body. If a plain JS object is passed, the `Content-Type: 'application/json'` header will automatically be set.                                                                                                                                 |
| `responseType?: 'json' \| 'text' \| 'blob'`                                                                    | Expected response body format. If provided, the response body will be parsed to the provided format. If not passed, the response body type will be inferred from the `Content-Type` response header.                                                        |
| `successCodes?: number[]`                                                                                      | An array of status codes which determine if the request was successful. If the response is _not_ one of these status codes, an `ApiError` will be thrown. When this is not set, any status code in the `200` range (200-299) will be considered successful. |
| `extraKey?: string`                                                                                            | An additional key to be serialized into the caching key.                                                                                                                                                                                                    |

`opts` fields:

| Field                                                                                             | Description                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchPolicy?: 'no-cache' \| 'cache-first' \| 'fetch-first' \| 'cache-only' \| 'cache-and-fetch'` | The fetch policy to use for the request (ie. how to interact with the cache, if at all).                                                                                                                                                                                   |
| `deduplicate?: boolean`                                                                           | If `true`, will deduplicate equivalent requests, ensuring that it only runs once concurrently and returns an equal promise for each parallel call. This is `true` by default for `GET` requests, and `false` by default for `POST`, `PUT`, `PATCH`, and `DELETE` requests. |

Returns `Promise<object | Blob | string>`:

The response body.

</details>

#### `requestInProgress(params: object)`

Returns a boolean when, if `true`, indicates that an equivalent matching request is currently in progress.

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

#### `onCacheUpdate(params: object)`

Returns an observable which pushes each new response matching the given params.

<details><summary>Example</summary>

```jsx
const subscription = api.onCacheUpdate(UserEndpoints.list().subscribe((users) => {
  // handle updated `users` in cache
})

// invoke subscription's `unsubscribe` method to unsubscribe:
subscription.unsubscribe()
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

#### `onError`

An observable for each api error. This is useful for error reporting or to handle an invalid auth token by logging out.

<details><summary>Example</summary>

```jsx
import {ApiError} from 'fairlight'

const subscription = api.onError.subscribe((error) => {
  // handle error
})

// invoke subscription's `unsubscribe` method to unsubscribe:
subscription.unsubscribe()
```

</details>

<details><summary>Details</summary>

`listener: (error: Error) => void`

Invoked when an error occurred. It's likely an instance of `ApiError` for a non-200 status code.

Returns `() => void`:

A function that, when called, unsubscribes the listener.

</details>
