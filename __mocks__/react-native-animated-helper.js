/* global jest */

// Mock for react-native/Libraries/Animated/NativeAnimatedHelper
module.exports = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
};
