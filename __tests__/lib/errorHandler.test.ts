/**
 * Error Handler Tests
 * 
 * Tests for the centralized error handling utility
 */

import { Alert } from 'react-native';
import {
  errorHandler,
  handleError,
  createNetworkError,
  createValidationError,
  createPermissionError,
  createStorageError,
  createSyncError,
  AppError,
} from '../../lib/errorHandler';

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Clear error logs and reset mocks
    errorHandler.clearLogs();
    mockAlert.mockClear();
    jest.clearAllMocks();
  });

  describe('Error Creation', () => {
    it('should create a network error with correct properties', () => {
      const error = createNetworkError('Connection failed', {
        component: 'TestComponent',
      });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('NETWORK');
      expect(error.message).toBe('Connection failed');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.context?.component).toBe('TestComponent');
    });

    it('should create a validation error with correct properties', () => {
      const error = createValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('VALIDATION');
      expect(error.message).toBe('Invalid input');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(false);
    });

    it('should create a permission error with correct properties', () => {
      const error = createPermissionError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('PERMISSION');
      expect(error.message).toBe('Access denied');
      expect(error.recoverable).toBe(false);
      expect(error.retryable).toBe(false);
    });

    it('should create a storage error with correct properties', () => {
      const originalError = new Error('Disk full');
      const error = createStorageError('Storage failed', undefined, originalError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('STORAGE');
      expect(error.message).toBe('Storage failed');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.originalError).toBe(originalError);
    });

    it('should create a sync error with correct properties', () => {
      const error = createSyncError('Sync conflict', {
        action: 'syncData',
      });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('SYNC');
      expect(error.message).toBe('Sync conflict');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.context?.action).toBe('syncData');
    });
  });

  describe('Error Handling', () => {
    it('should handle string errors', () => {
      handleError('Something went wrong', {
        component: 'TestComponent',
      });

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('UNKNOWN');
      expect(logs[0].message).toBe('Something went wrong');
      expect(logs[0].context?.component).toBe('TestComponent');
    });

    it('should handle JavaScript Error objects', () => {
      const jsError = new Error('JavaScript error');
      handleError(jsError, {
        component: 'TestComponent',
        action: 'testAction',
      });

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].originalError).toBe(jsError);
      expect(logs[0].context?.component).toBe('TestComponent');
      expect(logs[0].context?.action).toBe('testAction');
    });

    it('should handle AppError objects', () => {
      const appError = createNetworkError('Network failed', {
        component: 'NetworkComponent',
      });
      
      handleError(appError, {
        action: 'additionalContext',
      });

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('NETWORK');
      expect(logs[0].context?.component).toBe('NetworkComponent');
      expect(logs[0].context?.action).toBe('additionalContext');
    });

    it('should show user feedback by default', () => {
      handleError('Test error');

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    });

    it('should not show alert when showAlert is false', () => {
      handleError('Test error', undefined, { showAlert: false });

      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('should include retry button for retryable errors', () => {
      const retryCallback = jest.fn();
      const networkError = createNetworkError('Connection failed');
      
      handleError(networkError, undefined, {
        retryCallback,
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Connection Error',
        'Please check your internet connection and try again.',
        expect.arrayContaining([
          { text: 'Retry', onPress: retryCallback },
        ])
      );
    });

    it('should include fallback button when provided', () => {
      const fallbackCallback = jest.fn();
      
      handleError('Test error', undefined, {
        fallbackCallback,
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.',
        expect.arrayContaining([
          { text: 'Use Offline Mode', onPress: fallbackCallback },
        ])
      );
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('network timeout');
      handleError(networkError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('NETWORK');
    });

    it('should classify permission errors correctly', () => {
      const permissionError = new Error('unauthorized access');
      handleError(permissionError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('PERMISSION');
    });

    it('should classify storage errors correctly', () => {
      const storageError = new Error('AsyncStorage failed');
      handleError(storageError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('STORAGE');
    });

    it('should classify sync errors correctly', () => {
      const syncError = new Error('sync conflict detected');
      handleError(syncError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('SYNC');
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('invalid input provided');
      handleError(validationError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('VALIDATION');
    });

    it('should default to unknown for unclassifiable errors', () => {
      const unknownError = new Error('some random error');
      handleError(unknownError);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].type).toBe('UNKNOWN');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with timestamps', () => {
      const beforeTime = new Date().toISOString();
      handleError('Test error');
      const afterTime = new Date().toISOString();

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context?.timestamp).toBeDefined();
      const logTimestamp = logs[0].context?.timestamp || '';
      expect(logTimestamp >= beforeTime).toBe(true);
      expect(logTimestamp <= afterTime).toBe(true);
    });

    it('should maintain error logs up to max size', () => {
      // Add more than max size errors
      for (let i = 0; i < 105; i++) {
        handleError(`Error ${i}`, undefined, { showAlert: false });
      }

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(100); // Max size
      // Should keep the most recent errors
      expect(logs[logs.length - 1].message).toBe('Error 104');
    });

    it('should not log when logError is false', () => {
      handleError('Test error', undefined, { logError: false });

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(0);
    });

    it('should clear logs when requested', () => {
      handleError('Error 1', undefined, { showAlert: false });
      handleError('Error 2', undefined, { showAlert: false });

      expect(errorHandler.getErrorLogs()).toHaveLength(2);

      errorHandler.clearLogs();

      expect(errorHandler.getErrorLogs()).toHaveLength(0);
    });
  });

  describe('Error Statistics', () => {
    it('should provide accurate error statistics', () => {
      // Add various error types
      handleError(createNetworkError('Network 1'), undefined, { showAlert: false });
      handleError(createNetworkError('Network 2'), undefined, { showAlert: false });
      handleError(createValidationError('Validation 1'), undefined, { showAlert: false });
      handleError(createStorageError('Storage 1'), undefined, { showAlert: false });

      const stats = errorHandler.getErrorStats();

      expect(stats['NETWORK']).toBe(2);
      expect(stats['VALIDATION']).toBe(1);
      expect(stats['STORAGE']).toBe(1);
      expect(stats['PERMISSION']).toBe(0);
      expect(stats['SYNC']).toBe(0);
      expect(stats['UNKNOWN']).toBe(0);
    });

    it('should return zero counts for unused error types', () => {
      const stats = errorHandler.getErrorStats();

      const errorTypes = ['NETWORK', 'VALIDATION', 'PERMISSION', 'STORAGE', 'SYNC', 'UNKNOWN'];
      errorTypes.forEach(type => {
        expect(stats[type as keyof typeof stats]).toBe(0);
      });
    });
  });

  describe('User-Friendly Messages', () => {
    it('should show network-specific message for network errors', () => {
      const networkError = createNetworkError('Connection failed');
      handleError(networkError);

      expect(mockAlert).toHaveBeenCalledWith(
        'Connection Error',
        'Please check your internet connection and try again.',
        expect.any(Array)
      );
    });

    it('should show permission-specific message for permission errors', () => {
      const permissionError = createPermissionError('Access denied');
      handleError(permissionError);

      expect(mockAlert).toHaveBeenCalledWith(
        'Access Denied',
        'Permission denied. Please check your access rights.',
        expect.any(Array)
      );
    });

    it('should show storage-specific message for storage errors', () => {
      const storageError = createStorageError('Storage failed');
      handleError(storageError);

      expect(mockAlert).toHaveBeenCalledWith(
        'Storage Error',
        'Unable to save data locally. Please check device storage.',
        expect.any(Array)
      );
    });

    it('should show sync-specific message for sync errors', () => {
      const syncError = createSyncError('Sync failed');
      handleError(syncError);

      expect(mockAlert).toHaveBeenCalledWith(
        'Sync Error',
        'Sync error occurred. Changes will be saved locally and synced later.',
        expect.any(Array)
      );
    });

    it('should show original message for validation errors', () => {
      const validationError = createValidationError('Name is required');
      handleError(validationError);

      expect(mockAlert).toHaveBeenCalledWith(
        'Validation Error',
        'Name is required',
        expect.any(Array)
      );
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable errors correctly', () => {
      const retryableErrors = [
        new Error('network timeout'),
        new Error('connection failed'),
        new Error('server error'),
      ];

      retryableErrors.forEach(error => {
        errorHandler.clearLogs();
        handleError(error, undefined, { showAlert: false });
        const logs = errorHandler.getErrorLogs();
        expect(logs[0].retryable).toBe(true);
      });
    });

    it('should identify non-retryable errors correctly', () => {
      const nonRetryableErrors = [
        createValidationError('Invalid input'),
        createPermissionError('Access denied'),
      ];

      nonRetryableErrors.forEach(error => {
        errorHandler.clearLogs();
        handleError(error, undefined, { showAlert: false });
        const logs = errorHandler.getErrorLogs();
        expect(logs[0].retryable).toBe(false);
      });
    });
  });

  describe('Context Merging', () => {
    it('should merge context from AppError and handle call', () => {
      const appError = createNetworkError('Network failed', {
        component: 'OriginalComponent',
        metadata: { originalData: 'test' },
      });

      handleError(appError, {
        action: 'additionalAction',
        metadata: { additionalData: 'more' },
      }, { showAlert: false });

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].context?.component).toBe('OriginalComponent');
      expect(logs[0].context?.action).toBe('additionalAction');
      expect(logs[0].context?.metadata).toEqual({
        originalData: 'test',
        additionalData: 'more',
      });
    });

    it('should prefer handle context over AppError context for overlapping fields', () => {
      const appError = createNetworkError('Network failed', {
        component: 'OriginalComponent',
      });

      handleError(appError, {
        component: 'OverrideComponent',
      }, { showAlert: false });

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].context?.component).toBe('OverrideComponent');
    });
  });
});