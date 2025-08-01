import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency } from '../../lib/utils';
import { isUIPolishEnabled } from '../../feature_flags/ui-polish';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'sales' | 'inventory' | 'analytics' | 'customers';
  available: boolean;
}

interface ReportsDashboardScreenProps {
  navigation: any;
}

const ReportsDashboardScreen: React.FC<ReportsDashboardScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sales' | 'inventory' | 'analytics' | 'customers'>('all');
  const insets = useSafeAreaInsets();

  const reportTypes: ReportType[] = [
    // Sales Reports
    {
      id: 'sales-summary',
      title: 'Sales Summary Report',
      description: 'Daily, weekly, and monthly sales summaries with revenue breakdown',
      icon: 'receipt',
      color: '#007AFF',
      category: 'sales',
      available: true,
    },
    {
      id: 'sales-by-product',
      title: 'Sales by Product',
      description: 'Detailed product performance and sales analysis',
      icon: 'bar-chart',
      color: '#34C759',
      category: 'sales',
      available: true,
    },
    {
      id: 'sales-by-customer',
      title: 'Sales by Customer',
      description: 'Customer purchase history and spending patterns',
      icon: 'person',
      color: '#FF9500',
      category: 'sales',
      available: true,
    },
    {
      id: 'payment-methods',
      title: 'Payment Methods Report',
      description: 'Analysis of payment methods and transaction types',
      icon: 'credit-card',
      color: '#5856D6',
      category: 'sales',
      available: true,
    },

    // Inventory Reports
    {
      id: 'inventory-status',
      title: 'Inventory Status Report',
      description: 'Current stock levels, low stock alerts, and inventory value',
      icon: 'cube',
      color: '#FF3B30',
      category: 'inventory',
      available: true,
    },
    {
      id: 'inventory-turnover',
      title: 'Inventory Turnover Report',
      description: 'Product turnover rates and slow-moving inventory analysis',
      icon: 'trending-up',
      color: '#FF2D92',
      category: 'inventory',
      available: true,
    },
    {
      id: 'stock-alerts',
      title: 'Stock Alerts Report',
      description: 'Comprehensive list of items needing restocking',
      icon: 'alert-triangle',
      color: '#FF9500',
      category: 'inventory',
      available: true,
    },
    {
      id: 'category-breakdown',
      title: 'Category Breakdown',
      description: 'Inventory distribution across product categories',
      icon: 'pie-chart',
      color: '#AF52DE',
      category: 'inventory',
      available: true,
    },

    // Analytics Reports
    {
      id: 'performance-metrics',
      title: 'Performance Metrics',
      description: 'Key performance indicators and business metrics',
      icon: 'target',
      color: '#007AFF',
      category: 'analytics',
      available: true,
    },
    {
      id: 'trend-analysis',
      title: 'Trend Analysis',
      description: 'Sales and inventory trends over time',
      icon: 'trending-up',
      color: '#34C759',
      category: 'analytics',
      available: true,
    },
    {
      id: 'forecast-report',
      title: 'Forecast Report',
      description: 'Demand forecasting and inventory planning insights',
      icon: 'lightbulb',
      color: '#FF9500',
      category: 'analytics',
      available: true,
    },
    {
      id: 'comparison-report',
      title: 'Period Comparison',
      description: 'Compare performance across different time periods',
      icon: 'bar-chart',
      color: '#5856D6',
      category: 'analytics',
      available: true,
    },

    // Customer Reports
    {
      id: 'customer-list',
      title: 'Customer List',
      description: 'Complete customer database with contact information',
      icon: 'person',
      color: '#007AFF',
      category: 'customers',
      available: true,
    },
    {
      id: 'customer-segments',
      title: 'Customer Segments',
      description: 'Customer segmentation by spending and behavior',
      icon: 'users',
      color: '#34C759',
      category: 'customers',
      available: true,
    },
    {
      id: 'loyalty-analysis',
      title: 'Loyalty Analysis',
      description: 'Customer loyalty patterns and repeat purchase analysis',
      icon: 'heart',
      color: '#FF3B30',
      category: 'customers',
      available: true,
    },
    {
      id: 'customer-activity',
      title: 'Customer Activity',
      description: 'Recent customer activity and engagement metrics',
      icon: 'activity',
      color: '#FF9500',
      category: 'customers',
      available: true,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Reports', icon: 'list' },
    { id: 'sales', label: 'Sales', icon: 'receipt' },
    { id: 'inventory', label: 'Inventory', icon: 'cube' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
    { id: 'customers', label: 'Customers', icon: 'person' },
  ];

  const filteredReports = reportTypes.filter(report => 
    selectedCategory === 'all' || report.category === selectedCategory
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    // Add any refresh logic here if needed
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleReportPress = (report: ReportType) => {
    if (!report.available) {
      Alert.alert('Coming Soon', 'This report will be available in the next update.');
      return;
    }

    navigation.navigate('ReportDetail', { 
      reportId: report.id,
      reportTitle: report.title,
      reportType: report.category,
    });
  };

  const handleQuickExport = async () => {
    setIsLoading(true);
    try {
      // Generate a quick summary report
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const totalSales = salesData?.length || 0;

      Alert.alert(
        'Quick Export Summary',
        `Last 30 Days:\n• Total Revenue: ${formatCurrency(totalRevenue)}\n• Total Sales: ${totalSales}\n\nReport exported successfully!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to generate export');
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = () => (
    <View 
      style={[
        styles.header,
        isUIPolishEnabled('safeAreaInsets') && { paddingTop: insets.top + 10 }
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Reports Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Generate comprehensive business reports and analytics
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

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id as any)}
          >
            <Icon 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.id ? 'white' : '#666'} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.categoryButtonTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsCard}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleQuickExport}
          disabled={isLoading}
        >
          <Icon name="download" size={24} color="#007AFF" />
          <Text style={styles.quickActionText}>
            {isLoading ? 'Exporting...' : 'Quick Export'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('SalesAnalytics')}
        >
          <Icon name="receipt" size={24} color="#34C759" />
          <Text style={styles.quickActionText}>Sales Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('InventoryAnalytics')}
        >
          <Icon name="bar-chart" size={24} color="#FF9500" />
          <Text style={styles.quickActionText}>Inventory Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('SalesForecasting')}
        >
          <Icon name="lightbulb" size={24} color="#FF3B30" />
          <Text style={styles.quickActionText}>Forecasting</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReportCard = (report: ReportType) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => handleReportPress(report)}
      disabled={!report.available}
    >
      <View style={styles.reportHeader}>
        <View style={[styles.reportIcon, { backgroundColor: report.color }]}>
          <Icon name={report.icon} size={24} color="white" />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDescription}>{report.description}</Text>
        </View>
        <Icon 
          name="chevron-right" 
          size={20} 
          color={report.available ? '#007AFF' : '#ccc'} 
        />
      </View>
      {!report.available && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {renderCategoryFilter()}
        {renderQuickActions()}

        <View style={styles.reportsSection}>
          <Text style={styles.reportsSectionTitle}>
            Available Reports ({filteredReports.length})
          </Text>
          
          {filteredReports.map(renderReportCard)}
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Reports are generated based on your current data{'\n'}
            • Export options include PDF, CSV, and Excel formats{'\n'}
            • Custom date ranges can be selected for each report{'\n'}
            • Reports can be scheduled for automatic generation
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>View Documentation</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  categoryContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
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
  reportsSection: {
    padding: 20,
  },
  reportsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  helpCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReportsDashboardScreen; 