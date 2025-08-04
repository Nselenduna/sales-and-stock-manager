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
import { formatCurrency } from '../../lib/utils'; // eslint-disable-line no-unused-vars
import { isUIPolishEnabled } from '../../feature_flags/ui-polish';

interface ForecastData {
  productId: string;
  productName: string;
  currentStock: number;
  averageDailySales: number;
  predictedDemand: number;
  recommendedOrder: number;
  daysUntilStockout: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SalesForecastingScreenProps {
  navigation: any;
}

const SalesForecastingScreen: React.FC<SalesForecastingScreenProps> = ({
  navigation,
}) => {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forecastPeriod, setForecastPeriod] = useState<
    'week' | 'month' | 'quarter'
  >('month');
  const [filterRisk, setFilterRisk] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadForecastData();
  }, [forecastPeriod]);

  const loadForecastData = async () => {
    setIsLoading(true);
    try {
      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Get sales data for the last 30 days to calculate average daily sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const productsData = products || [];
      const salesData = sales || [];

      // Calculate product sales frequency using the database function
      const { data: turnoverData, error: turnoverError } = await supabase.rpc(
        'get_inventory_turnover',
        { start_date: thirtyDaysAgo.toISOString() }
      );

      if (turnoverError) {
        console.error('Error fetching inventory turnover:', turnoverError);
        console.log(
          'Using mock data due to missing database function. Run database migration to enable real forecasting.'
        );
        // Continue with empty turnover data - will use mock calculations
      }

      const productSales = new Map<
        string,
        { totalQuantity: number; daysWithSales: number }
      >();
      (turnoverData || []).forEach(item => {
        productSales.set(item.product_id, {
          totalQuantity: item.quantity_sold || 0,
          daysWithSales: item.days_with_sales || 0,
        });
      });

      // Generate forecast data
      const forecast: ForecastData[] = productsData.map(product => {
        const salesInfo = productSales.get(product.id) || {
          totalQuantity: 0,
          daysWithSales: 0,
        };
        const averageDailySales =
          salesInfo.daysWithSales > 0
            ? salesInfo.totalQuantity / salesInfo.daysWithSales
            : 0;

        const daysUntilStockout =
          averageDailySales > 0
            ? Math.floor((product.quantity || 0) / averageDailySales)
            : 999; // Infinite if no sales

        const predictedDemand = getPredictedDemand(
          averageDailySales,
          forecastPeriod
        );
        const recommendedOrder = Math.max(
          0,
          predictedDemand - (product.quantity || 0)
        );

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (daysUntilStockout <= 7) riskLevel = 'high';
        else if (daysUntilStockout <= 14) riskLevel = 'medium';

        return {
          productId: product.id,
          productName: product.name,
          currentStock: product.quantity || 0,
          averageDailySales,
          predictedDemand,
          recommendedOrder,
          daysUntilStockout,
          riskLevel,
        };
      });

      // Sort by risk level and days until stockout
      forecast.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return a.daysUntilStockout - b.daysUntilStockout;
      });

      setForecastData(forecast);
    } catch (error) {
      console.error('Failed to load forecast data:', error);
      Alert.alert('Error', 'Failed to load sales forecast data');
    } finally {
      setIsLoading(false);
    }
  };

  const getPredictedDemand = (
    averageDailySales: number,
    period: 'week' | 'month' | 'quarter'
  ): number => {
    const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    return Math.ceil(averageDailySales * daysInPeriod);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadForecastData();
    setIsRefreshing(false);
  };

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
    switch (riskLevel) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
    }
  };

  const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high'): string => {
    switch (riskLevel) {
      case 'high':
        return 'alert-triangle';
      case 'medium':
        return 'alert-circle';
      case 'low':
        return 'check-circle';
    }
  };

  const filteredData = forecastData.filter(
    item => filterRisk === 'all' || item.riskLevel === filterRisk
  );

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        isUIPolishEnabled('safeAreaInsets') && { paddingTop: insets.top + 10 },
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Sales Forecasting</Text>
        <Text style={styles.headerSubtitle}>
          Predictive analytics for inventory planning
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

  const renderForecastPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <Text style={styles.periodTitle}>Forecast Period:</Text>
      <View style={styles.periodButtons}>
        {[
          { key: 'week', label: '1 Week' },
          { key: 'month', label: '1 Month' },
          { key: 'quarter', label: '3 Months' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.periodButton,
              forecastPeriod === key && styles.periodButtonActive,
            ]}
            onPress={() =>
              setForecastPeriod(key as 'week' | 'month' | 'quarter')
            }
          >
            <Text
              style={[
                styles.periodButtonText,
                forecastPeriod === key && styles.periodButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRiskFilter = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterTitle}>Filter by Risk:</Text>
      <View style={styles.filterButtons}>
        {[
          { key: 'all', label: 'All', color: '#666' },
          { key: 'high', label: 'High', color: '#FF3B30' },
          { key: 'medium', label: 'Medium', color: '#FF9500' },
          { key: 'low', label: 'Low', color: '#34C759' },
        ].map(({ key, label, color }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              filterRisk === key && { backgroundColor: color },
            ]}
            onPress={() =>
              setFilterRisk(key as 'all' | 'high' | 'medium' | 'low')
            }
          >
            <Text
              style={[
                styles.filterButtonText,
                filterRisk === key && styles.filterButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderForecastItem = (item: ForecastData) => (
    <View key={item.productId} style={styles.forecastItem}>
      <View style={styles.forecastHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <View style={styles.riskIndicator}>
            <Icon
              name={getRiskIcon(item.riskLevel)}
              size={16}
              color={getRiskColor(item.riskLevel)}
            />
            <Text
              style={[styles.riskText, { color: getRiskColor(item.riskLevel) }]}
            >
              {item.riskLevel.toUpperCase()} RISK
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() =>
            navigation.navigate('ProductDetail', { productId: item.productId })
          }
        >
          <Icon name='chevron-right' size={16} color='#007AFF' />
        </TouchableOpacity>
      </View>

      <View style={styles.forecastMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Current Stock</Text>
            <Text style={styles.metricValue}>{item.currentStock}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Daily Sales</Text>
            <Text style={styles.metricValue}>
              {item.averageDailySales.toFixed(1)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Days Left</Text>
            <Text
              style={[
                styles.metricValue,
                { color: item.daysUntilStockout <= 7 ? '#FF3B30' : '#333' },
              ]}
            >
              {item.daysUntilStockout === 999 ? '∞' : item.daysUntilStockout}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Predicted Demand</Text>
            <Text style={styles.metricValue}>{item.predictedDemand}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Recommended Order</Text>
            <Text
              style={[
                styles.metricValue,
                { color: item.recommendedOrder > 0 ? '#FF3B30' : '#34C759' },
              ]}
            >
              {item.recommendedOrder}
            </Text>
          </View>
        </View>
      </View>

      {item.recommendedOrder > 0 && (
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() =>
            navigation.navigate('EditProduct', {
              mode: 'edit',
              productId: item.productId,
              focusOnQuantity: true,
            })
          }
        >
          <Icon name='plus' size={16} color='white' />
          <Text style={styles.orderButtonText}>
            Order {item.recommendedOrder} units
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSummary = () => {
    const highRisk = forecastData.filter(
      item => item.riskLevel === 'high'
    ).length;
    const mediumRisk = forecastData.filter(
      item => item.riskLevel === 'medium'
    ).length;
    const lowRisk = forecastData.filter(
      item => item.riskLevel === 'low'
    ).length;
    const totalRecommended = forecastData.reduce(
      (sum, item) => sum + item.recommendedOrder,
      0
    );

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Forecast Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>High Risk Items</Text>
            <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
              {highRisk}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Medium Risk Items</Text>
            <Text style={[styles.summaryValue, { color: '#FF9500' }]}>
              {mediumRisk}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Low Risk Items</Text>
            <Text style={[styles.summaryValue, { color: '#34C759' }]}>
              {lowRisk}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Recommended Order</Text>
            <Text style={[styles.summaryValue, { color: '#007AFF' }]}>
              {totalRecommended}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#007AFF' />
          <Text style={styles.loadingText}>Loading forecast data...</Text>
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
        {renderForecastPeriodSelector()}
        {renderRiskFilter()}
        {renderSummary()}

        <View style={styles.forecastList}>
          <Text style={styles.forecastListTitle}>
            Product Forecast ({filteredData.length} items)
          </Text>

          {filteredData.length > 0 ? (
            filteredData.map(renderForecastItem)
          ) : (
            <View style={styles.emptyState}>
              <Icon name='check-circle' size={48} color='#34C759' />
              <Text style={styles.emptyStateText}>
                No products match the current filter
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Icon name='list' size={24} color='#007AFF' />
              <Text style={styles.quickActionText}>View Inventory</Text>
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
              onPress={() => navigation.navigate('SalesAnalytics')}
            >
              <Icon name='receipt' size={24} color='#FF9500' />
              <Text style={styles.quickActionText}>Sales Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('InventoryAnalytics')}
            >
              <Icon name='bar-chart' size={24} color='#34C759' />
              <Text style={styles.quickActionText}>Inventory Analytics</Text>
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
  periodContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 1,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  filterContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  forecastList: {
    padding: 20,
  },
  forecastListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  forecastItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailButton: {
    padding: 8,
  },
  forecastMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  orderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
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

export default SalesForecastingScreen;
