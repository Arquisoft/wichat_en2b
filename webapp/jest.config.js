module.exports = {
  preset: 'jest-puppeteer',
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
       setupFilesAfterEnv: ['expect-puppeteer'],
       testMatch: ['<rootDir>/e2e/**/*.js'],
    },
  ],
};