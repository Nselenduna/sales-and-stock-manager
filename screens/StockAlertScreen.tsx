import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { LowStockProduct } from '../lib/supabase';
import Icon from '../components/Icon';
import SkeletonLoader from '../components/SkeletonLoader';
import { isUIPolishEnabled } from '../feature_flags/ui-polish';

interface StockAlertScreenProps {
  navigation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const StockAlertScreen: React.FC<StockAlertScreenProps> = ({ navigation }) => {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);

      // First get all products, then filter in JavaScript
      const { data: allProducts, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity, low_stock_threshold, location')
        .order('quantity', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        Alert.alert('Error', 'Failed to load stock alerts');
        return;
      }

      // Filter products where quantity <= low_stock_threshold
      const lowStockProducts =
        allProducts?.filter(
          product => product.quantity <= product.low_stock_threshold
        ) || [];

      setLowStockProducts(lowStockProducts);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      Alert.alert('Error', 'Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLowStockProducts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const handleProductPress = (product: LowStockProduct) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleAddStock = (product: LowStockProduct) => {
    navigation.navigate('EditProduct', {
      mode: 'edit',
      productId: product.id,
      focusOnQuantity: true,
    });
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback navigation
      navigation.navigate('AdminMain');
    }
  };

  const renderProductItem = ({ item }: { item: LowStockProduct }) => {
    const stockPercentage = Math.round(
      (item.quantity / item.low_stock_threshold) * 100
    );
    const isCritical = item.quantity === 0;
    const isLow =
      item.quantity > 0 && item.quantity <= item.low_stock_threshold;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isCritical && styles.criticalCard,
          isLow && styles.lowStockCard,
        ]}
        onPress={() => handleProductPress(item)}
        accessible={true}
        accessibilityLabel={`${item.name}, Quantity: ${item.quantity}, Threshold: ${item.low_stock_threshold}`}
        accessibilityRole='button'
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View
            style={[
              styles.stockIndicator,
              isCritical && styles.criticalIndicator,
              isLow && styles.lowStockIndicator,
            ]}
          >
            <Icon
              name={isCritical ? 'alert-circle' : 'alert-triangle'}
              size={16}
              color='white'
            />
          </View>
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.skuText}>SKU: {item.sku}</Text>
          {item.location && (
            <Text style={styles.locationText}>Location: {item.location}</Text>
          )}
        </View>

        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Current Stock:</Text>
            <Text
              style={[
                styles.stockValue,
                isCritical && styles.criticalText,
                isLow && styles.lowStockText,
              ]}
            >
              {item.quantity}
            </Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Threshold:</Text>
            <Text style={styles.thresholdValue}>
              {item.low_stock_threshold}
            </Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Status:</Text>
            <Text
              style={[
                styles.statusText,
                isCritical && styles.criticalText,
                isLow && styles.lowStockText,
              ]}
            >
              {isCritical ? 'Out of Stock' : `${stockPercentage}% of threshold`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addStockButton}
          onPress={() => handleAddStock(item)}
          accessible={true}
          accessibilityLabel={`Add stock for ${item.name}`}
          accessibilityRole='button'
        >
          <Icon name='plus' size={16} color='white' />
          <Text style={styles.addStockButtonText}>Add Stock</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name='checkmark-circle' size={64} color='#34C759' />
      <Text style={styles.emptyStateTitle}>No Stock Alerts</Text>
      <Text style={styles.emptyStateDescription}>
        All products are above their low stock thresholds. Great job managing
        inventory!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        isUIPolishEnabled('safeAreaInsets') && { paddingTop: insets.top + 20 },
      ]}
      testID='header-container'
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Stock Alerts</Text>
        <Text style={styles.headerSubtitle}>
          {lowStockProducts.length} item
          {lowStockProducts.length !== 1 ? 's' : ''} need attention
        </Text>
      </View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        accessible={true}
        accessibilityLabel='Go back to dashboard'
        accessibilityRole='button'
      >
        <Icon name='arrow-back' size={24} color='white' />
      </TouchableOpacity>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonLoader height={24} style={styles.skeletonTitle} />
      <SkeletonLoader height={16} style={styles.skeletonSubtitle} />
      {[1, 2, 3].map(index => (
        <View key={index} style={styles.skeletonCard}>
          <SkeletonLoader height={20} style={styles.skeletonLine} />
          <SkeletonLoader
            height={16}
            width='60%'
            style={styles.skeletonLineShort}
          />
          <SkeletonLoader
            height={16}
            width='40%'
            style={styles.skeletonLineShort}
          />
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {isUIPolishEnabled('skeletonLoaders') ? (
          renderSkeletonLoader()
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color='#007AFF' />
            <Text style={styles.loadingText}>Loading stock alerts...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={lowStockProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          lowStockProducts.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Critical (0 stock)</Text>
                  <Text style={styles.criticalCount}>
                    {lowStockProducts.filter(p => p.quantity === 0).length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Low Stock</Text>
                  <Text style={styles.lowStockCount}>
                    {lowStockProducts.filter(p => p.quantity > 0).length}
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        }
      />
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
    paddingTop: 60,
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 12,
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
  criticalCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  lowStockCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  productCard: {
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
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  stockIndicator: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 4,
  },
  criticalIndicator: {
    backgroundColor: '#FF3B30',
  },
  lowStockIndicator: {
    backgroundColor: '#FF9500',
  },
  productDetails: {
    marginBottom: 12,
  },
  skuText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  stockInfo: {
    marginBottom: 16,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  thresholdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  criticalText: {
    color: '#FF3B30',
  },
  lowStockText: {
    color: '#FF9500',
  },
  addStockButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addStockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonSubtitle: {
    marginBottom: 20,
  },
  skeletonCard: {
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
  skeletonLine: {
    marginBottom: 8,
  },
  skeletonLineShort: {
    marginBottom: 4,
  },
});

export default StockAlertScreen;
