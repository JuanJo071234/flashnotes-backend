module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',

    collectCoverageFrom: [
        'src/**/*.js',
        '!src/app.js',
        '!src/config/**',
    ],

    testMatch: [
        '**/tests/**/*.test.js'
    ],

    setupFilesAfterEnv: ['./tests/setup.js'],

    verbose: true,
    testTimeout: 30000
};
