module.exports = {
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    testMatch: ["**/steps/*.js"],
    testTimeout: 30000,
    setupFilesAfterEnv: ["expect-puppeteer"]
}