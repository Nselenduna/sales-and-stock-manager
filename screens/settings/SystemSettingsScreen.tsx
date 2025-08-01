import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: 'boolean' | 'string' | 'number';
  category: string;
  description: string;
  default_value: string;
}

interface SystemSettingsScreenProps {
  navigation: any;
}

const SystemSettingsScreen: React.FC<SystemSettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [editValue, setEditValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      
      // Try to load from database first
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category, key');

      if (error) {
        console.error('Error fetching system settings:', error);
        // Use default settings if database table doesn't exist
        initializeDefaultSettings();
      } else {
        setSettings(data || []);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      initializeDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSettings = () => {
    const defaultSettings: SystemSetting[] = [
      // General Settings
      {
        id: '1',
        key: 'company_name',
        value: 'My Business',
        type: 'string',
        category: 'General',
        description: 'Company name displayed throughout the application',
        default_value: 'My Business'
      },
      {
        id: '2',
        key: 'timezone',
        value: 'UTC',
        type: 'string',
        category: 'General',
        description: 'Default timezone for the application',
        default_value: 'UTC'
      },
      {
        id: '3',
        key: 'currency',
        value: 'USD',
        type: 'string',
        category: 'General',
        description: 'Default currency for transactions',
        default_value: 'USD'
      },

      // Sales Settings
      {
        id: '4',
        key: 'tax_rate',
        value: '0.08',
        type: 'number',
        category: 'Sales',
        description: 'Default tax rate for sales (as decimal)',
        default_value: '0.08'
      },
      {
        id: '5',
        key: 'auto_calculate_tax',
        value: 'true',
        type: 'boolean',
        category: 'Sales',
        description: 'Automatically calculate tax on sales',
        default_value: 'true'
      },
      {
        id: '6',
        key: 'require_customer_info',
        value: 'false',
        type: 'boolean',
        category: 'Sales',
        description: 'Require customer information for all sales',
        default_value: 'false'
      },

      // Inventory Settings
      {
        id: '7',
        key: 'low_stock_threshold',
        value: '5',
        type: 'number',
        category: 'Inventory',
        description: 'Default low stock threshold for products',
        default_value: '5'
      },
      {
        id: '8',
        key: 'auto_restock_alerts',
        value: 'true',
        type: 'boolean',
        category: 'Inventory',
        description: 'Send automatic restock alerts',
        default_value: 'true'
      },
      {
        id: '9',
        key: 'track_inventory_history',
        value: 'true',
        type: 'boolean',
        category: 'Inventory',
        description: 'Track inventory change history',
        default_value: 'true'
      },

      // Notification Settings
      {
        id: '10',
        key: 'email_notifications',
        value: 'true',
        type: 'boolean',
        category: 'Notifications',
        description: 'Enable email notifications',
        default_value: 'true'
      },
      {
        id: '11',
        key: 'push_notifications',
        value: 'true',
        type: 'boolean',
        category: 'Notifications',
        description: 'Enable push notifications',
        default_value: 'true'
      },
      {
        id: '12',
        key: 'daily_reports',
        value: 'false',
        type: 'boolean',
        category: 'Notifications',
        description: 'Send daily summary reports',
        default_value: 'false'
      },

      // Backup Settings
      {
        id: '13',
        key: 'auto_backup',
        value: 'true',
        type: 'boolean',
        category: 'Backup',
        description: 'Enable automatic data backup',
        default_value: 'true'
      },
      {
        id: '14',
        key: 'backup_frequency',
        value: 'daily',
        type: 'string',
        category: 'Backup',
        description: 'Backup frequency (daily, weekly, monthly)',
        default_value: 'daily'
      },
      {
        id: '15',
        key: 'retain_backups',
        value: '30',
        type: 'number',
        category: 'Backup',
        description: 'Number of backups to retain',
        default_value: '30'
      }
    ];

    setSettings(defaultSettings);
  };

  const handleSettingToggle = async (setting: SystemSetting, newValue: string) => {
    try {
      // Try to save to database
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: setting.id,
          key: setting.key,
          value: newValue,
          type: setting.type,
          category: setting.category,
          description: setting.description,
          default_value: setting.default_value
        });

      if (error) {
        console.error('Error saving setting:', error);
      }

      // Update local state
      setSettings(prev => 
        prev.map(s => 
          s.id === setting.id 
            ? { ...s, value: newValue }
            : s
        )
      );

      Alert.alert('Success', 'Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleEditSetting = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    setEditValue(setting.value);
    setShowEditModal(true);
  };

  const saveEditSetting = async () => {
    if (!selectedSetting) return;

    try {
      // Try to save to database
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: selectedSetting.id,
          key: selectedSetting.key,
          value: editValue,
          type: selectedSetting.type,
          category: selectedSetting.category,
          description: selectedSetting.description,
          default_value: selectedSetting.default_value
        });

      if (error) {
        console.error('Error saving setting:', error);
      }

      // Update local state
      setSettings(prev => 
        prev.map(s => 
          s.id === selectedSetting.id 
            ? { ...s, value: editValue }
            : s
        )
      );

      setShowEditModal(false);
      setSelectedSetting(null);
      setEditValue('');
      Alert.alert('Success', 'Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const resetToDefault = async (setting: SystemSetting) => {
    Alert.alert(
      'Reset Setting',
      `Reset "${setting.key}" to default value "${setting.default_value}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => handleSettingToggle(setting, setting.default_value)
        }
      ]
    );
  };

  const getSettingIcon = (category: string) => {
    switch (category) {
      case 'General': return 'settings';
      case 'Sales': return 'receipt';
      case 'Inventory': return 'box';
      case 'Notifications': return 'bell';
      case 'Backup': return 'cloud';
      default: return 'info';
    }
  };

  const getSettingColor = (category: string) => {
    switch (category) {
      case 'General': return '#007AFF';
      case 'Sales': return '#4CAF50';
      case 'Inventory': return '#FF9800';
      case 'Notifications': return '#9C27B0';
      case 'Backup': return '#607D8B';
      default: return '#666';
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as { [key: string]: SystemSetting[] });

  const renderSettingItem = (setting: SystemSetting) => (
    <View key={setting.id} style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Icon 
            name={getSettingIcon(setting.category)} 
            size={20} 
            color={getSettingColor(setting.category)} 
          />
          <Text style={styles.settingKey}>
            {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <Text style={styles.settingDescription}>{setting.description}</Text>
        <Text style={styles.settingValue}>
          Current: {setting.value} {setting.type === 'boolean' ? '' : `(${setting.type})`}
        </Text>
      </View>
      
      <View style={styles.settingControls}>
        {setting.type === 'boolean' ? (
          <Switch
            value={setting.value === 'true'}
            onValueChange={(value) => handleSettingToggle(setting, value.toString())}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor={setting.value === 'true' ? '#ffffff' : '#f4f3f4'}
          />
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditSetting(setting)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => resetToDefault(setting)}
        >
          <Icon name="refresh" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategorySection = (category: string, categorySettings: SystemSetting[]) => (
    <View key={category} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Icon 
          name={getSettingIcon(category)} 
          size={24} 
          color={getSettingColor(category)} 
        />
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <Text style={styles.categoryCount}>{categorySettings.length} settings</Text>
        </View>
      </View>
      {categorySettings.map(renderSettingItem)}
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSystemSettings();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>System Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading system settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>System Settings</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="sync" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{settings.length}</Text>
          <Text style={styles.statLabel}>Total Settings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.keys(groupedSettings).length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {settings.filter(s => s.value === s.default_value).length}
          </Text>
          <Text style={styles.statLabel}>Default Values</Text>
        </View>
      </View>

      <ScrollView style={styles.settingsContainer}>
        {Object.entries(groupedSettings).map(([category, categorySettings]) =>
          renderCategorySection(category, categorySettings)
        )}
      </ScrollView>

      {/* Edit Setting Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {selectedSetting?.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Text style={styles.modalDescription}>{selectedSetting?.description}</Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${selectedSetting?.type} value`}
              keyboardType={selectedSetting?.type === 'number' ? 'numeric' : 'default'}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedSetting(null);
                  setEditValue('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEditSetting}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingKey: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SystemSettingsScreen; 