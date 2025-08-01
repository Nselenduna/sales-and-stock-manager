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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency } from '../../lib/utils';
import { isUIPolishEnabled } from '../../feature_flags/ui-polish';

interface InventoryMetrics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageTurnover: number;
  topPerformingProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    value: number;
    turnoverRate: number;
  }>;
  slowMovingProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    value: number;
    daysInStock: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    value: number;
  }>;
}

interface InventoryAnalyticsScreenProps {
  navigation: any;
}

const InventoryAnalyticsScreen: React.FC<InventoryAnalyticsScreenProps> = ({ navigation }) => {
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averageTurnover: 0,
    topPerformingProducts: [],
    slowMovingProducts: [],
    categoryBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Get sales data for turnover calculation
      const startDate = getStartDate(timeRange);
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const productsData = products || [];
      const salesData = sales || [];

      // Calculate basic metrics
      const totalProducts = productsData.length;
      const totalValue = productsData.reduce((sum, product) => 
        sum + ((product.price || 0) * (product.quantity || 0)), 0
      );
      const lowStockItems = productsData.filter(p => 
        p.quantity <= (p.low_stock_threshold || 0) && p.quantity > 0
      ).length;
      const outOfStockItems = productsData.filter(p => p.quantity === 0).length;

      // Calculate product turnover using the database function
      const { data: turnoverData, error: turnoverError } = await supabase
        .rpc('get_inventory_turnover', { start_date: startDate.toISOString() });

      if (turnoverError) {
        console.error('Error fetching inventory turnover:', turnoverError);
        console.log('Using mock data due to missing database function. Run database migration to enable real analytics.');
        // Continue with empty turnover data - will use mock calculations
      }

      const productTurnover = new Map<string, number>();
      (turnoverData || []).forEach(item => {
        productTurnover.set(item.product_id, item.quantity_sold || 0);
      });

      // Calculate average turnover
      const totalTurnover = Array.from(productTurnover.values()).reduce((sum, val) => sum + val, 0);
      const averageTurnover = totalTurnover / Math.max(productTurnover.size, 1);

      // Get top performing products
      const topPerformingProducts = productsData
        .map(product => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity || 0,
          value: (product.price || 0) * (product.quantity || 0),
          turnoverRate: productTurnover.get(product.id) || 0,
        }))
        .sort((a, b) => b.turnoverRate - a.turnoverRate)
        .slice(0, 5);

      // Get slow moving products (high quantity, low turnover)
      const slowMovingProducts = productsData
        .map(product => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity || 0,
          value: (product.price || 0) * (product.quantity || 0),
          daysInStock: calculateDaysInStock(product.created_at),
        }))
        .filter(product => product.quantity > 0)
        .sort((a, b) => b.daysInStock - a.daysInStock)
        .slice(0, 5);

      // Calculate category breakdown
      const categoryMap = new Map<string, { count: number; value: number }>();
      productsData.forEach(product => {
        const category = product.category || 'Uncategorized';
        const existing = categoryMap.get(category) || { count: 0, value: 0 };
        existing.count += 1;
        existing.value += (product.price || 0) * (product.quantity || 0);
        categoryMap.set(category, existing);
      });

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          value: data.value,
        }))
        .sort((a, b) => b.value - a.value);

      setMetrics({
        totalProducts,
        totalValue,
        lowStockItems,
        outOfStockItems,
        averageTurnover,
        topPerformingProducts,
        slowMovingProducts,
        categoryBreakdown,
      });
    } catch (error) {
      console.error('Failed to load inventory analytics:', error);
      Alert.alert('Error', 'Failed to load inventory analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = (range: 'week' | 'month' | 'quarter'): Date => {
    const now = new Date();
    switch (range) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;
      case 'quarter':
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(now.getMonth() - 3);
        return quarterAgo;
    }
  };

  const calculateDaysInStock = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const renderMetricCard = (title: string, value: string, subtitle?: string, icon?: string, color?: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color || '#007AFF' }]}>
      <View style={styles.metricHeader}>
        {icon && <Icon name={icon} size={20} color={color || '#007AFF'} />}
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color: color || '#007AFF' }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderTimeRangeButton = (range: 'week' | 'month' | 'quarter', label: string) => (
    <TouchableOpacity
      style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
      onPress={() => setTimeRange(range)}
    >
      <Text style={[styles.timeRangeButtonText, timeRange === range && styles.timeRangeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProductList = (title: string, products: any[], emptyMessage: string, renderItem: (item: any) => React.ReactNode) => (
    <View style={styles.productListCard}>
      <Text style={styles.productListTitle}>{title}</Text>
      {products.length > 0 ? (
        products.map(renderItem)
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View 
      style={[
        styles.header,
        isUIPolishEnabled('safeAreaInsets') && { paddingTop: insets.top + 10 }
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Inventory Analytics</Text>
        <Text style={styles.headerSubtitle}>
          {timeRange === 'week' ? 'Last 7 Days' : timeRange === 'month' ? 'Last 30 Days' : 'Last 90 Days'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessible={true}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Icon name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
          {renderTimeRangeButton('week', 'Week')}
          {renderTimeRangeButton('month', 'Month')}
          {renderTimeRangeButton('quarter', 'Quarter')}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Products',
            metrics.totalProducts.toString(),
            'items in inventory',
            'cube',
            '#007AFF'
          )}
          
          {renderMetricCard(
            'Total Value',
            formatCurrency(metrics.totalValue),
            'inventory value',
            'price',
            '#34C759'
          )}
          
          {renderMetricCard(
            'Low Stock',
            metrics.lowStockItems.toString(),
            'items need restocking',
            'alert-triangle',
            '#FF9500'
          )}
          
          {renderMetricCard(
            'Out of Stock',
            metrics.outOfStockItems.toString(),
            'items unavailable',
            'alert-circle',
            '#FF3B30'
          )}
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceCard}>
          <Text style={styles.performanceTitle}>Performance Metrics</Text>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Average Turnover</Text>
              <Text style={styles.performanceValue}>{metrics.averageTurnover.toFixed(1)}</Text>
              <Text style={styles.performanceSubtext}>units per period</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Stock Coverage</Text>
              <Text style={styles.performanceValue}>
                {metrics.totalProducts > 0 ? ((metrics.totalProducts - metrics.outOfStockItems) / metrics.totalProducts * 100).toFixed(1) : '0'}%
              </Text>
              <Text style={styles.performanceSubtext}>products available</Text>
            </View>
          </View>
        </View>

        {/* Top Performing Products */}
        {renderProductList(
          'Top Performing Products',
          metrics.topPerformingProducts,
          'No sales data available',
          (product) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDetails}>
                  {product.turnoverRate} units sold • {formatCurrency(product.value)} value
                </Text>
              </View>
              <TouchableOpacity
                style={styles.productButton}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              >
                <Icon name="chevron-right" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Slow Moving Products */}
        {renderProductList(
          'Slow Moving Products',
          metrics.slowMovingProducts,
          'All products are moving well',
          (product) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDetails}>
                  {product.quantity} in stock • {product.daysInStock} days
                </Text>
              </View>
              <TouchableOpacity
                style={styles.productButton}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              >
                <Icon name="chevron-right" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Category Breakdown */}
        {metrics.categoryBreakdown.length > 0 && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>Category Breakdown</Text>
            {metrics.categoryBreakdown.map((category, index) => (
              <View key={category.category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.category}</Text>
                  <Text style={styles.categoryDetails}>
                    {category.count} products • {formatCurrency(category.value)}
                  </Text>
                </View>
                <View style={styles.categoryBar}>
                  <View 
                    style={[
                      styles.categoryBarFill, 
                      { 
                        width: `${(category.value / metrics.totalValue) * 100}%`,
                        backgroundColor: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'][index % 5]
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Icon name="list" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>View Inventory</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('StockAlerts')}
            >
              <Icon name="alert-circle" size={24} color="#FF3B30" />
              <Text style={styles.quickActionText}>Stock Alerts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <Icon name="plus" size={24} color="#34C759" />
              <Text style={styles.quickActionText}>Add Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('SalesAnalytics')}
            >
              <Icon name="receipt" size={24} color="#FF9500" />
              <Text style={styles.quickActionText}>Sales Analytics</Text>
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
  performanceCard: {
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
  performanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 20,
  },
  performanceItem: {
    flex: 1,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 12,
    color: '#999',
  },
  productListCard: {
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
  productListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  productDetails: {
    fontSize: 14,
    color: '#666',
  },
  productButton: {
    padding: 8,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  categoryCard: {
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
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryDetails: {
    fontSize: 14,
    color: '#666',
  },
  categoryBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
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

export default InventoryAnalyticsScreen; 