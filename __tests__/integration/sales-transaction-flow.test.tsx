import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import SalesScreen from '../../screens/sales/SalesScreen';
import { useSales } from '../../hooks/useSales';
import { useSalesCart } from '../../hooks/useSalesCart';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../hooks/useSales');
jest.mock('../../hooks/useSalesCart');
jest.mock('../../lib/supabase');

const mockUseSales = useSales as jest.MockedFunction<typeof useSales>;
const mockUseSalesCart = useSalesCart as jest.MockedFunction<typeof useSalesCart>;

describe('Sales Transaction Integration Flow', () => {
  const mockProducts = [
    {
      id: '1',
      name: 'Laptop',
      price: 999.99,
      quantity: 5,
      sku: 'LAP001',
      low_stock_threshold: 2,
    },
    {
      id: '2',
      name: 'Mouse',
      price: 29.99,
      quantity: 10,
      sku: 'MOU001',
      low_stock_threshold: 3,
    },
  ];

  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation();

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        ilike: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProducts[0],
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: { id: 'sale123' },
        error: null,
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockProducts[0],
          error: null,
        }),
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Sales Transaction Flow', () => {
    it('completes a full sales transaction successfully', async () => {
      // Setup initial state
      const mockCart = [
        {
          id: '1',
          name: 'Laptop',
          price: 999.99,
          quantity: 1,
          sku: 'LAP001',
        },
        {
          id: '2',
          name: 'Mouse',
          price: 29.99,
          quantity: 2,
          sku: 'MOU001',
        },
      ];

      const mockSalesHook = {
        cart: mockCart,
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 1059.97),
        checkout: jest.fn().mockResolvedValue({
          success: true,
          receiptId: 'receipt123',
          transactionId: 'txn456',
        }),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Verify cart items are displayed
      expect(getByText('Laptop')).toBeTruthy();
      expect(getByText('Mouse')).toBeTruthy();
      expect(getByText('Total: $1059.97')).toBeTruthy();

      // Process checkout
      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(mockSalesHook.checkout).toHaveBeenCalled();
      });

      // Verify success flow
      expect(Alert.alert).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        expect.any(String)
      );
    });

    it('handles inventory updates during sales', async () => {
      const mockSalesHook = {
        cart: [
          {
            id: '1',
            name: 'Laptop',
            price: 999.99,
            quantity: 3, // This should reduce inventory from 5 to 2
            sku: 'LAP001',
          },
        ],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 2999.97),
        checkout: jest.fn().mockResolvedValue({
          success: true,
          receiptId: 'receipt123',
          inventoryUpdated: [
            { id: '1', newQuantity: 2, lowStockAlert: true },
          ],
        }),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Process checkout
      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(mockSalesHook.checkout).toHaveBeenCalled();
      });

      // Should trigger low stock alert since quantity will drop to 2 (threshold)
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Low Stock Alert',
          'Laptop is now low in stock (2 remaining)'
        );
      });
    });

    it('handles insufficient stock scenarios', async () => {
      const mockSalesHook = {
        cart: [
          {
            id: '1',
            name: 'Laptop',
            price: 999.99,
            quantity: 10, // More than available stock (5)
            sku: 'LAP001',
          },
        ],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 9999.90),
        checkout: jest.fn().mockResolvedValue({
          success: false,
          error: 'Insufficient stock for Laptop. Available: 5',
        }),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Attempt checkout
      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Checkout Failed',
          'Insufficient stock for Laptop. Available: 5'
        );
      });
    });

    it('handles payment processing failures', async () => {
      const mockSalesHook = {
        cart: [
          {
            id: '1',
            name: 'Laptop',
            price: 999.99,
            quantity: 1,
            sku: 'LAP001',
          },
        ],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 999.99),
        checkout: jest.fn().mockResolvedValue({
          success: false,
          error: 'Payment declined',
        }),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Checkout Failed',
          'Payment declined'
        );
      });
    });
  });

  describe('Receipt Generation Flow', () => {
    it('generates receipt after successful transaction', async () => {
      const mockSalesHook = {
        cart: [
          {
            id: '1',
            name: 'Laptop',
            price: 999.99,
            quantity: 1,
            sku: 'LAP001',
          },
        ],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 999.99),
        checkout: jest.fn().mockResolvedValue({
          success: true,
          receiptId: 'receipt123',
          transactionId: 'txn456',
          receiptUrl: 'https://example.com/receipt123.pdf',
        }),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(mockSalesHook.checkout).toHaveBeenCalled();
      });

      // Should show receipt options
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Transaction Complete',
          'Receipt ID: receipt123',
          expect.arrayContaining([
            expect.objectContaining({ text: 'View Receipt' }),
            expect.objectContaining({ text: 'Email Receipt' }),
            expect.objectContaining({ text: 'Print Receipt' }),
          ])
        );
      });
    });
  });

  describe('Offline Transaction Handling', () => {
    it('queues transactions when offline', async () => {
      const mockSalesHook = {
        cart: [
          {
            id: '1',
            name: 'Laptop',
            price: 999.99,
            quantity: 1,
            sku: 'LAP001',
          },
        ],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 999.99),
        checkout: jest.fn().mockResolvedValue({
          success: true,
          queued: true,
          localId: 'local123',
          message: 'Transaction queued for sync when online',
        }),
        isProcessing: false,
        syncStatus: 'offline' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Transaction Queued',
          'Transaction queued for sync when online'
        );
      });
    });

    it('syncs queued transactions when back online', async () => {
      const mockSalesHook = {
        cart: [],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 0),
        checkout: jest.fn(),
        isProcessing: false,
        syncStatus: 'syncing' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Should show sync status
      expect(getByText('Sync Status: Syncing')).toBeTruthy();

      // Test retry functionality
      const retryButton = getByText('Retry Sync');
      fireEvent.press(retryButton);

      expect(mockSalesHook.retrySync).toHaveBeenCalled();
    });
  });

  describe('Cart Management Integration', () => {
    it('persists cart state across app restarts', async () => {
      const persistedCart = [
        {
          id: '1',
          name: 'Laptop',
          price: 999.99,
          quantity: 1,
          sku: 'LAP001',
        },
      ];

      // Mock cart hook returning persisted data
      mockUseSalesCart.mockReturnValue({
        cart: persistedCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getItemQuantity: jest.fn(() => 1),
        getTotal: jest.fn(() => 999.99),
        getItemCount: jest.fn(() => 1),
        isEmpty: jest.fn(() => false),
      });

      const mockSalesHook = {
        cart: persistedCart,
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        getCartTotal: jest.fn(() => 999.99),
        checkout: jest.fn(),
        isProcessing: false,
        syncStatus: 'synced' as const,
        retrySync: jest.fn(),
      };

      mockUseSales.mockReturnValue(mockSalesHook);

      const { getByText } = render(
        <NavigationContainer>
          <SalesScreen navigation={mockNavigation} />
        </NavigationContainer>
      );

      // Should load persisted cart items
      expect(getByText('Laptop')).toBeTruthy();
      expect(getByText('Total: $999.99')).toBeTruthy();
    });
  });
});