import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAuthStore } from '../../store/authStore';
import { supabase, Product } from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import FloatingActionButton from '../../components/FloatingActionButton';
import EmptyState from '../../components/EmptyState';
import { useDebouncedSearch } from '../../hooks/useDebounce';
import Icon from '../../components/Icon';
import { useSyncFeedback } from '../../hooks/useSyncFeedback';
import SyncStatusBanner from '../../components/SyncStatusBanner';
import { handleError, createNetworkError } from '../../lib/errorHandler';

interface InventoryListScreenProps {
  navigation: any;
}

// Constants for FlashList performance optimization
const ITEM_HEIGHT = 120;
const ESTIMATED_ITEM_SIZE = 120; // FlashList requires estimatedItemSize
const INITIAL_NUM_TO_RENDER = 10;
const MAX_TO_RENDER_PER_BATCH = 5;
const WINDOW_SIZE = 21; // Should be around 2 * initialNumToRender

const InventoryListScreen: React.FC<InventoryListScreenProps> = ({
  navigation,
}) => {
  const { userRole } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<
    'all' | 'low_stock' | 'out_of_stock'
  >('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Debounced search for better performance
  const { debouncedValue: debouncedSearchQuery, isSearching } = useDebouncedSearch(searchQuery, 300);

  // Sync feedback management
  const {
    syncState,
    setSyncing,
    setFailed,
    setSuccess,
    retry,
  } = useSyncFeedback();

  // Check if user can edit inventory - memoized
  const canEditInventory = useMemo(
    () => userRole === 'admin' || userRole === 'staff',
    [userRole]
  );

  // Memoized fetch function with pagination and sync feedback
  const fetchProducts = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setPage(0);
        setHasMore(true);
      }

      if (!hasMore && !refresh) return;

      try {
        setLoading(true);
        setSyncing(); // Show sync status
        
        const pageSize = 20;
        const pageIndex = refresh ? 0 : page;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: sortOrder === 'asc' })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) throw error;

        if (refresh) {
          setProducts(data || []);
        } else {
          setProducts(prev => [...prev, ...(data || [])]);
        }

        // Check if we've reached the end
        setHasMore((data || []).length === pageSize);
        if (!refresh) {
          setPage(prev => prev + 1);
        }

        setSuccess(); // Show success status
      } catch (error) {
        console.error('Error fetching products:', error);
        setFailed('Failed to load inventory');
        handleError(error instanceof Error ? error : 'Failed to load inventory', {
          component: 'InventoryListScreen',
          action: 'fetchProducts'
        }, {
          retryCallback: () => fetchProducts(refresh),
          showAlert: true
        });
      } finally {
        setLoading(false);
      }
    },
    [sortOrder, page, hasMore, setSyncing, setSuccess, setFailed]
  );

  // Memoized refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(true);
    setRefreshing(false);
  }, [fetchProducts]);

  // Initial data load
  useEffect(() => {
    fetchProducts(true);
  }, [sortOrder]);

  // Memoized filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter using debounced query for better performance
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }

    // Apply stock filter
    switch (filterBy) {
      case 'low_stock':
        filtered = filtered.filter(
          product =>
            product.quantity <= product.low_stock_threshold &&
            product.quantity > 0
        );
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.quantity === 0);
        break;
      default:
        break;
    }

    return filtered;
  }, [products, debouncedSearchQuery, filterBy]);

  // Memoized product count text
  const productCountText = useMemo(
    () => `${filteredProducts.length} of ${products.length} items`,
    [filteredProducts.length, products.length]
  );

  // Debounced search handler
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Navigation handlers - memoized
  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  const handleQRPress = useCallback(
    (product: Product) => {
      navigation.navigate('QRScanner', { sku: product.sku });
    },
    [navigation]
  );

  const handleEditPress = useCallback(
    (product: Product) => {
      navigation.navigate('EditProduct', { product });
    },
    [navigation]
  );

  const handleAddProduct = useCallback(() => {
    navigation.navigate('AddProduct', { mode: 'add' });
  }, [navigation]);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Load more products when reaching end of list
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      fetchProducts();
    }
  }, [loading, hasMore, fetchProducts]);

  // FlashList uses estimatedItemSize instead of getItemLayout for better performance

  // Memoized render functions
  const renderProductCard = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        onQRPress={() => handleQRPress(item)}
        onEditPress={canEditInventory ? () => handleEditPress(item) : undefined}
        canEdit={canEditInventory}
      />
    ),
    [canEditInventory, handleProductPress, handleQRPress, handleEditPress]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{productCountText}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityLabel="Go back to dashboard"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
    ),
    [productCountText, navigation]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <EmptyState
        title='No products found'
        subtitle={
          searchQuery
            ? 'Try adjusting your search terms'
            : 'Add your first product to get started'
        }
        actionLabel={
          canEditInventory && !searchQuery ? 'Add Product' : undefined
        }
        onAction={
          canEditInventory && !searchQuery ? handleAddProduct : undefined
        }
      />
    ),
    [searchQuery, canEditInventory, handleAddProduct]
  );

  const renderFooter = useCallback(() => {
    if (!loading || refreshing) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size='small' color='#007AFF' />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [loading, refreshing]);

  // Loading state
  if (loading && page === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <SyncStatusBanner
        status={syncState.status}
        message={syncState.message}
        queueCount={syncState.queueCount}
        onRetry={retry}
      />
      <SearchBar value={searchQuery} onChangeText={handleSearchChange} isSearching={isSearching} />
      <FilterBar
        activeFilter={filterBy}
        onFilterChange={setFilterBy}
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
      />

      <FlashList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        windowSize={WINDOW_SIZE}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        updateCellsBatchingPeriod={50}
        // FlashList specific optimizations
        overrideItemLayout={(layout, item, index) => {
          layout.size = ITEM_HEIGHT;
        }}
        // Performance optimizations
        drawDistance={1000}
        estimatedListSize={{
          height: filteredProducts.length * ESTIMATED_ITEM_SIZE,
          width: 400,
        }}
      />

      <FloatingActionButton
        onPress={handleAddProduct}
        visible={canEditInventory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
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
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default React.memo(InventoryListScreen);
