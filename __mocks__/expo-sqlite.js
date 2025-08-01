/* global jest */

const mockSQLite = {
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => callback({
      executeSql: jest.fn(),
    })),
    close: jest.fn(),
  })),
  deleteDatabase: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ size: 0, exists: true })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
};

export default mockSQLite; 