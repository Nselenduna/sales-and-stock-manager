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
import { securityManager, SecurityConfig, SecurityEvent } from '../../lib/security/securityManager';
import { rateLimiter, RATE_LIMIT_CONFIGS } from '../../lib/security/rateLimiter';
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
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SecuritySetting | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    initializeSecurityData();
  }, []);

  const initializeSecurityData = async () => {
    try {
      setLoading(true);
      
      // Initialize security manager
      await securityManager.init();
      
      // Load security configuration
      const config = securityManager.getConfig();
      setSecurityConfig(config);
      
      // Load recent security events
      const events = securityManager.getSecurityEvents(20);
      setSecurityEvents(events);
      
      // Fetch database security settings if they exist
      await fetchSecuritySettings();
    } catch (error) {
      console.error('Error initializing security data:', error);
      Alert.alert('Error', 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      // Try to fetch from database, but don't fail if table doesn't exist
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .order('setting_key');

      if (error && !error.message.includes('relation "security_settings" does not exist')) {
        console.error('Error fetching security settings:', error);
        Alert.alert('Error', 'Failed to fetch security settings');
        return;
      }

      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      // Don't show error if table doesn't exist yet
    }
  };

  const handleConfigUpdate = async (newConfig: Partial<SecurityConfig>) => {
    try {
      await securityManager.updateConfig(newConfig);
      setSecurityConfig(securityManager.getConfig());
      Alert.alert('Success', 'Security configuration updated');
    } catch (error) {
      console.error('Error updating security config:', error);
      Alert.alert('Error', 'Failed to update security configuration');
    }
  };

  const handleClearSecurityEvents = async () => {
    Alert.alert(
      'Clear Security Events',
      'Are you sure you want to clear all security event logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await securityManager.clearSecurityEvents();
              setSecurityEvents([]);
              Alert.alert('Success', 'Security events cleared');
            } catch (error) {
              console.error('Error clearing security events:', error);
              Alert.alert('Error', 'Failed to clear security events');
            }
          },
        },
      ]
    );
  };

  const handleClearRateLimits = async () => {
    Alert.alert(
      'Clear Rate Limits',
      'Are you sure you want to clear all rate limiting data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await rateLimiter.clearAllRateLimits();
              Alert.alert('Success', 'Rate limits cleared');
            } catch (error) {
              console.error('Error clearing rate limits:', error);
              Alert.alert('Error', 'Failed to clear rate limits');
            }
          },
        },
      ]
    );
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

  const renderSecurityOverview = () => (
    <View style={styles.overviewSection}>
      <Text style={styles.sectionTitle}>Security Overview</Text>
      
      <View style={styles.overviewGrid}>
        <TouchableOpacity 
          style={styles.overviewCard}
          onPress={() => setShowEventsModal(true)}
        >
          <Icon name="shield-checkmark" size={24} color="#059669" />
          <Text style={styles.overviewNumber}>{securityEvents.length}</Text>
          <Text style={styles.overviewLabel}>Security Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.overviewCard}
          onPress={() => setShowConfigModal(true)}
        >
          <Icon name="settings" size={24} color="#2563eb" />
          <Text style={styles.overviewNumber}>
            {securityConfig?.sessionTimeout ? Math.round(securityConfig.sessionTimeout / 60000) : 0}m
          </Text>
          <Text style={styles.overviewLabel}>Session Timeout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.overviewCard}
          onPress={handleClearRateLimits}
        >
          <Icon name="speedometer" size={24} color="#dc2626" />
          <Text style={styles.overviewNumber}>{Object.keys(RATE_LIMIT_CONFIGS).length}</Text>
          <Text style={styles.overviewLabel}>Rate Limits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSecurityConfigModal = () => (
    <Modal
      visible={showConfigModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Security Configuration</Text>
          
          {securityConfig && (
            <ScrollView style={styles.configContainer}>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Session Timeout (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={Math.round(securityConfig.sessionTimeout / 60000).toString()}
                  onChangeText={(value) => {
                    const minutes = parseInt(value) || 0;
                    handleConfigUpdate({ sessionTimeout: minutes * 60000 });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Max Concurrent Sessions</Text>
                <TextInput
                  style={styles.input}
                  value={securityConfig.maxConcurrentSessions.toString()}
                  onChangeText={(value) => {
                    const sessions = parseInt(value) || 1;
                    handleConfigUpdate({ maxConcurrentSessions: sessions });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.configItem}>
                <View style={styles.switchRow}>
                  <Text style={styles.configLabel}>Enforce Strong Passwords</Text>
                  <Switch
                    value={securityConfig.enforceStrongPasswords}
                    onValueChange={(value) => handleConfigUpdate({ enforceStrongPasswords: value })}
                  />
                </View>
              </View>
              
              <View style={styles.configItem}>
                <View style={styles.switchRow}>
                  <Text style={styles.configLabel}>Log Security Events</Text>
                  <Switch
                    value={securityConfig.logSecurityEvents}
                    onValueChange={(value) => handleConfigUpdate({ logSecurityEvents: value })}
                  />
                </View>
              </View>
            </ScrollView>
          )}
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowConfigModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSecurityEventsModal = () => (
    <Modal
      visible={showEventsModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.eventsHeader}>
            <Text style={styles.modalTitle}>Security Events</Text>
            <TouchableOpacity
              style={styles.clearEventsButton}
              onPress={handleClearSecurityEvents}
            >
              <Text style={styles.clearEventsText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.eventsContainer}>
            {securityEvents.length === 0 ? (
              <Text style={styles.noEventsText}>No security events recorded</Text>
            ) : (
              securityEvents.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventType}>{event.type.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  {event.email && (
                    <Text style={styles.eventDetail}>Email: {event.email}</Text>
                  )}
                  {event.details && (
                    <Text style={styles.eventDetail}>Details: {event.details}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowEventsModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
          onPress={initializeSecurityData}
        >
          <Icon name="sync" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {renderSecurityOverview()}

      <ScrollView style={styles.settingsContainer}>
        {/* Database Settings */}
        {Object.keys(groupedSettings).length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Database Security Settings</Text>
            {Object.entries(groupedSettings).map(([category, categorySettings]) =>
              renderCategorySection(category, categorySettings)
            )}
          </View>
        )}

        {/* Rate Limiting Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Rate Limiting Configuration</Text>
          <View style={styles.rateLimitContainer}>
            {Object.entries(RATE_LIMIT_CONFIGS).map(([endpoint, config]) => (
              <View key={endpoint} style={styles.rateLimitItem}>
                <Text style={styles.rateLimitEndpoint}>{endpoint}</Text>
                <Text style={styles.rateLimitConfig}>
                  {config.maxAttempts} attempts / {Math.round(config.windowMs / 60000)}min
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Security Configuration Modal */}
      {renderSecurityConfigModal()}

      {/* Security Events Modal */}
      {renderSecurityEventsModal()}

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
  overviewSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  rateLimitContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rateLimitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rateLimitEndpoint: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  rateLimitConfig: {
    fontSize: 14,
    color: '#64748b',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  configContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  configItem: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clearEventsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  clearEventsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  noEventsText: {
    textAlign: 'center',
    color: '#64748b',
    fontStyle: 'italic',
  },
  eventItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  eventTime: {
    fontSize: 10,
    color: '#64748b',
  },
  eventDetail: {
    fontSize: 12,
    color: '#374151',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#64748b',
  },
  closeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
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