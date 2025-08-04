import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { auditLogger } from '../lib/auditLogger';
import { AuditLog, AuditLogFilters, AuditActionType, AuditEntityType } from '../lib/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AuditLogFilters) => void;
  currentFilters: AuditLogFilters;
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState<AuditLogFilters>(currentFilters);

  const actionTypes: AuditActionType[] = [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'ROLE_CHANGE', 'PRODUCT_CREATE',
    'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'STOCK_ADJUSTMENT', 'SALE_CREATE',
    'RECEIPT_GENERATE', 'PERMISSION_DENIED', 'USER_CREATE', 'USER_UPDATE',
    'USER_DELETE', 'EXPORT_AUDIT_LOGS'
  ];

  const entityTypes: AuditEntityType[] = ['USER', 'PRODUCT', 'SALE', 'RECEIPT', 'ROLE', 'SYSTEM'];

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Audit Logs</Text>
          <TouchableOpacity onPress={handleApply}>
            <Text style={[styles.modalButton, styles.applyButton]}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>User ID</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.user_id || ''}
              onChangeText={(text) => setFilters(prev => ({ ...prev, user_id: text || undefined }))}
              placeholder="Enter user ID"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Action Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              <TouchableOpacity
                style={[styles.chip, !filters.action_type && styles.chipSelected]}
                onPress={() => setFilters(prev => ({ ...prev, action_type: undefined }))}
              >
                <Text style={[styles.chipText, !filters.action_type && styles.chipTextSelected]}>All</Text>
              </TouchableOpacity>
              {actionTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, filters.action_type === type && styles.chipSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, action_type: type }))}
                >
                  <Text style={[styles.chipText, filters.action_type === type && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Entity Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              <TouchableOpacity
                style={[styles.chip, !filters.entity_type && styles.chipSelected]}
                onPress={() => setFilters(prev => ({ ...prev, entity_type: undefined }))}
              >
                <Text style={[styles.chipText, !filters.entity_type && styles.chipTextSelected]}>All</Text>
              </TouchableOpacity>
              {entityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, filters.entity_type === type && styles.chipSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, entity_type: type }))}
                >
                  <Text style={[styles.chipText, filters.entity_type === type && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Success Status</Text>
            <View style={styles.successFilter}>
              <TouchableOpacity
                style={[styles.chip, filters.success === undefined && styles.chipSelected]}
                onPress={() => setFilters(prev => ({ ...prev, success: undefined }))}
              >
                <Text style={[styles.chipText, filters.success === undefined && styles.chipTextSelected]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, filters.success === true && styles.chipSelected]}
                onPress={() => setFilters(prev => ({ ...prev, success: true }))}
              >
                <Text style={[styles.chipText, filters.success === true && styles.chipTextSelected]}>Success</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, filters.success === false && styles.chipSelected]}
                onPress={() => setFilters(prev => ({ ...prev, success: false }))}
              >
                <Text style={[styles.chipText, filters.success === false && styles.chipTextSelected]}>Failed</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const AuditLogScreen: React.FC = () => {
  const { userRole } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const checkPermissionAndLoadLogs = useCallback(async () => {
    try {
      const permission = await auditLogger.hasAuditPermission();
      setHasPermission(permission);

      if (!permission) {
        await auditLogger.logPermissionDenied('VIEW', 'audit_logs');
        return;
      }

      const { data, error } = await auditLogger.getLogs(filters);
      if (error) {
        Alert.alert('Error', `Failed to load audit logs: ${error}`);
      } else {
        setLogs(data);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load audit logs: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    checkPermissionAndLoadLogs();
  }, [checkPermissionAndLoadLogs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkPermissionAndLoadLogs();
  }, [checkPermissionAndLoadLogs]);

  const handleApplyFilters = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setLoading(true);
  };

  const exportLogs = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const { data, error } = await auditLogger.exportLogs(filters, format);
      
      if (error) {
        Alert.alert('Export Error', error);
        return;
      }

      if (!data) {
        Alert.alert('Export Error', 'No data to export');
        return;
      }

      // Save to file
      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, data);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'json' ? 'application/json' : 'text/csv',
          dialogTitle: 'Export Audit Logs'
        });
      } else {
        Alert.alert('Export Complete', `Logs saved to: ${filename}`);
      }
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    } finally {
      setExporting(false);
    }
  };

  const showExportOptions = () => {
    Alert.alert(
      'Export Audit Logs',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'JSON', onPress: () => exportLogs('json') },
        { text: 'CSV', onPress: () => exportLogs('csv') },
      ]
    );
  };

  const renderLogItem = ({ item }: { item: AuditLog }) => {
    const getStatusColor = () => {
      if (item.success) return '#4CAF50';
      return '#F44336';
    };

    const getActionTypeColor = () => {
      switch (item.action_type) {
        case 'LOGIN':
        case 'LOGOUT':
          return '#2196F3';
        case 'LOGIN_FAILED':
        case 'PERMISSION_DENIED':
          return '#F44336';
        case 'ROLE_CHANGE':
          return '#FF9800';
        case 'STOCK_ADJUSTMENT':
        case 'PRODUCT_UPDATE':
          return '#9C27B0';
        default:
          return '#757575';
      }
    };

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => setSelectedLog(item)}
      >
        <View style={styles.logHeader}>
          <View style={[styles.actionTypeBadge, { backgroundColor: getActionTypeColor() }]}>
            <Text style={styles.actionTypeText}>{item.action_type}</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        </View>
        <Text style={styles.logDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.logMeta}>
          <Text style={styles.logUser}>{item.user_email || item.user_id}</Text>
          <Text style={styles.logTime}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLogDetail = () => {
    if (!selectedLog) return null;

    return (
      <Modal visible={!!selectedLog} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedLog(null)}>
              <Text style={styles.modalButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Audit Log Details</Text>
            <View />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Action Type</Text>
              <Text style={styles.detailValue}>{selectedLog.action_type}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Entity Type</Text>
              <Text style={styles.detailValue}>{selectedLog.entity_type}</Text>
            </View>

            {selectedLog.entity_id && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Entity ID</Text>
                <Text style={styles.detailValue}>{selectedLog.entity_id}</Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedLog.description}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>User</Text>
              <Text style={styles.detailValue}>{selectedLog.user_email || selectedLog.user_id}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Success</Text>
              <Text style={[styles.detailValue, { color: selectedLog.success ? '#4CAF50' : '#F44336' }]}>
                {selectedLog.success ? 'Yes' : 'No'}
              </Text>
            </View>

            {selectedLog.error_message && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Error Message</Text>
                <Text style={[styles.detailValue, { color: '#F44336' }]}>{selectedLog.error_message}</Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>{new Date(selectedLog.created_at).toLocaleString()}</Text>
            </View>

            {selectedLog.old_values && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Old Values</Text>
                <Text style={styles.detailValue}>{JSON.stringify(selectedLog.old_values, null, 2)}</Text>
              </View>
            )}

            {selectedLog.new_values && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>New Values</Text>
                <Text style={styles.detailValue}>{JSON.stringify(selectedLog.new_values, null, 2)}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (!hasPermission && !loading) {
    return (
      <View style={styles.permissionDenied}>
        <Text style={styles.permissionDeniedText}>
          Access Denied
        </Text>
        <Text style={styles.permissionDeniedSubtext}>
          You need admin privileges to view audit logs.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading audit logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>🔍 Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={showExportOptions}
            disabled={exporting}
          >
            <Text style={styles.exportButtonText}>
              {exporting ? '📤 Exporting...' : '📤 Export'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No audit logs found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        }
      />

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />

      {renderLogDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logUser: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  logTime: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  permissionDeniedSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  applyButton: {
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  successFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  clearButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default AuditLogScreen;