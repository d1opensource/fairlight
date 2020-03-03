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
  - [Caching](#caching)
    - [How cache data is keyed](#how-cache-data-is-keyed)
    - [Using the cache when requesting data](#using-the-cache-when-requesting-data)
    - [Writing to the cache directly](#writing-to-the-cache-directly)
  - [Dependent queries](#dependent-queries)
  - [Re-fetching a query](#re-fetching-a-query)
  - [Custom response body parsing](#custom-response-body-parsing)
  - [Custom query string serialization](#custom-query-string-serialization)
  - [Setting default headers (ie. an auth token) for all requests](#setting-default-headers-ie-an-auth-token-for-all-requests)
  - [Error handling](#error-handling)
  - [Typescript](#typescript)
- [Usage with Redux](#usage-with-redux)
- [Comparison to similar libraries](#comparison-to-similar-libraries)
- [API Documentation](#api-documentation)
  - [`Api`](#api)
    - [`Constructor`](#constructor)
    - [`request(params, opts)`](#requestparams-opts)
    - [`requestInProgress()`](#requestinprogress)

## Motivation

At [d1g1t](https://github.com/d1g1tinc), we make over 400 REST API calls in our enterprise investment advisor platform. Over time, as we started using React hooks and wanted to introduce caching optimizations, it was clear that we needed to overhaul our internal REST API fetching library to use patterns that scale with our app.

`restii` synthesizes patterns from other libraries, such as [`apollo-client`](https://www.apollographql.com/docs/react/), [`swp`](https://github.com/zeit/swr), and [`react-query`](https://github.com/tannerlinsley/react-query). The primary difference is that it's specifically designed for making HTTP calls to your API. It allows you to request API data with URL paths, query parameters, request bodies, and HTTP headers. The caching layer will deterministically map these HTTP request parameters to response bodies, allowing the user to easily query their API and defer caching logic to `restii`.

Since it works well for d1g1t's purposes, we decided to open-source the library to help others who are building a REST API-consuming React application.

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

  static requestPasswordReset(id, resetToken, body) {
    return super._post(`/users/${id}`, {
      body,
      headers: {'x-reset-token': resetToken}
    })
  }
}
```

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

### Caching

#### How cache data is keyed

TODO explain how requests are deterministically keyed for caching (without request body)

#### Using the cache when requesting data

TODO explain how to use `fetchPolicy`

#### Writing to the cache directly

TODO

### Dependent queries

TODO

### Re-fetching a query

TODO

### Custom response body parsing

TODO

### Custom query string serialization

TODO

### Setting default headers (ie. an auth token) for all requests

TODO

### Error handling

TODO

### Typescript

TODO

## Usage with Redux

TODO

## Comparison to similar libraries

TODO: add comparisons to `react-query`/`swr`, `rest-hooks`, `apollo-graphql` (with `apollo-link-rest`)

## API Documentation

### `Api`

#### `Constructor`

Example:

```tsx
import {Api} from 'restii'

const api = new Api({
  // All fields are optional
  baseUrl: 'http://your-api.com/api',
  defaultFetchPolicy: 'fetch-first',
  serializeRequestJson: (body) => camelize(body),
  serializeRequestJson: (body) => snakify(body)
})
```

Constructor fields:

| Field                                                                                                | Description                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `baseUrl?: string`                                                                                   | Base URL of the API. This will prefix all requests.                                                                     |
| `defaultFetchPolicy?: 'no-cache' | 'cache-first' | 'fetch-first' | 'cache-only' | 'cache-and-fetch'` | Base URL of the API. This will prefix all requests.                                                                     |
| `serializeRequestJson?(body: object): object`                                                        | When provided, all JSON request bodies will be run through this transformation function before the API request.         |
| `parseResponseJson?(body: object): object`                                                           | When provided, all JSON response bodies will be run through this transformation function before returning the response. |

#### `request(params, opts)`

Example:

```tsx
const user = await api.request({
  // Required fields
  url: '/users',

  // Optional fields
  method: 'POST',
  body: {name: 'Example User',}
  headers: {'x-user-id': '12345'},
  responseType: 'json'
})
```

`params` fields:

| Field                                                                                                    | Description                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url: string`                                                                                            | Path to request, relative to the `baseUrl` provided to the constructor.                                                                                                                              |
| `method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`                                                   | HTTP method for the request. Defaults to `GET` if not provided.                                                                                                                                      |
| `body?: object | string | Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array>` | HTTP request body. If a plain JS object is passed, the `Content-Type: 'application/json'` header will automatically be set.                                                                          |
| `method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`                                                   | HTTP method for the request. Defaults to `GET` if not provided.                                                                                                                                      |
| `responseType?: 'json' | 'text' | 'blob'`                                                                | Expected response body format. If provided, the response body will be parsed to the provided format. If not passed, the response body type will be inferred from the `Content-Type` response header. |
| `extraKey?: string`                                                                                      | An additional key to be serialized into the caching key.                                                                                                                                             |

`opts` fields:

| Field                                                                                         | Description                                                                              |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `fetchPolicy?: 'no-cache' | 'cache-first' | 'fetch-first' | 'cache-only' | 'cache-and-fetch'` | The fetch policy to use for the request (ie. how to interact with the cache, if at all). |
| `deduplicate?: 'no-cache' | 'cache-first' | 'fetch-first' | 'cache-only' | 'cache-and-fetch'` | The fetch policy to use for the request (ie. how to interact with the cache).            |

Returns:

The response body: `Promise<object | Blob | string>`

#### `requestInProgress()`
