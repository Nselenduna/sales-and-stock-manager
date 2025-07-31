import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface LiveMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const RealTimeDashboardScreen: React.FC = () => {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    initializeRealTimeData();
    startRealTimeUpdates();
    startPulseAnimation();

    return () => {
      // Cleanup real-time subscriptions
    };
  }, []);

  const initializeRealTimeData = () => {
    // Initialize with mock data
    const initialMetrics: LiveMetric[] = [
      {
        id: '1',
        title: 'Live Sales',
        value: '$2,847',
        change: 12.5,
        trend: 'up',
        color: '#4CAF50',
      },
      {
        id: '2',
        title: 'Active Orders',
        value: 8,
        change: -2.1,
        trend: 'down',
        color: '#2196F3',
      },
      {
        id: '3',
        title: 'Low Stock Items',
        value: 3,
        change: 0,
        trend: 'stable',
        color: '#FF9800',
      },
      {
        id: '4',
        title: 'Online Users',
        value: 12,
        change: 8.3,
        trend: 'up',
        color: '#9C27B0',
      },
    ];
    setLiveMetrics(initialMetrics);

    const initialNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Laptop inventory is running low (5 items remaining)',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
      },
      {
        id: '2',
        type: 'success',
        title: 'New Order',
        message: 'Order #1234 completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        read: false,
      },
      {
        id: '3',
        type: 'info',
        title: 'System Update',
        message: 'Database backup completed successfully',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        read: true,
      },
    ];
    setNotifications(initialNotifications);
  };

  const startRealTimeUpdates = () => {
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      updateLiveMetrics();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const updateLiveMetrics = () => {
    setLiveMetrics(prev => prev.map(metric => ({
      ...metric,
      value: generateRandomValue(metric.title),
      change: generateRandomChange(),
      trend: generateRandomTrend(),
    })));
  };

  const generateRandomValue = (title: string): string | number => {
    switch (title) {
      case 'Live Sales':
        return `$${(Math.random() * 5000 + 1000).toFixed(0)}`;
      case 'Active Orders':
        return Math.floor(Math.random() * 15 + 1);
      case 'Low Stock Items':
        return Math.floor(Math.random() * 8);
      case 'Online Users':
        return Math.floor(Math.random() * 20 + 5);
      default:
        return Math.floor(Math.random() * 100);
    }
  };

  const generateRandomChange = (): number => {
    return Math.random() * 20 - 10; // -10 to +10
  };

  const generateRandomTrend = (): 'up' | 'down' | 'stable' => {
    const rand = Math.random();
    if (rand < 0.4) return 'up';
    if (rand < 0.8) return 'down';
    return 'stable';
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'check-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return '#2196F3';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'success':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Real-Time Dashboard</Text>
          <View style={styles.statusIndicator}>
            <Animated.View 
              style={[
                styles.statusDot, 
                { 
                  backgroundColor: isConnected ? '#4CAF50' : '#F44336',
                  transform: [{ scale: pulseAnim }]
                }
              ]} 
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>
        <Text style={styles.lastUpdate}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Live Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Metrics</Text>
          <View style={styles.metricsGrid}>
            {liveMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>{metric.title}</Text>
                  <Icon 
                    name={getTrendIcon(metric.trend)} 
                    size={16} 
                    color={getTrendColor(metric.trend)} 
                  />
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={[
                  styles.metricChange,
                  { color: getTrendColor(metric.trend) }
                ]}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Notifications</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.notificationsContainer}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadNotification
                ]}
                onPress={() => markNotificationAsRead(notification.id)}
              >
                <View style={styles.notificationIcon}>
                  <Icon 
                    name={getNotificationIcon(notification.type)} 
                    size={20} 
                    color={getNotificationColor(notification.type)} 
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.timestamp)}
                  </Text>
                </View>
                {!notification.read && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="refresh" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Refresh Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="settings" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="download" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="help" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationsContainer: {
    gap: 8,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default RealTimeDashboardScreen; 