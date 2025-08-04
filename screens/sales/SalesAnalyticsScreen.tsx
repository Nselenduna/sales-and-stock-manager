import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency } from '../../lib/utils';
import { isUIPolishEnabled } from '../../feature_flags/ui-polish';

interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  topProduct: {
    name: string;
    quantity: number;
    revenue: number;
  } | null;
  recentTransactions: number;
}

interface SalesAnalyticsScreenProps {
  navigation: any;
}

const SalesAnalyticsScreen: React.FC<SalesAnalyticsScreenProps> = ({
  navigation,
}) => {
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    topProduct: null,
    recentTransactions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>(
    'today'
  );
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const startDate = getStartDate(timeRange);

      // Get sales transactions for the time range
      const { data: transactions, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const salesData = transactions || [];

      // Calculate metrics
      const totalRevenue = salesData.reduce(
        (sum, sale) => sum + (sale.total || 0),
        0
      );
      const totalSales = salesData.length;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Get top selling product
      const productSales = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();

      salesData.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const existing = productSales.get(item.product_id) || {
              name: item.product_name || 'Unknown',
              quantity: 0,
              revenue: 0,
            };
            existing.quantity += item.quantity || 0;
            existing.revenue += (item.unit_price || 0) * (item.quantity || 0);
            productSales.set(item.product_id, existing);
          });
        }
      });

      const topProduct =
        Array.from(productSales.values()).sort(
          (a, b) => b.quantity - a.quantity
        )[0] || null;

      // Get recent transactions (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recentTransactions = salesData.filter(
        sale => new Date(sale.created_at) > yesterday
      ).length;

      setMetrics({
        totalRevenue,
        totalSales,
        averageOrderValue,
        topProduct,
        recentTransactions,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert('Error', 'Failed to load sales analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = (range: 'today' | 'week' | 'month'): Date => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const renderMetricCard = (
    title: string,
    value: string,
    subtitle?: string,
    icon?: string,
    color?: string
  ) => (
    <View style={[styles.metricCard, { borderLeftColor: color || '#007AFF' }]}>
      <View style={styles.metricHeader}>
        {icon && <Icon name={icon} size={20} color={color || '#007AFF'} />}
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: color || '#007AFF' }]}>
        {value}
      </Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderTimeRangeButton = (
    range: 'today' | 'week' | 'month',
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.timeRangeButton,
        timeRange === range && styles.timeRangeButtonActive,
      ]}
      onPress={() => setTimeRange(range)}
    >
      <Text
        style={[
          styles.timeRangeButtonText,
          timeRange === range && styles.timeRangeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        isUIPolishEnabled('safeAreaInsets') && { paddingTop: insets.top + 10 },
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Sales Analytics</Text>
        <Text style={styles.headerSubtitle}>
          {timeRange === 'today'
            ? 'Today'
            : timeRange === 'week'
              ? 'Last 7 Days'
              : 'Last 30 Days'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessible={true}
        accessibilityLabel='Go back'
        accessibilityRole='button'
      >
        <Icon name='arrow-back' size={24} color='white' />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#007AFF' />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {renderTimeRangeButton('today', 'Today')}
          {renderTimeRangeButton('week', 'Week')}
          {renderTimeRangeButton('month', 'Month')}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Revenue',
            formatCurrency(metrics.totalRevenue),
            `${metrics.totalSales} sales`,
            'receipt',
            '#34C759'
          )}

          {renderMetricCard(
            'Total Sales',
            metrics.totalSales.toString(),
            'transactions',
            'shopping-cart',
            '#007AFF'
          )}

          {renderMetricCard(
            'Average Order',
            formatCurrency(metrics.averageOrderValue),
            'per transaction',
            'price',
            '#FF9500'
          )}

          {renderMetricCard(
            'Recent Sales',
            metrics.recentTransactions.toString(),
            'last 24 hours',
            'clock',
            '#5856D6'
          )}
        </View>

        {/* Top Product */}
        {metrics.topProduct && (
          <View style={styles.topProductCard}>
            <View style={styles.topProductHeader}>
              <Icon name='cube' size={24} color='#FF3B30' />
              <Text style={styles.topProductTitle}>Top Selling Product</Text>
            </View>
            <Text style={styles.topProductName}>{metrics.topProduct.name}</Text>
            <View style={styles.topProductStats}>
              <View style={styles.topProductStat}>
                <Text style={styles.topProductStatLabel}>Quantity Sold</Text>
                <Text style={styles.topProductStatValue}>
                  {metrics.topProduct.quantity}
                </Text>
              </View>
              <View style={styles.topProductStat}>
                <Text style={styles.topProductStatLabel}>Revenue</Text>
                <Text style={styles.topProductStatValue}>
                  {formatCurrency(metrics.topProduct.revenue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Sales')}
            >
              <Icon name='shopping-cart' size={24} color='#007AFF' />
              <Text style={styles.quickActionText}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('SalesHistory')}
            >
              <Icon name='history' size={24} color='#FF9500' />
              <Text style={styles.quickActionText}>Sales History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('StockAlerts')}
            >
              <Icon name='alert-circle' size={24} color='#FF3B30' />
              <Text style={styles.quickActionText}>Stock Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Icon name='list' size={24} color='#34C759' />
              <Text style={styles.quickActionText}>Inventory</Text>
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
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: 'white',
  },
  metricsGrid: {
    padding: 20,
    gap: 16,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  topProductCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  topProductTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topProductName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  topProductStats: {
    flexDirection: 'row',
    gap: 20,
  },
  topProductStat: {
    flex: 1,
  },
  topProductStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  topProductStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SalesAnalyticsScreen;
