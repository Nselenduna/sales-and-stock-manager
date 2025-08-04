import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface UserActivityScreenProps {
  navigation: any;
}

const UserActivityScreen: React.FC<UserActivityScreenProps> = ({
  navigation,
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'info' | 'warning' | 'error' | 'critical'
  >('all');

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);

      // For now, we'll create mock activity data since we don't have a real activity log table
      // In a real implementation, you would query a user_activity_logs table
      const mockActivities: ActivityLog[] = [
        {
          id: '1',
          user_id: 'user1',
          user_email: 'admin@example.com',
          user_name: 'Admin User',
          action: 'LOGIN',
          details: 'User logged in successfully',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date().toISOString(),
          severity: 'info',
        },
        {
          id: '2',
          user_id: 'user2',
          user_email: 'manager@example.com',
          user_name: 'Manager User',
          action: 'SALE_CREATED',
          details: 'Created new sale #SALE-001 for $150.00',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          severity: 'info',
        },
        {
          id: '3',
          user_id: 'user1',
          user_email: 'admin@example.com',
          user_name: 'Admin User',
          action: 'USER_CREATED',
          details: 'Created new user: staff@example.com',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          severity: 'info',
        },
        {
          id: '4',
          user_id: 'user3',
          user_email: 'staff@example.com',
          user_name: 'Staff User',
          action: 'INVENTORY_UPDATE',
          details: 'Updated product quantity for "Laptop" from 10 to 8',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 10800000).toISOString(),
          severity: 'warning',
        },
        {
          id: '5',
          user_id: 'user2',
          user_email: 'manager@example.com',
          user_name: 'Manager User',
          action: 'LOGIN_FAILED',
          details: 'Failed login attempt with incorrect password',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 14400000).toISOString(),
          severity: 'warning',
        },
        {
          id: '6',
          user_id: 'user1',
          user_email: 'admin@example.com',
          user_name: 'Admin User',
          action: 'SYSTEM_BACKUP',
          details: 'Automated system backup completed successfully',
          ip_address: '192.168.1.100',
          user_agent: 'System/1.0',
          created_at: new Date(Date.now() - 18000000).toISOString(),
          severity: 'info',
        },
        {
          id: '7',
          user_id: 'user4',
          user_email: 'unknown@example.com',
          user_name: 'Unknown User',
          action: 'UNAUTHORIZED_ACCESS',
          details: 'Attempted to access admin panel without permission',
          ip_address: '192.168.1.103',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 21600000).toISOString(),
          severity: 'error',
        },
        {
          id: '8',
          user_id: 'user1',
          user_email: 'admin@example.com',
          user_name: 'Admin User',
          action: 'DATA_EXPORT',
          details: 'Exported sales report for Q1 2024',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          created_at: new Date(Date.now() - 25200000).toISOString(),
          severity: 'info',
        },
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      Alert.alert('Error', 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivityLogs();
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return '#2563eb';
      case 'warning':
        return '#ea580c';
      case 'error':
        return '#dc2626';
      case 'critical':
        return '#7c2d12';
      default:
        return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'info';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'login';
      case 'LOGOUT':
        return 'logout';
      case 'SALE_CREATED':
        return 'receipt';
      case 'INVENTORY_UPDATE':
        return 'inventory';
      case 'USER_CREATED':
        return 'person-add';
      case 'USER_UPDATED':
        return 'edit';
      case 'DATA_EXPORT':
        return 'download';
      case 'SYSTEM_BACKUP':
        return 'backup';
      default:
        return 'info';
    }
  };

  const filteredActivities = activities.filter(
    activity => filter === 'all' || activity.severity === filter
  );

  const renderActivityItem = ({ item }: { item: ActivityLog }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityInfo}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.userEmail}>{item.user_email}</Text>
          </View>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(item.severity) },
            ]}
          >
            <Icon
              name={getSeverityIcon(item.severity)}
              size={12}
              color='white'
            />
            <Text style={styles.severityText}>
              {item.severity.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>

      <View style={styles.activityContent}>
        <View style={styles.actionContainer}>
          <Icon name={getActionIcon(item.action)} size={16} color='#64748b' />
          <Text style={styles.actionText}>{item.action.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.detailsText}>{item.details}</Text>

        {item.ip_address && (
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>IP: {item.ip_address}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const FilterButton = ({
    title,
    value,
    onPress,
  }: {
    title: string;
    value: 'all' | 'info' | 'warning' | 'error' | 'critical';
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name='arrow-back' size={24} color='white' />
        </TouchableOpacity>
        <Text style={styles.title}>User Activity Log</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() =>
            Alert.alert('Export', 'Export functionality coming soon')
          }
        >
          <Icon name='download' size={24} color='white' />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activities.length}</Text>
          <Text style={styles.statLabel}>Total Activities</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {
              activities.filter(
                a => a.severity === 'error' || a.severity === 'critical'
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Errors</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {activities.filter(a => a.action === 'LOGIN').length}
          </Text>
          <Text style={styles.statLabel}>Logins</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            title='All'
            value='all'
            onPress={() => setFilter('all')}
          />
          <FilterButton
            title='Info'
            value='info'
            onPress={() => setFilter('info')}
          />
          <FilterButton
            title='Warning'
            value='warning'
            onPress={() => setFilter('warning')}
          />
          <FilterButton
            title='Error'
            value='error'
            onPress={() => setFilter('error')}
          />
          <FilterButton
            title='Critical'
            value='critical'
            onPress={() => setFilter('critical')}
          />
        </ScrollView>
      </View>

      <FlatList
        data={filteredActivities}
        renderItem={renderActivityItem}
        keyExtractor={item => item.id}
        style={styles.activityList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name='activity' size={48} color='#9ca3af' />
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        }
      />
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
  exportButton: {
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  activityList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activityHeader: {
    marginBottom: 12,
  },
  activityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  activityContent: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default UserActivityScreen;
