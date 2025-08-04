/* global jest */

const mockCamera = {
  CameraType: {
    front: 'front',
    back: 'back',
  },
  FlashMode: {
    on: 'on',
    off: 'off',
    auto: 'auto',
    torch: 'torch',
  },
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  openSettingsAsync: jest.fn(() => Promise.resolve()),
};

export default mockCamera;
