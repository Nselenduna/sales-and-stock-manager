import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useNotificationPreferences, useNotificationPermissions } from '../../store/notificationStore';
import { stockMonitoringService, getMonitoringStats } from '../../lib/stockMonitoring';

interface NotificationSettingsScreenProps {
  navigation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [testingNotification, setTestingNotification] = useState(false);
  const [monitoringStats, setMonitoringStats] = useState(getMonitoringStats());

  const { preferences, updatePreference } = useNotificationPreferences();
  const { 
    permissionStatus, 
    pushToken, 
    loading, 
    requestPermissions, 
    initializeNotifications 
  } = useNotificationPermissions();

  useEffect(() => {
    initializeNotifications();
  }, [initializeNotifications]);

  const handlePermissionRequest = async () => {
    if (permissionStatus === 'denied') {
      Alert.alert(
        'Notifications Disabled',
        'Notifications are currently disabled. Please enable them in your device settings to receive stock alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              // In a real app, you would open device settings
              Alert.alert('Info', 'Please go to Settings > Apps > Sales Manager > Notifications to enable notifications');
            },
          },
        ]
      );
      return;
    }

    const result = await requestPermissions();
    if (!result.success) {
      Alert.alert('Permission Error', result.error || 'Failed to enable notifications');
    } else {
      Alert.alert('Success', 'Notifications enabled successfully!');
    }
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert('Notifications Disabled', 'Please enable notifications first');
      return;
    }

    setTestingNotification(true);
    try {
      // Import notification service dynamically to avoid issues
      const { notificationService } = await import('../../lib/notifications');
      
      await notificationService.sendUrgentMessage('This is a test notification from your Sales & Stock Manager app!');
      Alert.alert('Test Sent', 'Test notification sent successfully!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleStockCheck = async () => {
    Alert.alert(
      'Manual Stock Check',
      'This will check all products for low stock and send notifications if needed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Now',
          onPress: async () => {
            try {
              const stats = await stockMonitoringService.checkStockLevels();
              setMonitoringStats(stats);
              
              Alert.alert(
                'Stock Check Complete',
                `Checked ${stats.totalProducts} products\n` +
                `Found ${stats.lowStockProducts} low stock items\n` +
                `Found ${stats.outOfStockProducts} out of stock items\n` +
                `Sent ${stats.alertsSent} notifications`
              );
            } catch (error) {
              console.error('Error during stock check:', error);
              Alert.alert('Error', 'Failed to complete stock check');
            }
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('AdminMain');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        accessible={true}
        accessibilityLabel='Go back'
        accessibilityRole='button'
      >
        <Icon name='arrow-back' size={24} color='white' />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerSubtitle}>Configure your alert preferences</Text>
      </View>
    </View>
  );

  const renderPermissionStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Permissions</Text>
      <View style={styles.permissionCard}>
        <View style={styles.permissionStatus}>
          <Icon
            name={permissionStatus === 'granted' ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={permissionStatus === 'granted' ? '#34C759' : '#FF3B30'}
          />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>
              {permissionStatus === 'granted' ? 'Notifications Enabled' : 'Notifications Disabled'}
            </Text>
            <Text style={styles.permissionDescription}>
              {permissionStatus === 'granted'
                ? 'You will receive stock alerts and urgent messages'
                : 'Enable notifications to receive important alerts'
              }
            </Text>
            {pushToken && (
              <Text style={styles.tokenInfo} numberOfLines={1}>
                Token: {pushToken.substring(0, 20)}...
              </Text>
            )}
          </View>
        </View>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handlePermissionRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNotificationPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Types</Text>
      
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceHeader}>
          <Icon name='alert-triangle' size={20} color='#FF9500' />
          <Text style={styles.preferenceTitle}>Low Stock Alerts</Text>
        </View>
        <Text style={styles.preferenceDescription}>
          Get notified when products are running low on stock
        </Text>
        <Switch
          value={preferences.low_stock}
          onValueChange={(value) => updatePreference('low_stock', value)}
          trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
          thumbColor={preferences.low_stock ? '#FFFFFF' : '#F4F3F4'}
          disabled={permissionStatus !== 'granted'}
        />
      </View>

      <View style={styles.preferenceCard}>
        <View style={styles.preferenceHeader}>
          <Icon name='alert-circle' size={20} color='#FF3B30' />
          <Text style={styles.preferenceTitle}>Out of Stock Alerts</Text>
        </View>
        <Text style={styles.preferenceDescription}>
          Get notified immediately when products are completely out of stock
        </Text>
        <Switch
          value={preferences.out_of_stock}
          onValueChange={(value) => updatePreference('out_of_stock', value)}
          trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
          thumbColor={preferences.out_of_stock ? '#FFFFFF' : '#F4F3F4'}
          disabled={permissionStatus !== 'granted'}
        />
      </View>

      <View style={styles.preferenceCard}>
        <View style={styles.preferenceHeader}>
          <Icon name='information-circle' size={20} color='#007AFF' />
          <Text style={styles.preferenceTitle}>Urgent Messages</Text>
        </View>
        <Text style={styles.preferenceDescription}>
          Get notified about critical system messages and important updates
        </Text>
        <Switch
          value={preferences.urgent_message}
          onValueChange={(value) => updatePreference('urgent_message', value)}
          trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
          thumbColor={preferences.urgent_message ? '#FFFFFF' : '#F4F3F4'}
          disabled={permissionStatus !== 'granted'}
        />
      </View>
    </View>
  );

  const renderTestingSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Testing & Monitoring</Text>
      
      <TouchableOpacity
        style={[styles.actionButton, permissionStatus !== 'granted' && styles.disabledButton]}
        onPress={handleTestNotification}
        disabled={permissionStatus !== 'granted' || testingNotification}
      >
        {testingNotification ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Icon name='notifications' size={20} color='white' />
        )}
        <Text style={styles.actionButtonText}>Send Test Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.stockCheckButton]}
        onPress={handleStockCheck}
      >
        <Icon name='search' size={20} color='white' />
        <Text style={styles.actionButtonText}>Check Stock Levels Now</Text>
      </TouchableOpacity>

      {monitoringStats.lastCheckAt && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Last Monitoring Check</Text>
          <Text style={styles.statsText}>
            {new Date(monitoringStats.lastCheckAt).toLocaleString()}
          </Text>
          <Text style={styles.statsText}>
            Products: {monitoringStats.totalProducts} | Low Stock: {monitoringStats.lowStockProducts} | Out of Stock: {monitoringStats.outOfStockProducts}
          </Text>
          <Text style={styles.statsText}>
            Alerts Sent: {monitoringStats.alertsSent}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderPermissionStatus()}
        {renderNotificationPreferences()}
        {renderTestingSection()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  permissionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tokenInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  enableButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  preferenceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
    marginRight: 16,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  stockCheckButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default NotificationSettingsScreen;