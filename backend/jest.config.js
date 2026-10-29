export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};