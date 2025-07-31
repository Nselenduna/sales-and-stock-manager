module.exports = {
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => callback({
      executeSql: jest.fn(),
    })),
    close: jest.fn(),
  })),
  deleteDatabase: jest.fn(),
  enableLogging: jest.fn(),
}; 