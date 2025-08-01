import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import DebouncedSearchBar from '../../components/DebouncedSearchBar';
import { supabase, Product } from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';

interface SearchExampleProps {
  navigation: any;
}

/**
 * Example screen demonstrating the DebouncedSearchBar component
 * with a product search implementation.
 */
const SearchExample: React.FC<SearchExampleProps> = ({ navigation }) => {
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  /**
   * Perform product search with debounced query
   */
  const handleSearch = useCallback(async (query: string) => {
    // Don't search if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setSearchPerformed(false);
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      // Search products by name, SKU, or barcode
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(
          `name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`
        )
        .limit(20);

      if (error) {
        throw error;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      // In a real app, show an error message to the user
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle product selection
   */
  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  /**
   * Render a product card
   */
  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        onQRPress={() => {}}
        canEdit={false}
      />
    ),
    [handleProductPress]
  );

  /**
   * Render empty state based on search context
   */
  const renderEmptyState = useCallback(() => {
    if (!searchPerformed) {
      return (
        <EmptyState
          title='Search Products'
          subtitle='Enter a product name, SKU, or barcode to search'
          icon='search'
        />
      );
    }

    return (
      <EmptyState
        title='No results found'
        subtitle='Try a different search term'
        icon='alert-circle-outline'
      />
    );
  }, [searchPerformed]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Search</Text>
        <Text style={styles.subtitle}>Search by name, SKU, or barcode</Text>
      </View>

      {/* Debounced Search Bar with 500ms delay */}
      <DebouncedSearchBar
        onSearch={handleSearch}
        placeholder='Search products...'
        debounceDelay={500}
        showLoading={true}
      />

      {/* Main content area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color='#007AFF' />
            <Text style={styles.loadingText}>Searching products...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderProductItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>
    </View>
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
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
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
});

export default SearchExample;
