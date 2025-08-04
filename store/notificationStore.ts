import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, NotificationPreferences } from '../lib/notifications';

interface NotificationState {
  preferences: NotificationPreferences;
  pushToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  loading: boolean;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
interface NotificationActions {
  setPreferences: (_preferences: Partial<NotificationPreferences>) => Promise<void>;
  setPushToken: (_token: string | null) => void;
  setPermissionStatus: (_status: 'granted' | 'denied' | 'undetermined') => void;
  setLoading: (_loading: boolean) => void;
  requestPermissions: () => Promise<{ success: boolean; error?: string }>;
  updatePreference: (_key: keyof NotificationPreferences, _value: boolean) => Promise<void>;
  clearNotificationData: () => Promise<void>;
  initializeNotifications: () => Promise<void>;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const initialPreferences: NotificationPreferences = {
  low_stock: true,
  out_of_stock: true,
  urgent_message: true,
};

const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      // State
      preferences: initialPreferences,
      pushToken: null,
      permissionStatus: 'undetermined',
      loading: false,

      // Actions
      setPreferences: async (newPreferences) => {
        const currentPreferences = get().preferences;
        const updatedPreferences = { ...currentPreferences, ...newPreferences };
        
        // Update local state
        set({ preferences: updatedPreferences });
        
        // Update notification service
        await notificationService.updatePreferences(updatedPreferences);
      },

      setPushToken: (token) => set({ pushToken: token }),

      setPermissionStatus: (status) => set({ permissionStatus: status }),

      setLoading: (loading) => set({ loading }),

      requestPermissions: async () => {
        set({ loading: true });
        
        try {
          const result = await notificationService.registerForPushNotifications();
          
          if (result.success && result.token) {
            set({ 
              pushToken: result.token, 
              permissionStatus: 'granted',
              loading: false 
            });
          } else {
            set({ 
              permissionStatus: 'denied',
              loading: false 
            });
          }
          
          return result;
        } catch (error: unknown) {
          set({ 
            permissionStatus: 'denied',
            loading: false 
          });
          return { success: false, error: (error as Error).message };
        }
      },

      updatePreference: async (key, value) => {
        const currentPreferences = get().preferences;
        const updatedPreferences = { ...currentPreferences, [key]: value };
        
        await get().setPreferences(updatedPreferences);
      },

      clearNotificationData: async () => {
        set({
          preferences: initialPreferences,
          pushToken: null,
          permissionStatus: 'undetermined',
        });
        
        await notificationService.clearPreferences();
      },

      initializeNotifications: async () => {
        set({ loading: true });
        
        try {
          // Check current permission status
          const isEnabled = await notificationService.areNotificationsEnabled();
          const permissionStatus = isEnabled ? 'granted' : 'denied';
          
          // Get current preferences from service
          const currentPreferences = notificationService.getPreferences();
          
          // Get push token if available
          const pushToken = notificationService.getPushToken();
          
          set({
            preferences: currentPreferences,
            pushToken,
            permissionStatus,
            loading: false,
          });
        } catch (error) {
          console.error('Error initializing notifications:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        pushToken: state.pushToken,
        permissionStatus: state.permissionStatus,
      }),
    }
  )
);

export { useNotificationStore };

// Export convenience hooks
export const useNotificationPreferences = () => {
  const store = useNotificationStore();
  return {
    preferences: store.preferences,
    updatePreference: store.updatePreference,
    setPreferences: store.setPreferences,
  };
};

export const useNotificationPermissions = () => {
  const store = useNotificationStore();
  return {
    permissionStatus: store.permissionStatus,
    pushToken: store.pushToken,
    loading: store.loading,
    requestPermissions: store.requestPermissions,
    initializeNotifications: store.initializeNotifications,
  };
};