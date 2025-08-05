import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Camera from 'expo-camera';
import { useSales } from '../../hooks/useSales';
import useDebounce from '../../hooks/useDebounce';
import { supabase, Product } from '../../lib/supabase';
import Icon from '../../components/Icon';
import SearchBar from '../../components/SearchBar';
import SyncStatusBanner from '../../components/SyncStatusBanner';
import { formatCurrency } from '../../lib/utils';

interface SalesScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const SalesScreen: React.FC<SalesScreenProps> = ({ navigation }) => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    checkout,
    isProcessing,
    syncStatus,
    retrySync
  } = useSales();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load products based on search
  React.useEffect(() => {
    if (debouncedSearch) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [debouncedSearch, loadProducts]);

  const loadProducts = async () => {
    if (!debouncedSearch.trim()) {
      setProducts([]);
      return;
    }

    setIsLoadingProducts(true);
    
    // Set up timeout for the request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    try {
      const searchPromise = supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%,barcode.eq.${debouncedSearch}`)
        .gt('quantity', 0)
        .order('name')
        .limit(20);

      const { data, error } = await Promise.race([searchPromise, timeoutPromise]) as {
        data?: Product[];
        error?: Error;
      };

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      
      let errorMessage = 'Failed to load products';
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
      }
      
      Alert.alert(
        'Error Loading Products',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => loadProducts() }
        ]
      );
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleScanBarcode = useCallback(async (barcode: string) => {
    try {
      // Set up timeout for the barcode lookup
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000); // 8 second timeout
      });

      const searchPromise = supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single();

      const { data: product, error } = await Promise.race([searchPromise, timeoutPromise]) as {
        data?: Product;
        error?: Error;
      };

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          Alert.alert(
            'Product Not Found', 
            `No product found with barcode: ${barcode}`,
            [
              { text: 'OK', style: 'default' },
              { text: 'Try Again', onPress: () => handleBarcodeScanPress() }
            ]
          );
          return;
        }
        throw error;
      }

      if (!product) {
        Alert.alert(
          'Product Not Found', 
          `No product found with barcode: ${barcode}`,
          [
            { text: 'OK', style: 'default' },
            { text: 'Try Again', onPress: () => handleBarcodeScanPress() }
          ]
        );
        return;
      }

      if (product.quantity <= 0) {
        Alert.alert(
          'Out of Stock', 
          `${product.name} is currently out of stock`,
          [
            { text: 'OK', style: 'default' },
            { text: 'Scan Another', onPress: () => handleBarcodeScanPress() }
          ]
        );
        return;
      }

      await addToCart(product.id, 1);
      Alert.alert(
        'Added to Cart', 
        `${product.name} added to cart`,
        [
          { text: 'OK', style: 'default' },
          { text: 'Scan Another', onPress: () => handleBarcodeScanPress() }
        ]
      );
    } catch (error) {
      console.error('Failed to add scanned product:', error);
      
      let errorMessage = 'Failed to add product to cart';
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
      }
      
      Alert.alert(
        'Error', 
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleScanBarcode(barcode) }
        ]
      );
    }
  }, [addToCart, handleBarcodeScanPress]);

  const handleBarcodeScanPress = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        navigation.navigate('BarcodeScanner', { onScan: handleScanBarcode });
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to scan barcodes. Please enable camera permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Camera.openSettingsAsync) {
                Camera.openSettingsAsync();
              }
            } }
          ]
        );
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert('Error', 'Failed to access camera. Please check your device settings.');
    }
  };

     const handleCheckout = async () => {
     if (!cart || cart.length === 0) {
       Alert.alert('Empty Cart', 'Please add items to cart before checkout');
       return;
     }

    Alert.alert(
      'Confirm Checkout',
      `Total: ${formatCurrency(getCartTotal())}\n\nProceed with checkout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Checkout',
          onPress: async () => {
            const result = await checkout();
            if (result.success) {
              Alert.alert(
                'Success!',
                `Transaction completed!\nTransaction ID: ${result.transactionId}`,
                [
                  {
                    text: 'Print Receipt',
                    onPress: () => {
                      // TODO: Implement receipt printing
                      console.log('Print receipt for:', result.transactionId);
                    }
                  },
                  { text: 'OK' }
                ]
              );
            } else {
              Alert.alert('Checkout Failed', result.error || 'Unknown error');
            }
          }
        }
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items from the cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCart }
      ]
    );
  };

     const renderCartItem = (item: any) => {
     if (!item || !item.product) {
       return null;
     }
     
     return (
       <View key={item.product.id} style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>
          {formatCurrency(item.unit_price)} each
        </Text>
      </View>
      
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
          accessibilityLabel={`Decrease quantity of ${item.product.name}`}
        >
          <Icon name="minus" size={16} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
          accessibilityLabel={`Increase quantity of ${item.product.name}`}
        >
          <Icon name="plus" size={16} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.product.id)}
          accessibilityLabel={`Remove ${item.product.name} from cart`}
        >
          <Icon name="trash" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
             <Text style={styles.cartItemTotal}>
         {formatCurrency(item.total_price)}
       </Text>
     </View>
     );
   };

  const renderProductItem = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productItem}
      onPress={() => addToCart(product.id, 1)}
      accessibilityLabel={`Add ${product.name} to cart`}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productSku}>SKU: {product.sku}</Text>
        <Text style={styles.productStock}>
          Stock: {product.quantity} | {formatCurrency(product.unit_price || 0)}
        </Text>
      </View>
      <Icon name="plus-circle" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Sales</Text>
          <View style={styles.headerActions}>
            {/* Barcode Scanner Button */}
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleBarcodeScanPress}
              accessibilityLabel="Scan barcode to add product"
            >
              <Icon name="barcode" size={20} color="#007AFF" />
            </TouchableOpacity>
            {/* Sales History Button */}
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('SalesHistory')}
              accessibilityLabel="View sales history"
            >
              <Icon name="clock" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Status */}
        <SyncStatusBanner
          status={syncStatus}
          onRetry={retrySync}
          message="Sales sync status"
        />

        <View style={styles.content}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <SearchBar
              placeholder="Search products by name, SKU, or barcode..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={loadProducts}
            />
          </View>

          {/* Products List */}
          {searchQuery && (
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Products</Text>
              {isLoadingProducts ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <ScrollView style={styles.productsList}>
                  {products.map(renderProductItem)}
                  {products.length === 0 && searchQuery && (
                    <Text style={styles.noResults}>No products found</Text>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {/* Cart Section */}
          <View style={styles.cartSection}>
            <View style={styles.cartHeader}>
              <Text style={styles.sectionTitle}>Cart</Text>
                             {cart && cart.length > 0 && (
                 <TouchableOpacity
                   style={styles.clearButton}
                   onPress={handleClearCart}
                   accessibilityLabel="Clear cart"
                 >
                   <Text style={styles.clearButtonText}>Clear</Text>
                 </TouchableOpacity>
               )}
            </View>

                         {!cart || cart.length === 0 ? (
               <View style={styles.emptyCart}>
                 <Icon name="shopping-cart" size={48} color="#C7C7CC" />
                 <Text style={styles.emptyCartText}>Your cart is empty</Text>
                 <Text style={styles.emptyCartSubtext}>
                   Search for products or scan barcodes to add items
                 </Text>
               </View>
             ) : (
               <ScrollView style={styles.cartList}>
                 {cart.map(renderCartItem)}
               </ScrollView>
             )}
          </View>

                     {/* Checkout Section */}
           {cart && cart.length > 0 && (
            <View style={styles.checkoutSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(getCartTotal())}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.checkoutButton, isProcessing && styles.checkoutButtonDisabled]}
                onPress={handleCheckout}
                disabled={isProcessing}
                accessibilityLabel="Proceed to checkout"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkoutButtonText}>Checkout</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  historyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  productsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  productsList: {
    maxHeight: 200,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 14,
    color: '#007AFF',
  },
  noResults: {
    textAlign: 'center',
    color: '#8E8E93',
    padding: 20,
  },
  cartSection: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cartItemInfo: {
    marginBottom: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#8E8E93',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  checkoutSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SalesScreen; 