/* global setTimeout */

import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSalesCart } from '../../hooks/useSalesCart';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockProduct = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST001',
  description: 'A test product',
  unit_price: 1000, // 1000 pence = 10.00 in currency
  quantity: 10,
  category: 'Test',
  image_url: null,
  barcode: '123456789',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockProduct2 = {
  id: '2',
  name: 'Test Product 2',
  sku: 'TEST002',
  description: 'Another test product',
  unit_price: 2000, // 2000 pence = 20.00 in currency
  quantity: 5,
  category: 'Test',
  image_url: null,
  barcode: '987654321',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useSalesCart', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useSalesCart());

      expect(result.current.cart.items).toEqual([]);
      expect(result.current.cart.total).toBe(0);
      expect(result.current.cart.itemCount).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });

    it('should load cart from storage on mount', async () => {
      const savedCart = {
        items: [
          {
            product: mockProduct,
            quantity: 2,
            unit_price: 1000,
            total_price: 2000,
          },
        ],
        total: 2000,
        itemCount: 2,
      };

      await AsyncStorage.setItem('@sales_cart', JSON.stringify(savedCart));

      const { result } = renderHook(() => useSalesCart());

      // Wait for the effect to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.total).toBe(2000);
      expect(result.current.cart.itemCount).toBe(2);
      expect(result.current.isEmpty()).toBe(false);
    });
  });

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].product.id).toBe('1');
      expect(result.current.cart.items[0].quantity).toBe(2);
      expect(result.current.cart.items[0].total_price).toBe(2000);
      expect(result.current.cart.total).toBe(2000);
      expect(result.current.cart.itemCount).toBe(2);
    });

    it('should update existing item quantity when adding same product', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
      expect(result.current.cart.items[0].total_price).toBe(3000);
      expect(result.current.cart.total).toBe(3000);
      expect(result.current.cart.itemCount).toBe(3);
    });

    it('should handle multiple different products', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct2, 2);
      });

      expect(result.current.cart.items).toHaveLength(2);
      expect(result.current.cart.total).toBe(5000); // 1000 + (2000 * 2)
      expect(result.current.cart.itemCount).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.cart.items).toHaveLength(2);

      act(() => {
        result.current.removeItem('1');
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].product.id).toBe('2');
      expect(result.current.cart.total).toBe(2000);
      expect(result.current.cart.itemCount).toBe(1);
    });

    it('should handle removing non-existent item', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      const initialTotal = result.current.cart.total;

      act(() => {
        result.current.removeItem('999');
      });

      expect(result.current.cart.total).toBe(initialTotal);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      act(() => {
        result.current.updateQuantity('1', 3);
      });

      expect(result.current.cart.items[0].quantity).toBe(3);
      expect(result.current.cart.items[0].total_price).toBe(3000);
      expect(result.current.cart.total).toBe(3000);
      expect(result.current.cart.itemCount).toBe(3);
    });

    it('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);

      act(() => {
        result.current.updateQuantity('1', 0);
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.total).toBe(0);
      expect(result.current.cart.itemCount).toBe(0);
    });

    it('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);

      act(() => {
        result.current.updateQuantity('1', -1);
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.total).toBe(0);
      expect(result.current.cart.itemCount).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.cart.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.total).toBe(0);
      expect(result.current.cart.itemCount).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('getItemQuantity', () => {
    it('should return correct quantity for existing item', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 3);
      });

      expect(result.current.getItemQuantity('1')).toBe(3);
    });

    it('should return 0 for non-existent item', () => {
      const { result } = renderHook(() => useSalesCart());

      expect(result.current.getItemQuantity('999')).toBe(0);
    });
  });

  describe('getTotal', () => {
    it('should return correct total', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2); // 2000
        result.current.addItem(mockProduct2, 1); // 2000
      });

      expect(result.current.getTotal()).toBe(4000);
    });
  });

  describe('getItemCount', () => {
    it('should return correct item count', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.getItemCount()).toBe(5);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty cart', () => {
      const { result } = renderHook(() => useSalesCart());

      expect(result.current.isEmpty()).toBe(true);
    });

    it('should return false for non-empty cart', () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      expect(result.current.isEmpty()).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should save cart to storage when cart changes', async () => {
      const { result } = renderHook(() => useSalesCart());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      // Wait for async storage to be called
      await new Promise(resolve => setTimeout(resolve, 0));

      const savedCart = await AsyncStorage.getItem('@sales_cart');
      const parsedCart = JSON.parse(savedCart!);

      expect(parsedCart.items).toHaveLength(1);
      expect(parsedCart.total).toBe(2000);
      expect(parsedCart.itemCount).toBe(2);
    });
  });
}); 