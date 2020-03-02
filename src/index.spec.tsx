import * as libExports from './'

test('lib exports', () => {
  expect(libExports).toBeTruthy()

  const expectedExports = [
    'Api',
    'ApiCacheMissError',
    'ApiError',
    'useApi',
    'useApiQuery',
    'withApi',
    'ApiContext',
    'ApiProvider',
    'HttpEndpoints',
    'RestEndpoints',
    'dynamicPath'
  ]

  for (const expectedExport of expectedExports) {
    expect(libExports).toHaveProperty(expectedExport)
  }
})
