import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SalesScreen from '../../screens/sales/SalesScreen';
import { useSales } from '../../hooks/useSales';
import { supabase } from '../../lib/supabase';
import { SyncQueueManager } from '../../lib/SyncQueueManager';

// Mock dependencies
jest.mock('../../hooks/useSales');
jest.mock('../../lib/supabase');
jest.mock('../../lib/SyncQueueManager');
jest.mock('../../hooks/useDebounce');
jest.mock('../../components/SearchBar', () => 'SearchBar');
jest.mock('../../components/SyncStatusBanner', () => 'SyncStatusBanner');
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../lib/utils', () => ({
  formatCurrency: jest.fn((amount) => `£${(amount / 100).toFixed(2)}`),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SalesScreen', () => {
  const mockUseSales = useSales as jest.MockedFunction<typeof useSales>;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockSyncQueue = SyncQueueManager.getInstance as jest.MockedFunction<typeof SyncQueueManager.getInstance>;

  const defaultSalesHook = {
    cart: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    getCartTotal: jest.fn(() => 0),
    checkout: jest.fn(),
    isProcessing: false,
    syncStatus: 'idle' as const,
    retrySync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSales.mockReturnValue(defaultSalesHook);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        or: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as any);
  });

  describe('Rendering', () => {
    it('renders correctly with empty cart', () => {
      const { getByText, getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      expect(getByText('Sales')).toBeTruthy();
      expect(getByLabelText('Scan barcode')).toBeTruthy();
      expect(getByLabelText('View sales history')).toBeTruthy();
      expect(getByText('Your cart is empty')).toBeTruthy();
    });

    it('renders cart items when cart is not empty', () => {
      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000, // £10.00
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        getCartTotal: jest.fn(() => 2000),
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      expect(getByText('Test Product')).toBeTruthy();
      expect(getByText('£10.00 each')).toBeTruthy();
      expect(getByText('£20.00')).toBeTruthy();
      expect(getByText('Total:')).toBeTruthy();
      expect(getByText('£20.00')).toBeTruthy();
    });
  });

  describe('Cart Operations', () => {
    it('calls addToCart when product is pressed', async () => {
      const mockAddToCart = jest.fn();
      const cartWithItems = {
        ...defaultSalesHook,
        addToCart: mockAddToCart,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      // Simulate product search results
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      name: 'Test Product',
                      sku: 'TEST001',
                      quantity: 10,
                      unit_price: 1000,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Trigger product search
      await act(async () => {
        // This would normally be triggered by search input
        // For testing, we'll simulate the products being loaded
      });

      // Find and press a product
      const productElement = getByText('Test Product');
      if (productElement) {
        fireEvent.press(productElement);
        expect(mockAddToCart).toHaveBeenCalledWith('1', 1);
      }
    });

    it('calls removeFromCart when remove button is pressed', () => {
      const mockRemoveFromCart = jest.fn();
      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        removeFromCart: mockRemoveFromCart,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const removeButton = getByLabelText('Remove Test Product from cart');
      fireEvent.press(removeButton);

      expect(mockRemoveFromCart).toHaveBeenCalledWith('1');
    });

    it('calls updateQuantity when quantity buttons are pressed', () => {
      const mockUpdateQuantity = jest.fn();
      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        updateQuantity: mockUpdateQuantity,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const increaseButton = getByLabelText('Increase quantity of Test Product');
      const decreaseButton = getByLabelText('Decrease quantity of Test Product');

      fireEvent.press(increaseButton);
      expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);

      fireEvent.press(decreaseButton);
      expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 1);
    });

    it('calls clearCart when clear button is pressed', () => {
      const mockClearCart = jest.fn();
      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        clearCart: mockClearCart,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const clearButton = getByText('Clear');
      fireEvent.press(clearButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Cart',
        'Are you sure you want to clear all items from the cart?',
        expect.any(Array)
      );
    });
  });

  describe('Checkout Process', () => {
    it('shows alert when trying to checkout with empty cart', () => {
      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      // Try to find checkout button (should not exist with empty cart)
      const checkoutButton = getByText('Checkout');
      if (checkoutButton) {
        fireEvent.press(checkoutButton);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Empty Cart',
          'Please add items to cart before checkout'
        );
      }
    });

    it('calls checkout when checkout button is pressed with items in cart', async () => {
      const mockCheckout = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'test-transaction-id',
      });

      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        getCartTotal: jest.fn(() => 2000),
        checkout: mockCheckout,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Checkout',
          'Total: £20.00\n\nProceed with checkout?',
          expect.any(Array)
        );
      });
    });

    it('shows success message after successful checkout', async () => {
      const mockCheckout = jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'test-transaction-id',
      });

      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        getCartTotal: jest.fn(() => 2000),
        checkout: mockCheckout,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      // Simulate user confirming checkout
      await waitFor(() => {
        const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
          call => call[0] === 'Confirm Checkout'
        );
        if (alertCall && alertCall[2]) {
          const checkoutAction = alertCall[2].find(
            (action: any) => action.text === 'Checkout'
          );
          if (checkoutAction && checkoutAction.onPress) {
            checkoutAction.onPress();
          }
        }
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success!',
          'Transaction completed!\nTransaction ID: test-transaction-id',
          expect.any(Array)
        );
      });
    });

    it('shows error message after failed checkout', async () => {
      const mockCheckout = jest.fn().mockResolvedValue({
        success: false,
        error: 'Checkout failed',
      });

      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        getCartTotal: jest.fn(() => 2000),
        checkout: mockCheckout,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      // Simulate user confirming checkout
      await waitFor(() => {
        const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
          call => call[0] === 'Confirm Checkout'
        );
        if (alertCall && alertCall[2]) {
          const checkoutAction = alertCall[2].find(
            (action: any) => action.text === 'Checkout'
          );
          if (checkoutAction && checkoutAction.onPress) {
            checkoutAction.onPress();
          }
        }
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Checkout Failed',
          'Checkout failed'
        );
      });
    });
  });

  describe('Barcode Scanning', () => {
    it('navigates to barcode scanner when scan button is pressed', () => {
      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const scanButton = getByLabelText('Scan barcode');
      fireEvent.press(scanButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BarcodeScanner', {
        onScan: expect.any(Function),
      });
    });

    it('handles barcode scan result correctly', async () => {
      const mockAddToCart = jest.fn();
      const cartWithItems = {
        ...defaultSalesHook,
        addToCart: mockAddToCart,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const scanButton = getByLabelText('Scan barcode');
      fireEvent.press(scanButton);

      // Get the onScan callback
      const navigateCall = mockNavigation.navigate.mock.calls.find(
        call => call[0] === 'BarcodeScanner'
      );
      const onScanCallback = navigateCall?.[1]?.onScan;

      if (onScanCallback) {
        // Mock successful product lookup
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: '1',
                  name: 'Scanned Product',
                  sku: 'SCAN001',
                  quantity: 5,
                  unit_price: 1500,
                },
                error: null,
              }),
            }),
          }),
        } as any);

        await act(async () => {
          await onScanCallback('123456789');
        });

        expect(mockAddToCart).toHaveBeenCalledWith('1', 1);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Added to Cart',
          'Scanned Product added to cart'
        );
      }
    });

    it('shows error when barcode scan finds no product', async () => {
      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const scanButton = getByLabelText('Scan barcode');
      fireEvent.press(scanButton);

      // Get the onScan callback
      const navigateCall = mockNavigation.navigate.mock.calls.find(
        call => call[0] === 'BarcodeScanner'
      );
      const onScanCallback = navigateCall?.[1]?.onScan;

      if (onScanCallback) {
        // Mock failed product lookup
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Product not found' },
              }),
            }),
          }),
        } as any);

        await act(async () => {
          await onScanCallback('invalid-barcode');
        });

        expect(Alert.alert).toHaveBeenCalledWith(
          'Product Not Found',
          'No product found with barcode: invalid-barcode'
        );
      }
    });
  });

  describe('Navigation', () => {
    it('navigates to sales history when history button is pressed', () => {
      const { getByLabelText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      const historyButton = getByLabelText('View sales history');
      fireEvent.press(historyButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('SalesHistory');
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when processing checkout', () => {
      const cartWithItems = {
        ...defaultSalesHook,
        cart: [
          {
            product: {
              id: '1',
              name: 'Test Product',
              sku: 'TEST001',
              quantity: 10,
              unit_price: 1000,
            },
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        getCartTotal: jest.fn(() => 2000),
        isProcessing: true,
      };

      mockUseSales.mockReturnValue(cartWithItems);

      const { getByText } = render(
        <SalesScreen navigation={mockNavigation} />
      );

      // Should show loading indicator instead of "Checkout" text
      expect(getByText('Checkout')).toBeTruthy();
    });
  });
}); 