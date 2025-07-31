module.exports = {
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: false, assets: [] })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: false, assets: [] })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
  ImagePickerResult: {
    cancelled: false,
    assets: [],
  },
}; 