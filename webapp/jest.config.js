module.exports = {
  preset: 'jest-puppeteer',
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  projects: [
    {
      displayName: 'unit',

      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1',  // alias '@'
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/src/tests/**/*.js'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': '@swc/jest',
      },
    },
    {
       displayName: 'e2e',
       globalSetup:'<rootDir>/e2e/test-environment-setup.js',
       globalTeardown:'<rootDir>/e2e/teardown.js',
       setupFilesAfterEnv: [
           '<rootDir>/e2e/setup.js',
           'expect-puppeteer'
       ],
       testMatch: ['<rootDir>/e2e/steps/*.js'],
    },
  ],
};