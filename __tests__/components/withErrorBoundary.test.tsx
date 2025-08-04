import React from 'react';
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import withErrorBoundary from '../../components/withErrorBoundary';

// Test component that can throw errors
const TestComponent = ({ shouldThrow = false, text = 'Test Component' }: { shouldThrow?: boolean; text?: string }) => {
  if (shouldThrow) {
    throw new Error('Test error from wrapped component');
  }
  return <Text testID="test-component">{text}</Text>;
};

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    (console.error as jest.Mock).mockRestore();
  });

  it('renders wrapped component when there is no error', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    const component = create(
      <WrappedComponent shouldThrow={false} text="Working Component" />
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders error UI when wrapped component throws', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    const component = create(
      <WrappedComponent shouldThrow={true} />
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('applies custom error boundary options', () => {
    const customTitle = 'HOC Error Title';
    const customMessage = 'HOC error message';

    const WrappedComponent = withErrorBoundary(TestComponent, {
      errorTitle: customTitle,
      errorMessage: customMessage,
    });

    const component = create(
      <WrappedComponent shouldThrow={true} />
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calls custom onError handler with component name', () => {
    const onError = jest.fn();
    const WrappedComponent = withErrorBoundary(TestComponent, {
      onError,
    });

    create(<WrappedComponent shouldThrow={true} />);

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('logs component-specific error context', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const WrappedComponent = withErrorBoundary(TestComponent);

    create(<WrappedComponent shouldThrow={true} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in component: TestComponent')
    );

    consoleSpy.mockRestore();
  });

  it('sets correct display name for debugging', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });

  it('handles components without display name', () => {
    const AnonymousComponent = (props: any) => <Text {...props}>Anonymous</Text>;
    const WrappedComponent = withErrorBoundary(AnonymousComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(AnonymousComponent)');
  });

  it('handles components with existing display name', () => {
    const NamedComponent = (props: any) => <Text {...props}>Named</Text>;
    NamedComponent.displayName = 'CustomName';
    
    const WrappedComponent = withErrorBoundary(NamedComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(CustomName)');
  });

  it('allows custom fallback UI through options', () => {
    const CustomFallback = () => <Text testID="hoc-custom-fallback">HOC Custom Fallback</Text>;
    
    const WrappedComponent = withErrorBoundary(TestComponent, {
      fallback: <CustomFallback />,
    });

    const component = create(
      <WrappedComponent shouldThrow={true} />
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('supports showResetButton option', () => {
    const WrappedComponent = withErrorBoundary(TestComponent, {
      showResetButton: false,
    });

    const component = create(
      <WrappedComponent shouldThrow={true} />
    );

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});