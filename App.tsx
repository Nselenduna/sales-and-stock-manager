import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundaryComponents';

export default function App() {
  const { checkUser } = useAuthStore();

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <ErrorBoundary
      errorTitle='App Error'
      errorMessage='The app encountered an unexpected error. Please restart the application.'
      onError={(error, errorInfo) => {
        // Log app-level errors with additional context
        console.error('App-level error occurred:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });

        // TODO: Send to crash reporting service (e.g., Sentry, Crashlytics)
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style='auto' />
          <AppNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
