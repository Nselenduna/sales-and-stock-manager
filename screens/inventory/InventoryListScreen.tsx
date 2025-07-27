import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import useAuthStore from '../../store/authStore';
import { supabase, Product } from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import FloatingActionButton from '../../components/FloatingActionButton';
import EmptyState from '../../components/EmptyState';

interface InventoryListScreenProps {
  navigation: any;
}

const InventoryListScreen: React.FC<InventoryListScreenProps> = ({ navigation }) => {
  const { userRole } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  // Check if user can edit inventory
  const canEditInventory = userRole === 'admin' || userRole === 'staff';

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter and search products
  useEffect(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchQuery))
      );
    }

    // Apply stock filter
    switch (filterBy) {
      case 'low_stock':
        filtered = filtered.filter(product => 
          product.quantity <= product.low_stock_threshold && product.quantity > 0
        );
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.quantity === 0);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, filterBy]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleQRPress = (product: Product) => {
    navigation.navigate('QRScanner', { sku: product.sku });
  };

  const handleEditPress = (product: Product) => {
    navigation.navigate('EditProduct', { product });
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onQRPress={() => handleQRPress(item)}
      onEditPress={canEditInventory ? () => handleEditPress(item) : undefined}
      canEdit={canEditInventory}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>
        {filteredProducts.length} of {products.length} items
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <FilterBar
        activeFilter={filterBy}
        onFilterChange={setFilterBy}
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
      />

      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No products found"
            subtitle={
              searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first product to get started'
            }
            actionLabel={canEditInventory && !searchQuery ? 'Add Product' : undefined}
            onAction={canEditInventory && !searchQuery ? handleAddProduct : undefined}
          />
        }
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
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
});

export default InventoryListScreen;
