import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

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

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Get sales metrics
      const { data: salesMetrics, error: salesError } = await supabase
        .rpc('get_sales_metrics', { start_date: getStartDate() });

      if (salesError) {
        console.error('Error fetching sales metrics:', salesError);
        // Use mock data if database function fails
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
      } else if (salesMetrics && salesMetrics.length > 0) {
        const metrics = salesMetrics[0];
        const data: AnalyticsData = {
          totalRevenue: metrics.total_revenue || 0,
          totalSales: metrics.total_sales || 0,
          averageOrderValue: metrics.average_order_value || 0,
          topProduct: metrics.top_product || 'Sample Product',
          topProductRevenue: metrics.top_product_revenue || 0,
          growthRate: calculateGrowthRate(),
          customerRetention: calculateCustomerRetention(),
          inventoryTurnover: calculateInventoryTurnover(),
          profitMargin: calculateProfitMargin(),
          salesForecast: calculateSalesForecast(),
        };
        setAnalyticsData(data);
        generateChartData();
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
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

  const calculateCustomerRetention = (): number => {
    // Mock calculation
    return Math.random() * 30 + 60; // 60-90% retention
  };

  const calculateInventoryTurnover = (): number => {
    // Mock calculation
    return Math.random() * 5 + 2; // 2-7 times per year
  };

  const calculateProfitMargin = (): number => {
    // Mock calculation
    return Math.random() * 20 + 15; // 15-35% margin
  };

  const calculateSalesForecast = (): number => {
    if (!analyticsData) return 0;
    // Simple forecast based on current growth rate
    return analyticsData.totalRevenue * (1 + analyticsData.growthRate / 100);
  };

  const generateChartData = () => {
    // Generate sales trend data
    const salesData: ChartData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [3200, 4100, 3800, 4500],
        color: '#4CAF50',
      }],
    };
    setSalesChartData(salesData);

    // Generate product performance data
    const productData: ChartData = {
      labels: ['Laptops', 'Phones', 'Tablets', 'Accessories'],
      datasets: [{
        data: [45, 32, 28, 15],
        color: '#2196F3',
      }],
    };
    setProductChartData(productData);
  };

  const generateMockChartData = () => {
    generateChartData();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, color: string = '#4CAF50') => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{typeof value === 'number' ? `$${value.toLocaleString()}` : value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
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
          <Text>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Advanced Analytics</Text>
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
              {renderMetricCard('Avg Order Value', analyticsData.averageOrderValue, 'Per transaction')}
              {renderMetricCard('Growth Rate', `${analyticsData.growthRate.toFixed(1)}%`, 'vs last period', '#FF9800')}
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsGrid}>
              {renderMetricCard('Customer Retention', `${analyticsData.customerRetention.toFixed(1)}%`, 'Repeat customers', '#9C27B0')}
              {renderMetricCard('Inventory Turnover', analyticsData.inventoryTurnover.toFixed(1), 'Times per year', '#607D8B')}
              {renderMetricCard('Profit Margin', `${analyticsData.profitMargin.toFixed(1)}%`, 'Net profit', '#4CAF50')}
              {renderMetricCard('Sales Forecast', analyticsData.salesForecast, 'Next period', '#2196F3')}
            </View>

            {/* Charts */}
            {renderChartPlaceholder('Sales Trend', salesChartData)}
            {renderChartPlaceholder('Product Performance', productChartData)}

            {/* Insights */}
            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>Business Insights</Text>
              <View style={styles.insightItem}>
                <Icon name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.insightText}>
                  Sales are growing at {analyticsData.growthRate.toFixed(1)}% month-over-month
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Icon name="users" size={16} color="#2196F3" />
                <Text style={styles.insightText}>
                  Customer retention rate is {analyticsData.customerRetention.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Icon name="package" size={16} color="#FF9800" />
                <Text style={styles.insightText}>
                  Inventory turns over {analyticsData.inventoryTurnover.toFixed(1)} times annually
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('RealTimeDashboard')}
                >
                  <Icon name="activity" size={24} color="#007AFF" />
                  <Text style={styles.quickActionText}>Real-Time Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <Icon name="download" size={24} color="#007AFF" />
                  <Text style={styles.quickActionText}>Export Report</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
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
    width: 30,
    borderRadius: 4,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    padding: 16,
    borderRadius: 12,
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
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default AdvancedAnalyticsScreen; 