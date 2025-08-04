import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

// Error information interface
interface ErrorInfo {
  componentStack: string;
}

// Error boundary props interface
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showResetButton?: boolean;
  resetButtonText?: string;
  errorTitle?: string;
  errorMessage?: string;
}

// Error boundary state interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error information
    this.logError(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error details to console and potentially external services
   */
  private logError = (error: Error, errorInfo: ErrorInfo): void => {
    // Console logging for development
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Structured error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location?.href || 'react-native-app',
    };

    console.error(
      'Structured Error Details:',
      JSON.stringify(errorDetails, null, 2)
    );

    // TODO: In production, send to external error reporting service
    // Example: Sentry, Bugsnag, or custom error API
    // errorReportingService.captureException(error, { extra: errorDetails });
  };

  /**
   * Reset error boundary state to recover from error
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Show detailed error information in development
   */
  private showErrorDetails = (): void => {
    const { error, errorInfo } = this.state;
    const details = `
Error: ${error?.message || 'Unknown error'}

Stack:
${error?.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}
    `.trim();

    Alert.alert('Error Details', details, [{ text: 'OK', style: 'default' }], {
      cancelable: true,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const {
        showResetButton = true,
        resetButtonText = 'Try Again',
        errorTitle = 'Oops! Something went wrong',
        errorMessage = 'We encountered an unexpected error. Please try refreshing the screen.',
      } = this.props;

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>{errorTitle}</Text>
            <Text style={styles.message}>{errorMessage}</Text>

            {showResetButton && (
              <TouchableOpacity
                style={styles.button}
                onPress={this.handleReset}
              >
                <Text style={styles.buttonText}>{resetButtonText}</Text>
              </TouchableOpacity>
            )}

            {__DEV__ && (
              <TouchableOpacity
                style={[styles.button, styles.debugButton]}
                onPress={this.showErrorDetails}
              >
                <Text style={styles.buttonText}>Show Error Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 24,
    maxWidth: 350,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 120,
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
