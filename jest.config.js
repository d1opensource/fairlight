module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['./setup-jest.js'],
  setupFilesAfterEnv: ['./setup-jest-after-env.js'],
  collectCoverageFrom: ['./src/**/*.tsx']
}
