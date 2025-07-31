module.exports = {
  BarCodeScanner: {
    Constants: {
      Type: {
        front: 'front',
        back: 'back',
      },
    },
  },
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
}; 