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
  collectCoverageFrom: ['./src/**/*.tsx'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
}
