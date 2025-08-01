import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency } from '../../lib/utils';

interface AnalyticsData {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  topProduct: string;
  topProductRevenue: number;
  growthRate: number;
  customerRetention: number;
  inventoryTurnover: number;
  profitMargin: number;
  salesForecast: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color: string;
  }[];
}

const AdvancedAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [salesChartData, setSalesChartData] = useState<ChartData | null>(null);
  const [productChartData, setProductChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get sales metrics from database
      const { data: salesMetrics, error: salesError } = await supabase
        .rpc('get_sales_metrics', { start_date: getStartDate() });

      if (salesError) {
        console.error('Error fetching sales metrics:', salesError);
        setError('Failed to load analytics data. Using mock data.');
      }

      // Get inventory turnover data
      const { data: turnoverData, error: turnoverError } = await supabase
        .rpc('get_inventory_turnover', { start_date: getStartDate() });

      if (turnoverError) {
        console.error('Error fetching inventory turnover:', turnoverError);
      }

      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .rpc('get_customers_from_sales');

      if (customerError) {
        console.error('Error fetching customer data:', customerError);
      }

      // Process real data if available
      if (salesMetrics && salesMetrics.length > 0 && !salesError) {
        const metrics = salesMetrics[0];
        const data: AnalyticsData = {
          totalRevenue: metrics.total_revenue || 0,
          totalSales: metrics.total_sales || 0,
          averageOrderValue: metrics.average_order_value || 0,
          topProduct: metrics.top_product || 'No products',
          topProductRevenue: metrics.top_product_revenue || 0,
          growthRate: calculateGrowthRate(),
          customerRetention: calculateCustomerRetention(customerData),
          inventoryTurnover: calculateInventoryTurnover(turnoverData),
          profitMargin: calculateProfitMargin(),
          salesForecast: calculateSalesForecast(),
        };
        setAnalyticsData(data);
        generateChartData(metrics);
      } else {
        // Use mock data as fallback
        const mockData: AnalyticsData = {
          totalRevenue: 12500.00,
          totalSales: 45,
          averageOrderValue: 277.78,
          topProduct: 'Laptop',
          topProductRevenue: 4500.00,
          growthRate: 12.5,
          customerRetention: 78.3,
          inventoryTurnover: 4.2,
          profitMargin: 23.5,
          salesForecast: 14200.00,
        };
        setAnalyticsData(mockData);
        generateMockChartData();
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const calculateGrowthRate = (): number => {
    // Mock calculation - in real app, compare with previous period
    return Math.random() * 20 + 5; // 5-25% growth
  };

  const calculateCustomerRetention = (customerData?: any[]): number => {
    if (customerData && customerData.length > 0) {
      const repeatCustomers = customerData.filter(c => (c.total_orders || 0) > 1).length;
      return customerData.length > 0 ? (repeatCustomers / customerData.length) * 100 : 0;
    }
    return Math.random() * 30 + 60; // 60-90% retention
  };

  const calculateInventoryTurnover = (turnoverData?: any[]): number => {
    if (turnoverData && turnoverData.length > 0) {
      const avgTurnover = turnoverData.reduce((sum, item) => sum + (item.turnover_rate || 0), 0);
      return turnoverData.length > 0 ? avgTurnover / turnoverData.length : 0;
    }
    return Math.random() * 5 + 2; // 2-7 times per year
  };

  const calculateProfitMargin = (): number => {
    // Mock calculation - in real app, calculate from cost data
    return Math.random() * 20 + 15; // 15-35% margin
  };

  const calculateSalesForecast = (): number => {
    if (analyticsData) {
      return analyticsData.totalRevenue * (1 + analyticsData.growthRate / 100);
    }
    return 14200.00;
  };

  const generateChartData = (metrics: any) => {
    // Generate sales trend data
    const salesTrend: ChartData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [metrics.total_revenue * 0.2, metrics.total_revenue * 0.25, metrics.total_revenue * 0.3, metrics.total_revenue * 0.25],
        color: '#4CAF50'
      }]
    };
    setSalesChartData(salesTrend);

    // Generate product performance data
    const productPerformance: ChartData = {
      labels: ['Laptops', 'Phones', 'Tablets', 'Accessories'],
      datasets: [{
        data: [45, 30, 20, 15],
        color: '#2196F3'
      }]
    };
    setProductChartData(productPerformance);
  };

  const generateMockChartData = () => {
    const salesTrend: ChartData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [2500, 3100, 2800, 3600],
        color: '#4CAF50'
      }]
    };
    setSalesChartData(salesTrend);

    const productPerformance: ChartData = {
      labels: ['Laptops', 'Phones', 'Tablets', 'Accessories'],
      datasets: [{
        data: [45, 30, 20, 15],
        color: '#2196F3'
      }]
    };
    setProductChartData(productPerformance);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const navigateToRealTimeDashboard = () => {
    navigation.navigate('RealTimeDashboard');
  };

  const navigateToReports = () => {
    navigation.navigate('ReportDetail', {
      reportId: 'advanced-analytics',
      reportTitle: 'Advanced Analytics Report',
      reportType: 'analytics'
    });
  };

  const handleSettingsPress = () => {
    Alert.alert('Analytics Settings', 'Analytics configuration options coming soon!');
  };

  const handleMetricPress = (title: string) => {
    switch (title) {
      case 'Total Revenue':
        navigation.navigate('ReportDetail', {
          reportId: 'revenue-analysis',
          reportTitle: 'Revenue Analysis',
          reportType: 'sales'
        });
        break;
      case 'Total Sales':
        navigation.navigate('ReportDetail', {
          reportId: 'sales-analysis',
          reportTitle: 'Sales Analysis',
          reportType: 'sales'
        });
        break;
      case 'Customer Retention':
        navigation.navigate('ReportDetail', {
          reportId: 'customer-retention',
          reportTitle: 'Customer Retention Analysis',
          reportType: 'analytics'
        });
        break;
      case 'Inventory Turnover':
        navigation.navigate('ReportDetail', {
          reportId: 'inventory-turnover',
          reportTitle: 'Inventory Turnover Analysis',
          reportType: 'inventory'
        });
        break;
      default:
        Alert.alert('Metric Details', `${title} detailed analysis coming soon!`);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'export':
        Alert.alert('Export Analytics', 'Export functionality coming soon!');
        break;
      case 'schedule':
        Alert.alert('Schedule Report', 'Report scheduling coming soon!');
        break;
      case 'share':
        Alert.alert('Share Analytics', 'Sharing functionality coming soon!');
        break;
      default:
        Alert.alert('Quick Action', `${action} functionality coming soon!`);
    }
  };

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, color: string = '#4CAF50') => (
    <TouchableOpacity style={styles.metricCard} onPress={() => handleMetricPress(title)}>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {typeof value === 'number' && title.includes('Revenue') ? formatCurrency(value) : value}
        </Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.metricNavigation}>
        <Icon name="chevron-right" size={16} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  const renderChartPlaceholder = (title: string, data: ChartData | null) => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {data ? (
        <View style={styles.chartContainer}>
          {data.labels.map((label, index) => (
            <View key={index} style={styles.chartBar}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: (data.datasets[0].data[index] / Math.max(...data.datasets[0].data)) * 100,
                    backgroundColor: data.datasets[0].color 
                  }
                ]} 
              />
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No data available</Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Advanced Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Icon name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Advanced Analytics</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
            <Icon name="settings" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        {/* Navigation to other analytics screens */}
        <View style={styles.navigationRow}>
          <TouchableOpacity style={styles.navButton} onPress={navigateToRealTimeDashboard}>
            <Icon name="dashboard" size={20} color="#007AFF" />
            <Text style={styles.navButtonText}>Real-Time Dashboard</Text>
            <Icon name="chevron-right" size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={navigateToReports}>
            <Icon name="reports" size={20} color="#007AFF" />
            <Text style={styles.navButtonText}>Reports</Text>
            <Icon name="chevron-right" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {analyticsData && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              {renderMetricCard('Total Revenue', analyticsData.totalRevenue, 'Last 30 days')}
              {renderMetricCard('Total Sales', analyticsData.totalSales, 'Orders')}
              {renderMetricCard('Avg Order Value', formatCurrency(analyticsData.averageOrderValue), 'Per transaction')}
              {renderMetricCard('Growth Rate', `${analyticsData.growthRate.toFixed(1)}%`, 'vs last period', '#FF9800')}
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsGrid}>
              {renderMetricCard('Customer Retention', `${analyticsData.customerRetention.toFixed(1)}%`, 'Repeat customers', '#9C27B0')}
              {renderMetricCard('Inventory Turnover', analyticsData.inventoryTurnover.toFixed(1), 'Times per year', '#607D8B')}
              {renderMetricCard('Profit Margin', `${analyticsData.profitMargin.toFixed(1)}%`, 'Net profit', '#4CAF50')}
              {renderMetricCard('Sales Forecast', formatCurrency(analyticsData.salesForecast), 'Next period', '#2196F3')}
            </View>

            {/* Charts */}
            {renderChartPlaceholder('Sales Trend', salesChartData)}
            {renderChartPlaceholder('Product Performance', productChartData)}

            {/* Insights */}
            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>Key Insights</Text>
              <View style={styles.insightItem}>
                <Icon name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.insightText}>
                  Revenue grew {analyticsData.growthRate.toFixed(1)}% compared to last period
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Icon name="users" size={16} color="#2196F3" />
                <Text style={styles.insightText}>
                  {analyticsData.customerRetention.toFixed(1)}% of customers made repeat purchases
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Icon name="package" size={16} color="#FF9800" />
                <Text style={styles.insightText}>
                  Inventory turns over {analyticsData.inventoryTurnover.toFixed(1)} times per year
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('export')}
                >
                  <Icon name="download" size={24} color="#007AFF" />
                  <Text style={styles.quickActionText}>Export Data</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('schedule')}
                >
                  <Icon name="calendar" size={24} color="#FF9800" />
                  <Text style={styles.quickActionText}>Schedule Report</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('share')}
                >
                  <Icon name="share" size={24} color="#4CAF50" />
                  <Text style={styles.quickActionText}>Share Analytics</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('SalesForecasting')}
                >
                  <Icon name="trending-up" size={24} color="#9C27B0" />
                  <Text style={styles.quickActionText}>Sales Forecast</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  settingsButton: {
    padding: 8,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '45%',
  },
  navButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  metricNavigation: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  insightsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
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

export default AdvancedAnalyticsScreen; 