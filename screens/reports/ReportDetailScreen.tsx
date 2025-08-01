import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface ReportDetailScreenProps {
  navigation: any;
}

interface RouteParams {
  reportId: string;
  reportTitle: string;
  reportType: 'sales' | 'inventory' | 'analytics';
}

const ReportDetailScreen: React.FC<ReportDetailScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { reportId, reportTitle, reportType } = route.params as RouteParams;
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, [reportId, reportType]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      let data = null;

      switch (reportType) {
        case 'sales':
          data = await loadSalesReport();
          break;
        case 'inventory':
          data = await loadInventoryReport();
          break;
        case 'analytics':
          data = await loadAnalyticsReport();
          break;
        default:
          throw new Error('Unknown report type');
      }

      setReportData(data);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  };

  const loadInventoryReport = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('quantity', { ascending: true });

    if (error) throw error;
    return data;
  };

  const loadAnalyticsReport = async () => {
    // Try to use the analytics function
    const { data, error } = await supabase
      .rpc('get_sales_metrics');

    if (error) {
      // Fallback to basic query if function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (fallbackError) throw fallbackError;
      
      const totalRevenue = fallbackData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const totalSales = fallbackData?.length || 0;
      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      return {
        total_revenue: totalRevenue / 100, // Convert from pence
        total_sales,
        average_order_value: avgOrderValue / 100,
        top_product: 'N/A',
        top_product_revenue: 0,
      };
    }

    return data;
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    loadReportData();
  };

  const renderSalesReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="receipt" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No sales data available</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{reportData.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(reportData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) / 100)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {reportData.map((sale: any, index: number) => (
          <View key={sale.id || index} style={styles.saleItem}>
            <View style={styles.saleHeader}>
              <Text style={styles.saleId}>#{sale.id?.slice(0, 8) || 'N/A'}</Text>
              <Text style={styles.saleDate}>
                {new Date(sale.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.saleCustomer}>
              {sale.customer_name || 'Walk-in Customer'}
            </Text>
            <Text style={styles.saleTotal}>
              {formatCurrency((sale.total || 0) / 100)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) }]}>
              <Text style={styles.statusText}>{sale.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderInventoryReport = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="box" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No inventory data available</Text>
        </View>
      );
    }

    const lowStockItems = reportData.filter((product: any) => 
      product.quantity <= product.low_stock_threshold
    );
    const outOfStockItems = reportData.filter((product: any) => 
      product.quantity === 0
    );

    return (
      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Inventory Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Products</Text>
              <Text style={styles.summaryValue}>{reportData.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Low Stock</Text>
              <Text style={[styles.summaryValue, { color: '#FF9500' }]}>{lowStockItems.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>{outOfStockItems.length}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Low Stock Items</Text>
        {lowStockItems.map((product: any, index: number) => (
          <View key={product.id || index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSku}>SKU: {product.sku}</Text>
            </View>
            <View style={styles.productStock}>
              <Text style={[styles.stockLevel, { color: '#FF9500' }]}>
                {product.quantity} in stock
              </Text>
              <Text style={styles.thresholdText}>
                Threshold: {product.low_stock_threshold}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderAnalyticsReport = () => {
    if (!reportData) {
      return (
        <View style={styles.emptyState}>
          <Icon name="analytics" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No analytics data available</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Analytics Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(reportData.total_revenue || 0)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{reportData.total_sales || 0}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Order Value</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(reportData.average_order_value || 0)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Top Product</Text>
              <Text style={styles.summaryValue}>{reportData.top_product || 'N/A'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'queued':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (reportType) {
      case 'sales':
        return renderSalesReport();
      case 'inventory':
        return renderInventoryReport();
      case 'analytics':
        return renderAnalyticsReport();
      default:
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Unknown report type</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{reportTitle}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  saleItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
  },
  saleCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  thresholdText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ReportDetailScreen; 