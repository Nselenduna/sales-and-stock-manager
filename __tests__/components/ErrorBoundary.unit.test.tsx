// Mock React Native components for testing
jest.mock('react-native', () => ({
  View: ({ children, ...props }: any) => require('react').createElement('div', props, children),
  Text: ({ children, ...props }: any) => require('react').createElement('span', props, children),
  TouchableOpacity: ({ children, onPress, ...props }: any) => 
    require('react').createElement('button', { ...props, onClick: onPress }, children),
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock navigator
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: { userAgent: 'test-agent' },
});

// Mock window location
Object.defineProperty(global, 'window', {
  writable: true,
  value: { location: { href: 'test-url' } },
});

import React from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary');
  }
  return React.createElement('span', { 'data-testid': 'working-component' }, 'Working Component');
};

describe('ErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console.error for error boundary tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    if (consoleSpy && consoleSpy.mockRestore) {
      consoleSpy.mockRestore();
    }
  });

  it('should be a valid React component', () => {
    expect(ErrorBoundary).toBeDefined();
    expect(typeof ErrorBoundary).toBe('function');
  });

  it('should have correct static methods', () => {
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    // Create an ErrorBoundary instance to test componentDidCatch
    const boundary = new ErrorBoundary({ 
      children: React.createElement(ErrorThrowingComponent, { shouldThrow: false }),
      onError 
    });
    
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };
    
    // Manually call componentDidCatch to test error handling
    boundary.componentDidCatch(error, errorInfo);
    
    expect(onError).toHaveBeenCalledWith(error, errorInfo);
  });

  it('should update state correctly when error occurs', () => {
    const error = new Error('Test error');
    const newState = ErrorBoundary.getDerivedStateFromError(error);
    
    expect(newState).toEqual({
      hasError: true,
      error,
    });
  });

  it('should log error information when componentDidCatch is called', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const boundary = new ErrorBoundary({ 
      children: React.createElement(ErrorThrowingComponent, { shouldThrow: false })
    });
    
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };
    
    boundary.componentDidCatch(error, errorInfo);
    
    expect(consoleSpy).toHaveBeenCalledWith('ErrorBoundary caught an error:', error);
    expect(consoleSpy).toHaveBeenCalledWith('Error Info:', errorInfo);
    
    consoleSpy.mockRestore();
  });

  it('should log structured error details', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const boundary = new ErrorBoundary({ 
      children: React.createElement(ErrorThrowingComponent, { shouldThrow: false })
    });
    
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };
    
    boundary.componentDidCatch(error, errorInfo);
    
    // Check for structured error logging
    const structuredLogCall = consoleSpy.mock.calls.find(call =>
      call[0] === 'Structured Error Details:'
    );
    
    expect(structuredLogCall).toBeTruthy();
    if (structuredLogCall) {
      const logData = JSON.parse(structuredLogCall[1]);
      expect(logData).toHaveProperty('message');
      expect(logData).toHaveProperty('timestamp');
      expect(logData).toHaveProperty('componentStack');
      expect(logData).toHaveProperty('userAgent');
      expect(logData).toHaveProperty('url');
    }
    
    consoleSpy.mockRestore();
  });

  it('should handle reset functionality', () => {
    const boundary = new ErrorBoundary({ 
      children: React.createElement(ErrorThrowingComponent, { shouldThrow: false })
    });
    
    // Simulate error state by calling getDerivedStateFromError
    const error = new Error('Test error');
    const errorState = ErrorBoundary.getDerivedStateFromError(error);
    
    // Set error state manually
    boundary.state = {
      ...boundary.state,
      ...errorState,
      errorInfo: { componentStack: 'test' }
    };
    
    expect(boundary.state.hasError).toBe(true);
    
    // Call private handleReset method
    (boundary as any).handleReset();
    
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);
    expect(boundary.state.errorInfo).toBe(null);
  });
});

describe('ErrorBoundary Props and Configuration', () => {
  it('should accept custom error title and message', () => {
    const boundary = new ErrorBoundary({
      children: React.createElement('div'),
      errorTitle: 'Custom Title',
      errorMessage: 'Custom Message',
    });
    
    expect(boundary.props.errorTitle).toBe('Custom Title');
    expect(boundary.props.errorMessage).toBe('Custom Message');
  });

  it('should accept custom reset button text', () => {
    const boundary = new ErrorBoundary({
      children: React.createElement('div'),
      resetButtonText: 'Custom Reset',
    });
    
    expect(boundary.props.resetButtonText).toBe('Custom Reset');
  });

  it('should accept showResetButton configuration', () => {
    const boundary = new ErrorBoundary({
      children: React.createElement('div'),
      showResetButton: false,
    });
    
    expect(boundary.props.showResetButton).toBe(false);
  });

  it('should accept custom fallback component', () => {
    const fallback = React.createElement('div', {}, 'Custom Fallback');
    const boundary = new ErrorBoundary({
      children: React.createElement('div'),
      fallback,
    });
    
    expect(boundary.props.fallback).toBe(fallback);
  });
});