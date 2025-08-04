/**
 * Centralized Error Handling Utility
 * 
 * Provides consistent error handling, logging, and user feedback
 * across the Sales and Stock Manager application.
 */

import { Alert } from 'react-native';

export type ErrorType = 'NETWORK' | 'VALIDATION' | 'PERMISSION' | 'STORAGE' | 'SYNC' | 'UNKNOWN';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: ErrorContext;
  recoverable?: boolean;
  retryable?: boolean;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly context?: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.type = details.type;
    this.context = details.context;
    this.recoverable = details.recoverable ?? true;
    this.retryable = details.retryable ?? false;
    this.originalError = details.originalError;
  }
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  retryCallback?: () => void;
  fallbackCallback?: () => void;
}

class ErrorHandler {
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  /**
   * Handle errors with consistent logging and user feedback
   */
  public handle(
    error: Error | AppError | string,
    context?: ErrorContext,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showAlert = true,
      logError = true,
      retryCallback,
      fallbackCallback,
    } = options;

    // Normalize error to ErrorDetails
    const errorDetails = this.normalizeError(error, context);

    // Log the error
    if (logError) {
      this.logError(errorDetails);
    }

    // Show user feedback
    if (showAlert) {
      this.showUserFeedback(errorDetails, retryCallback, fallbackCallback);
    }
  }

  /**
   * Create a network error
   */
  public createNetworkError(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): AppError {
    return new AppError({
      type: 'NETWORK',
      message,
      context,
      originalError,
      recoverable: true,
      retryable: true,
    });
  }

  /**
   * Create a validation error
   */
  public createValidationError(
    message: string,
    context?: ErrorContext
  ): AppError {
    return new AppError({
      type: 'VALIDATION',
      message,
      context,
      recoverable: true,
      retryable: false,
    });
  }

  /**
   * Create a permission error
   */
  public createPermissionError(
    message: string,
    context?: ErrorContext
  ): AppError {
    return new AppError({
      type: 'PERMISSION',
      message,
      context,
      recoverable: false,
      retryable: false,
    });
  }

  /**
   * Create a storage error
   */
  public createStorageError(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): AppError {
    return new AppError({
      type: 'STORAGE',
      message,
      context,
      originalError,
      recoverable: true,
      retryable: true,
    });
  }

  /**
   * Create a sync error
   */
  public createSyncError(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): AppError {
    return new AppError({
      type: 'SYNC',
      message,
      context,
      originalError,
      recoverable: true,
      retryable: true,
    });
  }

  /**
   * Get error logs for debugging
   */
  public getErrorLogs(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Clear error logs
   */
  public clearLogs(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): Record<ErrorType, number> {
    const stats = {
      'NETWORK': 0,
      'VALIDATION': 0,
      'PERMISSION': 0,
      'STORAGE': 0,
      'SYNC': 0,
      'UNKNOWN': 0,
    } as Record<ErrorType, number>;

    this.errorLog.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }

  private normalizeError(
    error: Error | AppError | string,
    context?: ErrorContext
  ): ErrorDetails {
    if (error instanceof AppError) {
      const mergedContext = { ...error.context, ...context };
      // Merge metadata objects if both exist
      if (error.context?.metadata && context?.metadata) {
        mergedContext.metadata = { ...error.context.metadata, ...context.metadata };
      }
      
      return {
        type: error.type,
        message: error.message,
        originalError: error.originalError,
        context: mergedContext,
        recoverable: error.recoverable,
        retryable: error.retryable,
      };
    }

    if (error instanceof Error) {
      return {
        type: this.classifyError(error),
        message: error.message,
        originalError: error,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
        },
        recoverable: true,
        retryable: this.isRetryableError(error),
      };
    }

    return {
      type: 'UNKNOWN',
      message: String(error),
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      recoverable: true,
      retryable: false,
    };
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'NETWORK';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'PERMISSION';
    }

    if (message.includes('storage') || message.includes('asyncstorage')) {
      return 'STORAGE';
    }

    if (message.includes('sync') || message.includes('conflict')) {
      return 'SYNC';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION';
    }

    return 'UNKNOWN';
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('server')
    );
  }

  private logError(errorDetails: ErrorDetails): void {
    // Add to internal log
    this.errorLog.push({
      ...errorDetails,
      context: {
        ...errorDetails.context,
        timestamp: new Date().toISOString(),
      },
    });

    // Trim log if too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console log for development
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('[ErrorHandler]', {
        type: errorDetails.type,
        message: errorDetails.message,
        context: errorDetails.context,
        originalError: errorDetails.originalError,
      });
    }
  }

  private showUserFeedback(
    errorDetails: ErrorDetails,
    retryCallback?: () => void,
    fallbackCallback?: () => void
  ): void {
    const { type, message, retryable } = errorDetails;

    // Get user-friendly message
    const userMessage = this.getUserFriendlyMessage(type, message);

    // Prepare alert buttons
    const buttons: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [];

    if (retryable && retryCallback) {
      buttons.push({
        text: 'Retry',
        onPress: retryCallback,
      });
    }

    if (fallbackCallback) {
      buttons.push({
        text: 'Use Offline Mode',
        onPress: fallbackCallback,
      });
    }

    buttons.push({
      text: 'OK',
      style: 'cancel',
    });

    Alert.alert(
      this.getErrorTitle(type),
      userMessage,
      buttons
    );
  }

  private getUserFriendlyMessage(type: ErrorType, message: string): string {
    switch (type) {
      case 'NETWORK':
        return 'Please check your internet connection and try again.';
      case 'PERMISSION':
        return 'Permission denied. Please check your access rights.';
      case 'STORAGE':
        return 'Unable to save data locally. Please check device storage.';
      case 'SYNC':
        return 'Sync error occurred. Changes will be saved locally and synced later.';
      case 'VALIDATION':
        return message; // Validation messages are usually user-friendly
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case 'NETWORK':
        return 'Connection Error';
      case 'PERMISSION':
        return 'Access Denied';
      case 'STORAGE':
        return 'Storage Error';
      case 'SYNC':
        return 'Sync Error';
      case 'VALIDATION':
        return 'Validation Error';
      default:
        return 'Error';
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export convenience functions
export const handleError = (
  error: Error | AppError | string,
  context?: ErrorContext,
  options?: ErrorHandlerOptions
) => errorHandler.handle(error, context, options);

export const createNetworkError = (
  message: string,
  context?: ErrorContext,
  originalError?: Error
) => errorHandler.createNetworkError(message, context, originalError);

export const createValidationError = (
  message: string,
  context?: ErrorContext
) => errorHandler.createValidationError(message, context);

export const createPermissionError = (
  message: string,
  context?: ErrorContext
) => errorHandler.createPermissionError(message, context);

export const createStorageError = (
  message: string,
  context?: ErrorContext,
  originalError?: Error
) => errorHandler.createStorageError(message, context, originalError);

export const createSyncError = (
  message: string,
  context?: ErrorContext,
  originalError?: Error
) => errorHandler.createSyncError(message, context, originalError);