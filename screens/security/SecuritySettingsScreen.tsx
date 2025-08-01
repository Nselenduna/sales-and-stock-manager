import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface SecuritySetting {
  setting_key: string;
  setting_value: string;
  description: string;
}

interface SecuritySettingsScreenProps {
  navigation: any;
}

const SecuritySettingsScreen: React.FC<SecuritySettingsScreenProps> = ({
  navigation,
}) => {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SecuritySetting | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .order('setting_key');

      if (error) {
        console.error('Error fetching security settings:', error);
        Alert.alert('Error', 'Failed to fetch security settings');
        return;
      }

      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      Alert.alert('Error', 'Failed to fetch security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingToggle = async (setting: SecuritySetting, newValue: string) => {
    try {
      const { error } = await supabase
        .from('security_settings')
        .update({ setting_value: newValue })
        .eq('setting_key', setting.setting_key);

      if (error) {
        Alert.alert('Error', 'Failed to update setting');
        return;
      }

      // Update local state
      setSettings(prev => 
        prev.map(s => 
          s.setting_key === setting.setting_key 
            ? { ...s, setting_value: newValue }
            : s
        )
      );

      Alert.alert('Success', 'Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleEditSetting = (setting: SecuritySetting) => {
    setSelectedSetting(setting);
    setEditValue(setting.setting_value);
    setShowEditModal(true);
  };

  const saveEditSetting = async () => {
    if (!selectedSetting) return;

    try {
      const { error } = await supabase
        .from('security_settings')
        .update({ setting_value: editValue })
        .eq('setting_key', selectedSetting.setting_key);

      if (error) {
        Alert.alert('Error', 'Failed to update setting');
        return;
      }

      // Update local state
      setSettings(prev => 
        prev.map(s => 
          s.setting_key === selectedSetting.setting_key 
            ? { ...s, setting_value: editValue }
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

  const getSettingCategory = (key: string) => {
    if (key.startsWith('password_')) return 'Password Policy';
    if (key.startsWith('session_')) return 'Session Management';
    if (key.startsWith('max_') || key.startsWith('block_')) return 'Login Security';
    if (key.startsWith('require_2fa')) return 'Two-Factor Authentication';
    if (key.startsWith('api_rate_')) return 'API Security';
    return 'General';
  };

  const getSettingIcon = (key: string) => {
    if (key.startsWith('password_')) return 'lock';
    if (key.startsWith('session_')) return 'clock';
    if (key.startsWith('max_') || key.startsWith('block_')) return 'shield';
    if (key.startsWith('require_2fa')) return 'key';
    if (key.startsWith('api_rate_')) return 'settings';
    return 'info';
  };

  const getSettingColor = (key: string) => {
    if (key.startsWith('password_')) return '#dc2626';
    if (key.startsWith('session_')) return '#2563eb';
    if (key.startsWith('max_') || key.startsWith('block_')) return '#ea580c';
    if (key.startsWith('require_2fa')) return '#059669';
    if (key.startsWith('api_rate_')) return '#7c3aed';
    return '#6b7280';
  };

  const isBooleanSetting = (key: string) => {
    return key.includes('require_') || key.includes('enable_') || key.includes('allow_');
  };

  const isNumericSetting = (key: string) => {
    return key.includes('length') || key.includes('timeout') || key.includes('attempts') || 
           key.includes('duration') || key.includes('limit') || key.includes('window');
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    const category = getSettingCategory(setting.setting_key);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(setting);
    return acc;
  }, {} as { [key: string]: SecuritySetting[] });

  const renderSettingItem = (setting: SecuritySetting) => (
    <View key={setting.setting_key} style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Icon 
            name={getSettingIcon(setting.setting_key)} 
            size={20} 
            color={getSettingColor(setting.setting_key)} 
          />
          <Text style={styles.settingKey}>
            {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <Text style={styles.settingDescription}>{setting.description}</Text>
      </View>
      
      <View style={styles.settingControl}>
        {isBooleanSetting(setting.setting_key) ? (
          <Switch
            value={setting.setting_value === 'true'}
            onValueChange={(value) => handleSettingToggle(setting, value.toString())}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor={setting.setting_value === 'true' ? '#ffffff' : '#f4f3f4'}
          />
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditSetting(setting)}
          >
            <Text style={styles.editButtonText}>
              {isNumericSetting(setting.setting_key) ? setting.setting_value : 'Edit'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategorySection = (category: string, categorySettings: SecuritySetting[]) => (
    <View key={category} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <Text style={styles.categoryCount}>{categorySettings.length} settings</Text>
      </View>
      {categorySettings.map(renderSettingItem)}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Security Settings</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSecuritySettings}
        >
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
            {settings.filter(s => s.setting_value === 'true').length}
          </Text>
          <Text style={styles.statLabel}>Enabled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.keys(groupedSettings).length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
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
            <Text style={styles.modalTitle}>Edit Setting</Text>
            
            {selectedSetting && (
              <>
                <Text style={styles.settingLabel}>
                  {selectedSetting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.settingDescription}>
                  {selectedSetting.description}
                </Text>
                
                <TextInput
                  style={styles.input}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Enter new value"
                  keyboardType={isNumericSetting(selectedSetting.setting_key) ? 'numeric' : 'default'}
                />
              </>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedSetting(null);
                  setEditValue('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#059669',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  settingsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  categoryCount: {
    fontSize: 14,
    color: '#64748b',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingKey: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  settingControl: {
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    marginLeft: 8,
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SecuritySettingsScreen; 