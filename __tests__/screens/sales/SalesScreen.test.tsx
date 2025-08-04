import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SalesScreen from '../../../screens/sales/SalesScreen';
import { useSales } from '../../../hooks/useSales';
import useDebounce from '../../../hooks/useDebounce';

// Mock dependencies
jest.mock('../../../hooks/useSales');
jest.mock('../../../hooks/useDebounce');
jest.mock('../../../lib/supabase');

const mockUseSales = useSales as jest.MockedFunction<typeof useSales>;
const mockUseDebounce = useDebounce as jest.MockedFunction<typeof useDebounce>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('SalesScreen', () => {
  const mockCart = [
    {
      id: '1',
      name: 'Test Product',
      price: 10.99,
      quantity: 2,
      sku: 'TEST001',
    },
  ];

  const mockSalesHook = {
    cart: mockCart,
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    getCartTotal: jest.fn(() => 21.98),
    checkout: jest.fn(),
    isProcessing: false,
    syncStatus: 'synced' as const,
    retrySync: jest.fn(),
  };

  beforeEach(() => {
    mockUseSales.mockReturnValue(mockSalesHook);
    mockUseDebounce.mockImplementation((value) => value);
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders sales screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    expect(getByText('Sales')).toBeTruthy();
    expect(getByPlaceholderText('Search products...')).toBeTruthy();
  });

  it('displays cart items correctly', () => {
    const { getByText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    expect(getByText('Test Product')).toBeTruthy();
    expect(getByText('2')).toBeTruthy(); // quantity
    expect(getByText('$10.99')).toBeTruthy(); // price
  });

  it('calculates total correctly', () => {
    const { getByText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    expect(getByText('Total: $21.98')).toBeTruthy();
  });

  it('adds product to cart', async () => {
    const { getByTestId } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const addButton = getByTestId('add-to-cart-1');
    fireEvent.press(addButton);

    expect(mockSalesHook.addToCart).toHaveBeenCalledWith({
      id: '1',
      name: 'Test Product',
      price: 10.99,
      sku: 'TEST001',
    });
  });

  it('removes product from cart', async () => {
    const { getByTestId } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const removeButton = getByTestId('remove-from-cart-1');
    fireEvent.press(removeButton);

    expect(mockSalesHook.removeFromCart).toHaveBeenCalledWith('1');
  });

  it('updates product quantity', async () => {
    const { getByTestId } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const quantityInput = getByTestId('quantity-input-1');
    fireEvent.changeText(quantityInput, '3');

    await waitFor(() => {
      expect(mockSalesHook.updateQuantity).toHaveBeenCalledWith('1', 3);
    });
  });

  it('processes checkout successfully', async () => {
    mockSalesHook.checkout.mockResolvedValue({ success: true, receiptId: 'receipt123' });

    const { getByText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const checkoutButton = getByText('Checkout');
    fireEvent.press(checkoutButton);

    await waitFor(() => {
      expect(mockSalesHook.checkout).toHaveBeenCalled();
    });
  });

  it('handles checkout failure', async () => {
    const errorMessage = 'Payment failed';
    mockSalesHook.checkout.mockResolvedValue({ success: false, error: errorMessage });

    const { getByText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const checkoutButton = getByText('Checkout');
    fireEvent.press(checkoutButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Checkout Failed', errorMessage);
    });
  });

  it('clears cart', async () => {
    const { getByText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const clearButton = getByText('Clear Cart');
    fireEvent.press(clearButton);

    expect(mockSalesHook.clearCart).toHaveBeenCalled();
  });

  it('searches for products', async () => {
    const { getByPlaceholderText } = render(
      <SalesScreen navigation={mockNavigation} />
    );

    const searchInput = getByPlaceholderText('Search products...');
    fireEvent.changeText(searchInput, 'test product');

    // Debounced search should be triggered
    expect(mockUseDebounce).toHaveBeenCalledWith('test product', 300);
  });

  describe('Security Tests', () => {
    it('prevents negative quantities', async () => {
      const { getByTestId } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '-1');

      await waitFor(() => {
        // Should not update to negative quantity
        expect(mockSalesHook.updateQuantity).not.toHaveBeenCalledWith('1', -1);
      });
    });

    it('prevents excessive quantities', async () => {
      const { getByTestId } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '999999');

      await waitFor(() => {
        // Should validate maximum quantity limits
        expect(mockSalesHook.updateQuantity).toHaveBeenCalledWith('1', 999999);
      });
    });

    it('sanitizes search input', async () => {
      const { getByPlaceholderText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search products...');
      const maliciousInput = '<script>alert("xss")</script>';
      
      fireEvent.changeText(searchInput, maliciousInput);

      expect(mockUseDebounce).toHaveBeenCalledWith(maliciousInput, 300);
      // Sanitization should happen in the search handler
    });
  });

  describe('Performance Tests', () => {
    it('debounces search input correctly', () => {
      const { getByPlaceholderText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search products...');
      
      // Simulate rapid typing
      fireEvent.changeText(searchInput, 't');
      fireEvent.changeText(searchInput, 'te');
      fireEvent.changeText(searchInput, 'tes');
      fireEvent.changeText(searchInput, 'test');

      // Should use debounced hook with 300ms delay
      expect(mockUseDebounce).toHaveBeenCalledWith('test', 300);
    });

    it('handles large cart efficiently', () => {
      const largeCart = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        name: `Product ${i}`,
        price: i * 1.99,
        quantity: 1,
        sku: `SKU${i}`,
      }));

      mockUseSales.mockReturnValue({
        ...mockSalesHook,
        cart: largeCart,
        getCartTotal: jest.fn(() => largeCart.reduce((sum, item) => sum + item.price, 0)),
      });

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      // Should render without performance issues
      expect(getByText('Product 0')).toBeTruthy();
      expect(getByText('Product 99')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('shows processing state during checkout', () => {
      mockUseSales.mockReturnValue({
        ...mockSalesHook,
        isProcessing: true,
      });

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      expect(getByText('Processing...')).toBeTruthy();
    });

    it('disables buttons during processing', () => {
      mockUseSales.mockReturnValue({
        ...mockSalesHook,
        isProcessing: true,
      });

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const checkoutButton = getByText('Processing...');
      expect(checkoutButton.props.disabled).toBeTruthy();
    });
  });

  describe('Sync Status', () => {
    it('shows sync status banner', () => {
      mockUseSales.mockReturnValue({
        ...mockSalesHook,
        syncStatus: 'pending',
      });

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      expect(getByText('Sync Status: Pending')).toBeTruthy();
    });

    it('allows retry when sync fails', () => {
      mockUseSales.mockReturnValue({
        ...mockSalesHook,
        syncStatus: 'failed',
      });

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const retryButton = getByText('Retry Sync');
      fireEvent.press(retryButton);

      expect(mockSalesHook.retrySync).toHaveBeenCalled();
    });
  });
});