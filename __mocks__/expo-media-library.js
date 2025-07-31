module.exports = {
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  createAssetAsync: jest.fn(() => Promise.resolve({ id: 'mock-asset-id' })),
  getAssetsAsync: jest.fn(() => Promise.resolve({ assets: [] })),
  getAssetInfoAsync: jest.fn(() => Promise.resolve({})),
}; 