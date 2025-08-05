module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|@testing-library|react-native-*|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@shopify/flash-list|expo-.*)'
  ],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__mocks__/fileMock.js'
  },
  testEnvironment: 'node'
};