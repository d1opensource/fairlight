module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['./setup-jest.tsx'],
  setupFilesAfterEnv: ['./setup-jest-after-env.tsx'],
  collectCoverageFrom: ['./src/**/*.tsx']
}
