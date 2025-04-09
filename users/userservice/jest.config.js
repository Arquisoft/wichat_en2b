export default {
    transform: {
        "^.+\\.js$": "babel-jest",
        "^.+\\.mjs$": "babel-jest",
    },
    transformIgnorePatterns: ["/node_modules/"],
    testEnvironment: 'node',
    globals: {
        'ts-jest': {
          useESM: true,
        },
    },
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"]
};
