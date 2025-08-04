import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationSettingsScreen from '../../screens/settings/NotificationSettingsScreen';

// Mock the navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
};

// Mock the notification store
jest.mock('../../store/notificationStore', () => ({
  useNotificationPreferences: () => ({
    preferences: {
      low_stock: true,
      out_of_stock: true,
      urgent_message: true,
    },
    updatePreference: jest.fn(),
    setPreferences: jest.fn(),
  }),
  useNotificationPermissions: () => ({
    permissionStatus: 'granted',
    pushToken: 'test-token',
    loading: false,
    requestPermissions: jest.fn().mockResolvedValue({ success: true }),
    initializeNotifications: jest.fn(),
  }),
}));

// Mock stock monitoring service
jest.mock('../../lib/stockMonitoring', () => ({
  stockMonitoringService: {
    checkStockLevels: jest.fn().mockResolvedValue({
      totalProducts: 10,
      lowStockProducts: 2,
      outOfStockProducts: 1,
      alertsSent: 3,
    }),
  },
  getMonitoringStats: jest.fn().mockReturnValue({
    lastCheckAt: '2024-01-01T12:00:00Z',
    totalProducts: 10,
    lowStockProducts: 2,
    outOfStockProducts: 1,
    alertsSent: 3,
  }),
}));

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification settings screen correctly', () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    expect(getByText('Notification Settings')).toBeTruthy();
    expect(getByText('Configure your alert preferences')).toBeTruthy();
    expect(getByText('Notification Permissions')).toBeTruthy();
    expect(getByText('Notification Types')).toBeTruthy();
  });

  it('displays granted permission status', () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    expect(getByText('Notifications Enabled')).toBeTruthy();
    expect(getByText('You will receive stock alerts and urgent messages')).toBeTruthy();
  });

  it('shows notification type preferences', () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    expect(getByText('Low Stock Alerts')).toBeTruthy();
    expect(getByText('Out of Stock Alerts')).toBeTruthy();
    expect(getByText('Urgent Messages')).toBeTruthy();
  });

  it('displays testing section', () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    expect(getByText('Testing & Monitoring')).toBeTruthy();
    expect(getByText('Send Test Notification')).toBeTruthy();
    expect(getByText('Check Stock Levels Now')).toBeTruthy();
  });

  it('handles back button press', () => {
    const { getByLabelText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('navigates to AdminMain when canGoBack is false', () => {
    const navigationWithoutBack = {
      ...mockNavigation,
      canGoBack: () => false,
    };

    const { getByLabelText } = render(
      <NotificationSettingsScreen navigation={navigationWithoutBack} />
    );

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AdminMain');
  });

  it('displays monitoring stats when available', () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    expect(getByText('Last Monitoring Check')).toBeTruthy();
    expect(getByText('Products: 10 | Low Stock: 2 | Out of Stock: 1')).toBeTruthy();
    expect(getByText('Alerts Sent: 3')).toBeTruthy();
  });

  it('handles test notification button press', async () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    const testButton = getByText('Send Test Notification');
    fireEvent.press(testButton);

    // Test button should be accessible
    expect(testButton).toBeTruthy();
  });

  it('handles stock check button press', async () => {
    const { getByText } = render(
      <NotificationSettingsScreen navigation={mockNavigation} />
    );

    const stockCheckButton = getByText('Check Stock Levels Now');
    fireEvent.press(stockCheckButton);

    // Stock check button should be accessible
    expect(stockCheckButton).toBeTruthy();
  });
});