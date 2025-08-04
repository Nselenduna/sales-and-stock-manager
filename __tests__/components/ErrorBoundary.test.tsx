import React from 'react';
import { create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary');
  }
  return <Text testID="working-component">Working Component</Text>;
};

// Component that throws error on button press
const ConditionalErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        testID="throw-error-button"
        onPress={() => setShouldThrow(true)}
      >
        <Text>Throw Error</Text>
      </TouchableOpacity>
      <ErrorThrowingComponent shouldThrow={shouldThrow} />
    </>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when there is no error', () => {
    const component = create(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders error UI when there is an error', () => {
    const component = create(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders custom error UI with custom props', () => {
    const customTitle = 'Custom Error Title';
    const customMessage = 'Custom error message';
    const customButtonText = 'Retry';

    const component = create(
      <ErrorBoundary
        errorTitle={customTitle}
        errorMessage={customMessage}
        resetButtonText={customButtonText}
      >
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders custom fallback UI when provided', () => {
    const CustomFallback = () => <Text testID="custom-fallback">Custom Fallback UI</Text>;

    const component = create(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    create(
      <ErrorBoundary onError={onError}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('logs error details to console', () => {
    const consoleSpy = jest.spyOn(console, 'error');

    create(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error Info:',
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    consoleSpy.mockRestore();
  });

  it('logs structured error information', () => {
    const consoleSpy = jest.spyOn(console, 'error');

    create(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

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
    }

    consoleSpy.mockRestore();
  });

  it('handles multiple errors correctly', () => {
    const onError = jest.fn();

    // First error
    create(
      <ErrorBoundary onError={onError}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);

    // Second error in different boundary
    create(
      <ErrorBoundary onError={onError}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(2);
  });
});