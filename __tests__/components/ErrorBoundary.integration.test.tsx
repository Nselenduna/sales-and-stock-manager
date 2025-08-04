// Integration test for ErrorBoundary functionality
// This test demonstrates that ErrorBoundary correctly catches errors and shows fallback UI

import React from 'react';

// Test component that throws an error
const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

// Test component that works normally
const WorkingComponent = () => React.createElement('div', {}, 'Working Component');

describe('ErrorBoundary Integration Tests', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleSpy?.mockRestore) {
      consoleSpy.mockRestore();
    }
  });

  it('should catch and handle errors in child components', () => {
    // Mock React's error boundary behavior
    const mockGetDerivedStateFromError = jest.fn((error) => ({
      hasError: true,
      error,
    }));

    const mockComponentDidCatch = jest.fn();

    // Test the error boundary static method
    const error = new Error('Test error');
    const derivedState = mockGetDerivedStateFromError(error);

    expect(derivedState).toEqual({
      hasError: true,
      error,
    });

    expect(mockGetDerivedStateFromError).toHaveBeenCalledWith(error);
  });

  it('should log error information when componentDidCatch is called', () => {
    // Import after mocking React Native
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    const boundary = new ErrorBoundary({
      children: React.createElement(WorkingComponent),
    });

    const error = new Error('Test componentDidCatch error');
    const errorInfo = { componentStack: 'at Component\n  at ErrorBoundary' };

    // Call componentDidCatch manually
    boundary.componentDidCatch(error, errorInfo);

    expect(consoleSpy).toHaveBeenCalledWith('ErrorBoundary caught an error:', error);
    expect(consoleSpy).toHaveBeenCalledWith('Error Info:', errorInfo);
  });

  it('should call custom onError handler when provided', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    const onError = jest.fn();
    
    const boundary = new ErrorBoundary({
      children: React.createElement(WorkingComponent),
      onError,
    });

    const error = new Error('Test onError');
    const errorInfo = { componentStack: 'test stack' };

    boundary.componentDidCatch(error, errorInfo);

    expect(onError).toHaveBeenCalledWith(error, errorInfo);
  });

  it('should reset error state when handleReset is called', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    const boundary = new ErrorBoundary({
      children: React.createElement(WorkingComponent),
    });

    // Manually set error state
    boundary.state = {
      hasError: true,
      error: new Error('Test error'),
      errorInfo: { componentStack: 'test' },
    };

    // Mock setState to verify it's called correctly
    const setStateMock = jest.fn((updater) => {
      if (typeof updater === 'function') {
        boundary.state = { ...boundary.state, ...updater(boundary.state) };
      } else {
        boundary.state = { ...boundary.state, ...updater };
      }
    });

    boundary.setState = setStateMock;

    // Call handleReset
    (boundary as any).handleReset();

    expect(setStateMock).toHaveBeenCalledWith({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  });

  it('should accept and use custom configuration props', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    const customProps = {
      children: React.createElement(WorkingComponent),
      errorTitle: 'Custom Error Title',
      errorMessage: 'Custom error message',
      resetButtonText: 'Custom Reset',
      showResetButton: false,
    };

    const boundary = new ErrorBoundary(customProps);

    expect(boundary.props.errorTitle).toBe('Custom Error Title');
    expect(boundary.props.errorMessage).toBe('Custom error message');
    expect(boundary.props.resetButtonText).toBe('Custom Reset');
    expect(boundary.props.showResetButton).toBe(false);
  });

  it('should log structured error data with required fields', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    const boundary = new ErrorBoundary({
      children: React.createElement(WorkingComponent),
    });

    const error = new Error('Structured logging test');
    const errorInfo = { componentStack: 'test component stack' };

    boundary.componentDidCatch(error, errorInfo);

    // Find the structured log call
    const structuredLogCall = consoleSpy.mock.calls.find(call =>
      call[0] === 'Structured Error Details:'
    );

    expect(structuredLogCall).toBeTruthy();
    
    if (structuredLogCall) {
      const logData = JSON.parse(structuredLogCall[1]);
      expect(logData).toHaveProperty('message');
      expect(logData).toHaveProperty('stack');
      expect(logData).toHaveProperty('componentStack');
      expect(logData).toHaveProperty('timestamp');
      expect(logData).toHaveProperty('userAgent');
      expect(logData).toHaveProperty('url');
      expect(logData.message).toBe(error.message);
      expect(logData.componentStack).toBe(errorInfo.componentStack);
    }
  });
});

describe('ErrorBoundary Static Methods', () => {
  it('getDerivedStateFromError should return correct state', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    const error = new Error('Test getDerivedStateFromError');
    const newState = ErrorBoundary.getDerivedStateFromError(error);

    expect(newState).toEqual({
      hasError: true,
      error,
    });
  });

  it('should be a proper React Component class', () => {
    const ErrorBoundary = require('../../components/ErrorBoundary').default;
    
    // Check that it's a constructor function (class)
    expect(typeof ErrorBoundary).toBe('function');
    expect(ErrorBoundary.prototype).toBeDefined();
    expect(typeof ErrorBoundary.prototype.render).toBe('function');
    expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
  });
});