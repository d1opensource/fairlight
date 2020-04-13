import * as libExports from './'

test('lib exports', () => {
  expect(libExports).toBeTruthy()

  const expectedExports = [
    'Api',
    'ApiCacheMissError',
    'ApiError',
    'useApi',
    'useApiQuery',
    'useApiMutation',
    'ApiContext',
    'ApiProvider',
    'HttpEndpoints',
    'RestEndpoints'
  ]

  for (const expectedExport of expectedExports) {
    expect(libExports).toHaveProperty(expectedExport)
  }
})
