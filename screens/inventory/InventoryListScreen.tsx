import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
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
import { handleError } from '../../lib/errorHandler'; // Import centralized error handler

interface InventoryListScreenProps {
  navigation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isInitialLoad = useRef(true);

  const { debouncedValue: debouncedSearchQuery, isSearching } =
    useDebouncedSearch(searchQuery, 300);

  const { syncState, setSyncing, setFailed, setSuccess, retry } =
    useSyncFeedback();

  const canEditInventory = useMemo(
    () => userRole === 'admin' || userRole === 'staff',
    [userRole]
  );

  const fetchProducts = useCallback(
    async (refresh = false, currentSortOrder = sortOrder) => {
      if (refresh) {
        setPage(0);
        setHasMore(true);
      }

      if (!hasMore && !refresh) return;

      try {
        if (refresh) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setSyncing();

        const pageSize = 20;
        const pageIndex = refresh ? 0 : page;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: currentSortOrder === 'asc' })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) throw error;

        if (refresh) {
          setProducts(data || []);
        } else {
          setProducts(prev => [...prev, ...(data || [])]);
        }

        setHasMore((data || []).length === pageSize);
        if (!refresh) {
          setPage(prev => prev + 1);
        }

        setSuccess();
      } catch (error) {
        handleError(error, 'InventoryListScreen/fetchProducts');
        setFailed('Failed to load inventory');
        Alert.alert('Error', 'Failed to load inventory');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [page, hasMore, setSyncing, setSuccess, setFailed]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(true, sortOrder);
    setRefreshing(false);
  }, [sortOrder]);

  // Initial data loading
  useEffect(() => {
    if (isInitialLoad.current) {
      fetchProducts(true, sortOrder);
      isInitialLoad.current = false;
    }
  }, []); // Only run once on mount

  // Refetch when sort order changes
  useEffect(() => {
    if (!isInitialLoad.current) {
      fetchProducts(true, sortOrder);
    }
  }, [sortOrder]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
      );
    }

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

  const productCountText = useMemo(
    () => `${filteredProducts.length} of ${products.length} items`,
    [filteredProducts.length, products.length]
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  const handleQRPress = useCallback(
    (product: Product) => {
      navigation.navigate('BarcodeScanner', { sku: product.sku });
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

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore && !loading) {
      fetchProducts(false, sortOrder);
    }
  }, [isLoadingMore, hasMore, loading, sortOrder]);

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
          accessibilityLabel='Go back to dashboard'
          accessibilityRole='button'
        >
          <Icon name='arrow-back' size={24} color='white' />
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
    if (!isLoadingMore || !hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size='small' color='#007AFF' />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [isLoadingMore, hasMore]);

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
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        isSearching={isSearching}
      />
      <FilterBar
        activeFilter={filterBy}
        onFilterChange={setFilterBy}
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
      />
      <FlatList
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 120,
          offset: 120 * index,
          index,
        })}
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
    paddingBottom: 100,
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

export default memo(InventoryListScreen);
