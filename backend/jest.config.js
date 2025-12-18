/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../shared/$1'
    },
    moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
