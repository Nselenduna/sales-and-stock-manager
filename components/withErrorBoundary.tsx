import React, { ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Higher-order component that wraps a component with ErrorBoundary
 * Useful for automatically protecting components without manual wrapping
 */
function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps?: {
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
    showResetButton?: boolean;
    resetButtonText?: string;
    errorTitle?: string;
    errorMessage?: string;
  }
) {
  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        onError={(error, errorInfo) => {
          // Log component-specific error context
          console.error(
            `Error in component: ${WrappedComponent.displayName || WrappedComponent.name || 'Unknown'}`
          );

          // Call custom error handler if provided
          if (errorBoundaryProps?.onError) {
            errorBoundaryProps.onError(error, errorInfo);
          }
        }}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  // Set display name for debugging
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundaryComponent;
}

export default withErrorBoundary;
