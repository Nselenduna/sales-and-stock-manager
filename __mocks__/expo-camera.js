module.exports = {
  CameraType: {
    front: 'front',
    back: 'back',
  },
  FlashMode: {
    on: 'on',
    off: 'off',
    auto: 'auto',
  },
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMicrophonePermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getMicrophonePermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
}; 