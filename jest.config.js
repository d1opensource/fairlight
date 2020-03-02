module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
      diagnostics: {
        warnOnly: true
      }
    }
  },

  testEnvironment: 'jsdom',
  setupFiles: ['./setup-jest.js'],
  setupFilesAfterEnv: ['./setup-jest-after-env.tsx'],
  collectCoverageFrom: ['./src/**/*.tsx']
}
