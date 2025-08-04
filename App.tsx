import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { useAuthStore } from './store/authStore';
import { initializeAppSecurity, showSecurityStatus } from './lib/security/securityInit';

export default function App() {
  const { checkUser } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize security features first
        await initializeAppSecurity({
          enableRateLimit: true,
          enableSecurityLogging: true,
          enforceHttps: !__DEV__,
          sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
          enforceStrongPasswords: true,
        });

        // Show security status in development
        if (__DEV__) {
          await showSecurityStatus();
        }

        // Then check user authentication
        await checkUser();
      } catch (error) {
        console.error('App initialization failed:', error);
        // Still check user auth even if security init fails
        await checkUser();
      }
    };

    initializeApp();
  }, [checkUser]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style='auto' />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
