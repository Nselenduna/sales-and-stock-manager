module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.config.jest.js' },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-safe-area-context|@expo|expo|@supabase|@react-native-community|expo-image-picker|expo-media-library|expo-modules-core|expo-camera|expo-barcode-scanner|expo-haptics|expo-sqlite|@testing-library|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-vector-icons)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react-native$': 'react-native-web',
    '^react-native/(.*)$': 'react-native-web/$1',
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-camera$': '<rootDir>/__mocks__/expo-camera.js',
    '^expo-barcode-scanner$': '<rootDir>/__mocks__/expo-barcode-scanner.js',
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.js',
    '^expo-media-library$': '<rootDir>/__mocks__/expo-media-library.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^@supabase/supabase-js$': '<rootDir>/__mocks__/supabase.js',
    '^./supabase$': '<rootDir>/__mocks__/supabase.js',
    '^../lib/supabase$': '<rootDir>/__mocks__/supabase.js',
    '^../../lib/supabase$': '<rootDir>/__mocks__/supabase.js',
  },
  collectCoverageFrom: [
    'screens/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.js',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  testTimeout: 10000,
  verbose: true,
};
