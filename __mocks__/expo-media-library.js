/* global jest */

const mockMediaLibrary = {
  MediaType: {
    photo: 'photo',
    video: 'video',
    audio: 'audio',
    unknown: 'unknown',
  },
  SortBy: {
    creationTime: 'creationTime',
    modificationTime: 'modificationTime',
    mediaType: 'mediaType',
    width: 'width',
    height: 'height',
    duration: 'duration',
  },
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getAssetsAsync: jest.fn(() => Promise.resolve({ assets: [] })),
  createAssetAsync: jest.fn(() => Promise.resolve({ id: 'test-asset' })),
  deleteAssetsAsync: jest.fn(() => Promise.resolve()),
  getAssetInfoAsync: jest.fn(() => Promise.resolve({ uri: 'test-uri' })),
};

export default mockMediaLibrary; 