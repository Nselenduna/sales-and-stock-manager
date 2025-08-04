import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Notification types
export type NotificationType = 'low_stock' | 'out_of_stock' | 'urgent_message';

export interface NotificationPreferences {
  low_stock: boolean;
  out_of_stock: boolean;
  urgent_message: boolean;
  push_token?: string;
}

export interface PushNotificationData {
  type: NotificationType;
  productId?: string;
  productName?: string;
  quantity?: number;
  threshold?: number;
  message?: string;
  priority: 'default' | 'high';
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  type: 'low_stock' | 'out_of_stock';
  sentAt?: string;
}

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = {
    low_stock: true,
    out_of_stock: true,
    urgent_message: true,
  };

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load saved preferences
      await this.loadPreferences();
      
      // Register for push notifications if user has permissions
      await this.registerForPushNotifications();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions and register for push notifications
   */
  async registerForPushNotifications(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (!Device.isDevice) {
        return { success: false, error: 'Must use physical device for Push Notifications' };
      }

      // Get existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, error: 'Permission not granted for push notifications' };
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.pushToken = token;

      // Save token to preferences and backend
      await this.saveTokenToBackend(token);
      await this.savePreferences({ ...this.preferences, push_token: token });

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return { success: true, token };
    } catch (error: unknown) {
      console.error('Error registering for push notifications:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('stock-alerts', {
      name: 'Stock Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      description: 'Notifications for low stock and out-of-stock items',
    });

    await Notifications.setNotificationChannelAsync('urgent-messages', {
      name: 'Urgent Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      description: 'Critical system messages and urgent notifications',
    });
  }

  /**
   * Save push token to backend for server-side notifications
   */
  private async saveTokenToBackend(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving push token to backend:', error);
      }
    } catch (error) {
      console.error('Error saving push token to backend:', error);
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          priority: data?.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('Error sending local notification:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send stock alert notification
   */
  async sendStockAlert(productName: string, currentStock: number, threshold: number, type: 'low_stock' | 'out_of_stock'): Promise<void> {
    // Check if user has enabled this notification type
    if (!this.preferences[type]) {
      return;
    }

    const title = type === 'out_of_stock' ? 'Out of Stock Alert' : 'Low Stock Alert';
    const body = type === 'out_of_stock' 
      ? `${productName} is out of stock`
      : `${productName} is low on stock: ${currentStock} remaining (threshold: ${threshold})`;

    const data: PushNotificationData = {
      type,
      productName,
      quantity: currentStock,
      threshold,
      priority: type === 'out_of_stock' ? 'high' : 'default',
    };

    await this.sendLocalNotification(title, body, data);
  }

  /**
   * Send urgent message notification
   */
  async sendUrgentMessage(message: string): Promise<void> {
    if (!this.preferences.urgent_message) {
      return;
    }

    const data: PushNotificationData = {
      type: 'urgent_message',
      message,
      priority: 'high',
    };

    await this.sendLocalNotification('Urgent Message', message, data);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(newPreferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...newPreferences };
    await this.savePreferences(this.preferences);
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Save preferences to local storage
   */
  private async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  /**
   * Load preferences from local storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const savedPreferences = await AsyncStorage.getItem('notification_preferences');
      if (savedPreferences) {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPreferences) };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  /**
   * Clear all notification preferences (for sign out)
   */
  async clearPreferences(): Promise<void> {
    this.preferences = {
      low_stock: true,
      out_of_stock: true,
      urgent_message: true,
    };
    this.pushToken = null;
    await AsyncStorage.removeItem('notification_preferences');
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export utility functions
export const requestNotificationPermissions = () => notificationService.registerForPushNotifications();
export const sendStockAlert = (productName: string, currentStock: number, threshold: number, type: 'low_stock' | 'out_of_stock') => 
  notificationService.sendStockAlert(productName, currentStock, threshold, type);
export const sendUrgentMessage = (message: string) => notificationService.sendUrgentMessage(message);
export const updateNotificationPreferences = (preferences: Partial<NotificationPreferences>) => 
  notificationService.updatePreferences(preferences);
export const getNotificationPreferences = () => notificationService.getPreferences();