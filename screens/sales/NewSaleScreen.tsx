import React, { useState, useCallback, useEffect } from 'react';
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
  TextInput,
} from 'react-native';
import { supabase, Product } from '../../lib/supabase';
import { getSalesService } from '../../lib/sales/salesService';
import { PaymentMethod, CustomerInfo } from '../../lib/types/sales';
import { useSalesCart } from '../../hooks/useSalesCart';
import { formatCurrency } from '../../lib/utils';
import useDebounce from '../../hooks/useDebounce';

interface NewSaleScreenProps {
  navigation: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface ProductSearchResult extends Product {
  selected?: boolean;
}

const NewSaleScreen: React.FC<NewSaleScreenProps> = () => {
  const salesService = getSalesService();

  // Cart management
  const {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isEmpty,
  } = useSalesCart();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Payment and customer info
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({});

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load products based on search
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [debouncedSearch, loadProducts]);

  const loadProducts = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(
          `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`
        )
        .limit(20);

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [searchQuery]);

  const handleAddToCart = useCallback(
    async (product: Product, quantity: number = 1) => {
      try {
        await addItem(product, quantity);
        Alert.alert('Added', `${product.name} added to cart`);
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add item to cart');
      }
    },
    [addItem]
  );

  const handleQuantityChange = useCallback(
    (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeItem(productId);
      } else {
        updateQuantity(productId, newQuantity);
      }
    },
    [removeItem, updateQuantity]
  );

  const handleCheckout = useCallback(async () => {
    if (isEmpty()) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    setIsProcessing(true);
    try {
      // Convert CartItem[] to SalesItem[]
      const salesItems = cart.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_name: item.product.name,
      }));

      const result = await salesService.checkout(
        salesItems,
        paymentMethod,
        customerInfo
      );

      if (result.success) {
        Alert.alert(
          'Sale Complete',
          `Transaction completed successfully!\nTransaction ID: ${result.transactionId}`,
          [
            {
              text: 'View Receipt',
              onPress: () => {
                if (result.receipt) {
                  Alert.alert('Receipt', result.receipt);
                }
              },
            },
            {
              text: 'New Sale',
              onPress: () => {
                clearCart();
                setShowPayment(false);
                setCustomerInfo({});
                setSearchQuery('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  }, [
    isEmpty,
    cart.items,
    paymentMethod,
    customerInfo,
    salesService,
    clearCart,
  ]);

  const renderProductItem = ({
    item: product,
  }: {
    item: ProductSearchResult;
  }) => (
    <View style={styles.productItem}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDetails}>
          SKU: {product.sku} | Stock: {product.quantity}
        </Text>
        <Text style={styles.productPrice}>
          {formatCurrency(product.unit_price || 0)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddToCart(product)}
        disabled={product.quantity <= 0}
      >
        <Text style={styles.addButtonText}>
          {product.quantity <= 0 ? 'Out of Stock' : 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = (
    item: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => (
    <View key={item.product.id} style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>
          {formatCurrency(item.unit_price)} each
        </Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() =>
            handleQuantityChange(item.product.id, item.quantity - 1)
          }
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() =>
            handleQuantityChange(item.product.id, item.quantity + 1)
          }
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>
        {formatCurrency(item.total_price)}
      </Text>
    </View>
  );

  if (showPayment) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPayment(false)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Payment & Customer Info</Text>
          </View>

          <ScrollView style={styles.content}>
            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <Text style={styles.orderSummary}>
                {getItemCount()} items • Total: {formatCurrency(getTotal())}
              </Text>
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {(['cash', 'card', 'transfer', 'other'] as PaymentMethod[]).map(
                  method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethod,
                        paymentMethod === method &&
                          styles.paymentMethodSelected,
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.paymentMethodText,
                          paymentMethod === method &&
                            styles.paymentMethodTextSelected,
                        ]}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Customer Information (Optional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder='Customer Name'
                value={customerInfo.name || ''}
                onChangeText={text =>
                  setCustomerInfo(prev => ({ ...prev, name: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder='Email'
                value={customerInfo.email || ''}
                onChangeText={text =>
                  setCustomerInfo(prev => ({ ...prev, email: text }))
                }
                keyboardType='email-address'
                autoCapitalize='none'
              />
              <TextInput
                style={styles.input}
                placeholder='Phone'
                value={customerInfo.phone || ''}
                onChangeText={text =>
                  setCustomerInfo(prev => ({ ...prev, phone: text }))
                }
                keyboardType='phone-pad'
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder='Notes'
                value={customerInfo.notes || ''}
                onChangeText={text =>
                  setCustomerInfo(prev => ({ ...prev, notes: text }))
                }
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                isProcessing && styles.checkoutButtonDisabled,
              ]}
              onPress={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  Complete Sale • {formatCurrency(getTotal())}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>New Sale</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder='Search products by name, SKU, or barcode...'
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize='none'
          />
        </View>

        {/* Product Search Results */}
        <View style={styles.productList}>
          {isLoadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color='#007AFF' />
              <Text style={styles.loadingText}>Searching products...</Text>
            </View>
          ) : products.length > 0 ? (
            <ScrollView>
              {products.map(product => (
                <View key={product.id}>
                  {renderProductItem({ item: product })}
                </View>
              ))}
            </ScrollView>
          ) : searchQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start typing to search products
              </Text>
            </View>
          )}
        </View>

        {/* Cart Summary */}
        {!isEmpty() && (
          <View style={styles.cartContainer}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>
                Cart ({getItemCount()} items)
              </Text>
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
            >
              {cart.items.map(item => renderCartItem(item))}
            </ScrollView>

            <View style={styles.cartTotal}>
              <Text style={styles.totalText}>
                Total: {formatCurrency(getTotal())}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => setShowPayment(true)}
            >
              <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  productList: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  productItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cartContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    maxHeight: 300,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    color: '#FF3B30',
    fontSize: 16,
  },
  cartItems: {
    maxHeight: 150,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cartTotal: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  proceedButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  orderSummary: {
    fontSize: 16,
    color: '#666',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  paymentMethodSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    color: '#333',
    fontWeight: '600',
  },
  paymentMethodTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  checkoutButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NewSaleScreen;
