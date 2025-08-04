import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';

export default function App() {
  const { checkUser } = useAuthStore();
  const { initializeNotifications } = useNotificationStore();

  useEffect(() => {
    checkUser();
    initializeNotifications();
  }, [checkUser, initializeNotifications]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style='auto' />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
