import { act, renderHook } from '@testing-library/react-native';
import { useNotificationStore, useNotificationPreferences, useNotificationPermissions } from '../../store/notificationStore';
import { notificationService } from '../../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../lib/notifications');
jest.mock('@react-native-async-storage/async-storage');

const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useNotificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    useNotificationStore.getState().setPreferences({
      low_stock: true,
      out_of_stock: true,
      urgent_message: true,
    });
    useNotificationStore.getState().setPushToken(null);
    useNotificationStore.getState().setPermissionStatus('undetermined');
    useNotificationStore.getState().setLoading(false);

    // Mock AsyncStorage
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
    
    // Mock notification service methods
    mockedNotificationService.updatePreferences.mockResolvedValue();
    mockedNotificationService.registerForPushNotifications.mockResolvedValue({
      success: true,
      token: 'test-token',
    });
    mockedNotificationService.areNotificationsEnabled.mockResolvedValue(true);
    mockedNotificationService.getPreferences.mockReturnValue({
      low_stock: true,
      out_of_stock: true,
      urgent_message: true,
    });
    mockedNotificationService.getPushToken.mockReturnValue('test-token');
    mockedNotificationService.clearPreferences.mockResolvedValue();
  });

  describe('setPreferences', () => {
    it('should update preferences in store and notification service', async () => {
      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.setPreferences({ low_stock: false });
      });

      expect(result.current.preferences.low_stock).toBe(false);
      expect(mockedNotificationService.updatePreferences).toHaveBeenCalledWith({
        low_stock: false,
        out_of_stock: true,
        urgent_message: true,
      });
    });
  });

  describe('requestPermissions', () => {
    it('should successfully request permissions and update state', async () => {
      const { result } = renderHook(() => useNotificationStore());

      let permissionResult;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult).toEqual({ success: true, token: 'test-token' });
      expect(result.current.pushToken).toBe('test-token');
      expect(result.current.permissionStatus).toBe('granted');
      expect(result.current.loading).toBe(false);
    });

    it('should handle permission denial', async () => {
      mockedNotificationService.registerForPushNotifications.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const { result } = renderHook(() => useNotificationStore());

      let permissionResult;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult).toEqual({ success: false, error: 'Permission denied' });
      expect(result.current.permissionStatus).toBe('denied');
      expect(result.current.loading).toBe(false);
    });

    it('should handle errors during permission request', async () => {
      mockedNotificationService.registerForPushNotifications.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useNotificationStore());

      let permissionResult;
      await act(async () => {
        permissionResult = await result.current.requestPermissions();
      });

      expect(permissionResult).toEqual({ success: false, error: 'Network error' });
      expect(result.current.permissionStatus).toBe('denied');
    });
  });

  describe('updatePreference', () => {
    it('should update a single preference', async () => {
      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.updatePreference('urgent_message', false);
      });

      expect(result.current.preferences.urgent_message).toBe(false);
      expect(result.current.preferences.low_stock).toBe(true);
      expect(result.current.preferences.out_of_stock).toBe(true);
    });
  });

  describe('clearNotificationData', () => {
    it('should reset store to initial state and clear service data', async () => {
      const { result } = renderHook(() => useNotificationStore());

      // Set some state first
      await act(async () => {
        result.current.setPushToken('some-token');
        result.current.setPermissionStatus('granted');
        await result.current.setPreferences({ low_stock: false });
      });

      // Clear data
      await act(async () => {
        await result.current.clearNotificationData();
      });

      expect(result.current.preferences).toEqual({
        low_stock: true,
        out_of_stock: true,
        urgent_message: true,
      });
      expect(result.current.pushToken).toBe(null);
      expect(result.current.permissionStatus).toBe('undetermined');
      expect(mockedNotificationService.clearPreferences).toHaveBeenCalled();
    });
  });

  describe('initializeNotifications', () => {
    it('should initialize with current service state', async () => {
      mockedNotificationService.areNotificationsEnabled.mockResolvedValue(true);
      mockedNotificationService.getPreferences.mockReturnValue({
        low_stock: false,
        out_of_stock: true,
        urgent_message: true,
        push_token: 'stored-token',
      });
      mockedNotificationService.getPushToken.mockReturnValue('stored-token');

      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.initializeNotifications();
      });

      expect(result.current.permissionStatus).toBe('granted');
      expect(result.current.preferences.low_stock).toBe(false);
      expect(result.current.pushToken).toBe('stored-token');
      expect(result.current.loading).toBe(false);
    });

    it('should handle initialization errors', async () => {
      mockedNotificationService.areNotificationsEnabled.mockRejectedValue(
        new Error('Initialization failed')
      );

      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.initializeNotifications();
      });

      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useNotificationPreferences', () => {
  it('should return preferences and update functions', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.preferences).toEqual({
      low_stock: true,
      out_of_stock: true,
      urgent_message: true,
    });
    expect(typeof result.current.updatePreference).toBe('function');
    expect(typeof result.current.setPreferences).toBe('function');
  });
});

describe('useNotificationPermissions', () => {
  it('should return permission state and functions', () => {
    const { result } = renderHook(() => useNotificationPermissions());

    expect(result.current.permissionStatus).toBe('undetermined');
    expect(result.current.pushToken).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.requestPermissions).toBe('function');
    expect(typeof result.current.initializeNotifications).toBe('function');
  });
});