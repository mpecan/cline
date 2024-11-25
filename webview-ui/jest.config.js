/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^styled-components$': require.resolve('./src/test-utils/styled-components-mock.js')
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json',
            diagnostics: false
        }]
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@vscode/webview-ui-toolkit|@microsoft/fast-react-wrapper)/)'
    ],
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testEnvironmentOptions: {
        url: 'http://localhost'
    },
    verbose: true,
    testTimeout: 10000,
    globals: {
        'ts-jest': {
            isolatedModules: true
        }
    }
};
