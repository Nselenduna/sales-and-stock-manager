import { notificationService, NotificationPreferences } from '../../lib/notifications';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device', () => ({
  isDevice: true,
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../lib/supabase');

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock permission responses
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      canAskAgain: true,
      granted: true,
      expires: 'never',
    });

    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      canAskAgain: true,
      granted: true,
      expires: 'never',
    });

    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[test-token]',
      type: 'expo',
    });

    mockedNotifications.scheduleNotificationAsync.mockResolvedValue('test-notification-id');
    mockedNotifications.setNotificationChannelAsync.mockResolvedValue();
    
    // Mock AsyncStorage
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
  });

  describe('registerForPushNotifications', () => {
    it('should successfully register for push notifications', async () => {
      const result = await notificationService.registerForPushNotifications();

      expect(result.success).toBe(true);
      expect(result.token).toBe('ExponentPushToken[test-token]');
      expect(mockedNotifications.getPermissionsAsync).toHaveBeenCalled();
      expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: false,
        granted: false,
        expires: 'never',
      });

      mockedNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: false,
        granted: false,
        expires: 'never',
      });

      const result = await notificationService.registerForPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission not granted');
    });

    it('should handle errors gracefully', async () => {
      mockedNotifications.getPermissionsAsync.mockRejectedValue(new Error('Network error'));

      const result = await notificationService.registerForPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('sendLocalNotification', () => {
    it('should send a local notification successfully', async () => {
      const result = await notificationService.sendLocalNotification(
        'Test Title',
        'Test Body',
        { type: 'urgent_message', priority: 'high' }
      );

      expect(result.success).toBe(true);
      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { type: 'urgent_message', priority: 'high' },
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    });

    it('should handle notification send errors', async () => {
      mockedNotifications.scheduleNotificationAsync.mockRejectedValue(new Error('Send failed'));

      const result = await notificationService.sendLocalNotification('Test', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('sendStockAlert', () => {
    it('should send low stock alert when enabled', async () => {
      // Mock preferences with low_stock enabled
      const preferences: NotificationPreferences = {
        low_stock: true,
        out_of_stock: true,
        urgent_message: true,
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(preferences));

      await notificationService.sendStockAlert('Test Product', 5, 10, 'low_stock');

      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Low Stock Alert',
            body: 'Test Product is low on stock: 5 remaining (threshold: 10)',
          }),
        })
      );
    });

    it('should send out of stock alert when enabled', async () => {
      const preferences: NotificationPreferences = {
        low_stock: true,
        out_of_stock: true,
        urgent_message: true,
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(preferences));

      await notificationService.sendStockAlert('Test Product', 0, 10, 'out_of_stock');

      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Out of Stock Alert',
            body: 'Test Product is out of stock',
          }),
        })
      );
    });

    it('should not send alert when preference is disabled', async () => {
      const preferences: NotificationPreferences = {
        low_stock: false,
        out_of_stock: true,
        urgent_message: true,
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(preferences));

      await notificationService.sendStockAlert('Test Product', 5, 10, 'low_stock');

      expect(mockedNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('sendUrgentMessage', () => {
    it('should send urgent message when enabled', async () => {
      const preferences: NotificationPreferences = {
        low_stock: true,
        out_of_stock: true,
        urgent_message: true,
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(preferences));

      await notificationService.sendUrgentMessage('Critical system update');

      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Urgent Message',
            body: 'Critical system update',
          }),
        })
      );
    });

    it('should not send urgent message when disabled', async () => {
      const preferences: NotificationPreferences = {
        low_stock: true,
        out_of_stock: true,
        urgent_message: false,
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(preferences));

      await notificationService.sendUrgentMessage('Critical system update');

      expect(mockedNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should update and save preferences', async () => {
      const newPreferences = { low_stock: false };

      await notificationService.updatePreferences(newPreferences);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_preferences',
        expect.stringContaining('"low_stock":false')
      );
    });
  });

  describe('areNotificationsEnabled', () => {
    it('should return true when permissions are granted', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
        granted: true,
        expires: 'never',
      });

      const result = await notificationService.areNotificationsEnabled();

      expect(result).toBe(true);
    });

    it('should return false when permissions are denied', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: false,
        granted: false,
        expires: 'never',
      });

      const result = await notificationService.areNotificationsEnabled();

      expect(result).toBe(false);
    });
  });
});