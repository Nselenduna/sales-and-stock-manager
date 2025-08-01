/* global jest */

const mockBarCodeScanner = {
  Constants: {
    BarCodeType: {
      qr: 'qr',
      code128: 'code128',
      code39: 'code39',
      ean13: 'ean13',
      ean8: 'ean8',
      upc_a: 'upc_a',
      upc_e: 'upc_e',
    },
    Type: {
      front: 'front',
      back: 'back',
    },
  },
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scanFromURLAsync: jest.fn(() => Promise.resolve({ data: 'test-barcode' })),
};

export default mockBarCodeScanner; 