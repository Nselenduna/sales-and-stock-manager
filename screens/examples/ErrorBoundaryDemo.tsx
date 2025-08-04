import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundaryComponents';

// Component that will crash when button is pressed
const CrashTestComponent = ({ shouldCrash }: { shouldCrash: boolean }) => {
  if (shouldCrash) {
    throw new Error('This is a test error to demonstrate ErrorBoundary functionality');
  }
  
  return (
    <View style={styles.workingContainer}>
      <Text style={styles.workingText}>✅ Component is working normally</Text>
    </View>
  );
};

// Demo screen to test ErrorBoundary functionality
const ErrorBoundaryDemo = () => {
  const [shouldCrash, setShouldCrash] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ErrorBoundary Demo</Text>
      <Text style={styles.subtitle}>
        This demonstrates how ErrorBoundary catches errors and shows fallback UI
      </Text>
      
      <TouchableOpacity
        style={styles.crashButton}
        onPress={() => setShouldCrash(true)}
      >
        <Text style={styles.buttonText}>Trigger Error</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => setShouldCrash(false)}
      >
        <Text style={styles.buttonText}>Reset Component</Text>
      </TouchableOpacity>

      <ErrorBoundary
        errorTitle="Demo Error"
        errorMessage="This is a demonstration of ErrorBoundary. In a real app, this would show when unexpected errors occur."
        resetButtonText="Try Again"
        onError={(error, errorInfo) => {
          console.log('🛡️ ErrorBoundary caught error:', error.message);
          console.log('📍 Component stack:', errorInfo.componentStack);
        }}
      >
        <CrashTestComponent shouldCrash={shouldCrash} />
      </ErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  crashButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  workingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
  },
  workingText: {
    fontSize: 18,
    color: '#4ECDC4',
    fontWeight: '600',
  },
});

export default ErrorBoundaryDemo;