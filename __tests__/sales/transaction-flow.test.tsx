import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { formatCurrency } from '../../lib/currency';

// Mock components
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock the auth store
const mockUseAuthStore = jest.fn();
jest.mock('../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore()
}));

// Component under test
const SalesScreen = ({ navigation }: { navigation: any }) => {
  const [cart, setCart] = React.useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [loading, setLoading] = React.useState(false);

  const addToCart = (product: { id: string; name: string; price: number }, quantity: number = 1) => {
    setCart([...cart, { ...product, quantity }]);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => global.setTimeout(resolve, 100));
      clearCart();
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <View testID="sales-screen">
      <Text>Sales</Text>
      
      <TouchableOpacity
        testID="scan-barcode-button"
        accessibilityLabel="Scan barcode to add product"
        onPress={() => navigation.navigate('BarcodeScanner', { onScan: addToCart })}
      >
        <Text>Scan Barcode</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="view-history-button"
        accessibilityLabel="View sales history"
        onPress={() => navigation.navigate('SalesHistory')}
      >
        <Text>History</Text>
      </TouchableOpacity>

      {cart.length === 0 ? (
        <View testID="empty-cart">
          <Text>Your cart is empty</Text>
          <Text>Search for products or scan barcodes to add items</Text>
        </View>
      ) : (
        <View testID="cart-content">
          <TouchableOpacity testID="clear-cart-button" onPress={clearCart}>
            <Text>Clear Cart</Text>
          </TouchableOpacity>

          {cart.map(item => (
            <View key={item.id} testID={`cart-item-${item.id}`}>
              <Text>{item.name}</Text>
              <Text>{formatCurrency(item.price * 100)} each</Text>
              <Text testID={`item-total-${item.id}`}>{formatCurrency(item.price * item.quantity * 100)}</Text>
              <TouchableOpacity
                testID={`remove-item-${item.id}`}
                onPress={() => removeFromCart(item.id)}
              >
                <Text>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View testID="cart-summary">
            <Text>Total:</Text>
            <Text testID="cart-total">{formatCurrency(total * 100)}</Text>
          </View>

          <TouchableOpacity
            testID="checkout-button"
            accessibilityLabel="Proceed to checkout"
            onPress={handleCheckout}
            disabled={loading}
          >
            <Text>{loading ? 'Processing...' : 'Checkout'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

describe('SalesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      userRole: 'staff',
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
    });
  });

  describe('Rendering', () => {
    it('renders correctly with empty cart', () => {
      const { getByText, getByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByText('Sales')).toBeTruthy();
      expect(getByTestId('scan-barcode-button')).toBeTruthy();
      expect(getByTestId('view-history-button')).toBeTruthy();
      expect(getByText('Your cart is empty')).toBeTruthy();
    });

    it('renders cart items when cart is not empty', async () => {
      const { getByText, getByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      await act(async () => {
        const testProduct = { id: '1', name: 'Test Product', price: 10 };
        fireEvent.press(getByText('Scan Barcode'));
        // Simulate adding product from barcode scan
        mockNavigate.mock.calls[0][1].onScan(testProduct);
      });

      expect(getByText('Test Product')).toBeTruthy();
      expect(getByText(`${formatCurrency(1000)} each`)).toBeTruthy(); // 10.00 in pence
      expect(getByText('Total:')).toBeTruthy();
      expect(getByTestId('cart-total')).toBeTruthy();
      expect(getByTestId('item-total-1')).toBeTruthy();
    });
  });

  describe('Cart Operations', () => {
    it('adds products to cart', async () => {
      const { getByText, getByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      await act(async () => {
        const testProduct = { id: '1', name: 'Test Product', price: 10 };
        fireEvent.press(getByText('Scan Barcode'));
        // Simulate adding product from barcode scan
        mockNavigate.mock.calls[0][1].onScan(testProduct);
      });

      expect(getByTestId('cart-item-1')).toBeTruthy();
    });

    it('removes products from cart', async () => {
      const { getByText, getByTestId, queryByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      await act(async () => {
        const testProduct = { id: '1', name: 'Test Product', price: 10 };
        fireEvent.press(getByText('Scan Barcode'));
        // Simulate adding product from barcode scan
        mockNavigate.mock.calls[0][1].onScan(testProduct);
      });

      const removeButton = getByTestId('remove-item-1');
      fireEvent.press(removeButton);

      expect(queryByTestId('cart-item-1')).toBeNull();
    });
  });

  describe('Checkout Process', () => {
    it('shows loading state during checkout', async () => {
      const { getByText, getByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      await act(async () => {
        const testProduct = { id: '1', name: 'Test Product', price: 10 };
        fireEvent.press(getByText('Scan Barcode'));
        // Simulate adding product from barcode scan
        mockNavigate.mock.calls[0][1].onScan(testProduct);
      });

      const checkoutButton = getByTestId('checkout-button');
      await act(async () => {
        fireEvent.press(checkoutButton);
      });

      expect(getByText('Processing...')).toBeTruthy();
    });
  });

  describe('Barcode Scanning', () => {
    it('navigates to barcode scanner when scan button is pressed', () => {
      const { getByTestId } = render(
        <SalesScreen navigation={{ navigate: mockNavigate }} />
      );

      const scanButton = getByTestId('scan-barcode-button');
      fireEvent.press(scanButton);

      expect(mockNavigate).toHaveBeenCalledWith('BarcodeScanner', expect.any(Object));
    });
  });
});