module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            { tsconfig: 'tsconfig.json' },
        ],
    },
    testMatch: ['**/tests/**/*.test.ts'],
};