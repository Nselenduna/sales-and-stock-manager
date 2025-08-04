/* eslint-env jest */
/* eslint-disable no-undef */
export default {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 'high',
    MAX: 'max',
  },
  AndroidNotificationPriority: {
    HIGH: 'high',
    DEFAULT: 'default',
  },
};