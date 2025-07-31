// Basic Jest setup file for simple tests

// Global fetch mock
global.fetch = jest.fn();

// React Native globals
global.__DEV__ = false;

// Mock Alert
global.Alert = {
  alert: jest.fn(),
};

// Console error suppression for expected warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: Animated: `useNativeDriver`'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
