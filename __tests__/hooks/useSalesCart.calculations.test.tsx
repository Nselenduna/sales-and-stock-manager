import { renderHook, act } from '@testing-library/react-hooks';
import { useSalesCart } from '../../hooks/useSalesCart';
import { Product } from '../../lib/supabase';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
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
  ...overrides,
});

describe('useSalesCart - Calculation Edge Cases', () => {
  it('should handle zero price products correctly', () => {
    const { result } = renderHook(() => useSalesCart());
    const freeProduct = createMockProduct({ unit_price: 0 });

    act(() => {
      result.current.addItem(freeProduct, 5);
    });

    expect(result.current.cart.items[0].total_price).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should handle very high price products correctly', () => {
    const { result } = renderHook(() => useSalesCart());
    const expensiveProduct = createMockProduct({ unit_price: 99999999 }); // 999,999.99

    act(() => {
      result.current.addItem(expensiveProduct, 1);
    });

    expect(result.current.cart.items[0].total_price).toBe(99999999);
    expect(result.current.cart.total).toBe(99999999);
  });

  it('should handle very large quantities correctly', () => {
    const { result } = renderHook(() => useSalesCart());
    const product = createMockProduct({ unit_price: 100 }); // 1.00

    act(() => {
      result.current.addItem(product, 1000);
    });

    expect(result.current.cart.items[0].total_price).toBe(100000); // 1000.00
    expect(result.current.cart.total).toBe(100000);
    expect(result.current.cart.itemCount).toBe(1000);
  });

  it('should maintain precision with multiple decimal operations', () => {
    const { result } = renderHook(() => useSalesCart());
    const product1 = createMockProduct({ id: '1', unit_price: 333 }); // 3.33
    const product2 = createMockProduct({ id: '2', unit_price: 334 }); // 3.34
    const product3 = createMockProduct({ id: '3', unit_price: 333 }); // 3.33

    act(() => {
      result.current.addItem(product1, 3);
      result.current.addItem(product2, 3);
      result.current.addItem(product3, 3);
    });

    // 3.33 * 3 + 3.34 * 3 + 3.33 * 3 = 9.99 + 10.02 + 9.99 = 30.00
    expect(result.current.cart.total).toBe(3000);
  });

  it('should handle updating quantities to zero', () => {
    const { result } = renderHook(() => useSalesCart());
    const product = createMockProduct();

    act(() => {
      result.current.addItem(product, 5);
    });

    expect(result.current.cart.items.length).toBe(1);

    act(() => {
      result.current.updateQuantity(product.id, 0);
    });

    expect(result.current.cart.items.length).toBe(0);
    expect(result.current.cart.total).toBe(0);
    expect(result.current.cart.itemCount).toBe(0);
  });

  it('should handle updating quantities to negative values', () => {
    const { result } = renderHook(() => useSalesCart());
    const product = createMockProduct();

    act(() => {
      result.current.addItem(product, 5);
    });

    expect(result.current.cart.items.length).toBe(1);

    act(() => {
      result.current.updateQuantity(product.id, -1);
    });

    // Should remove the item when quantity is negative
    expect(result.current.cart.items.length).toBe(0);
  });

  it('should handle products with undefined unit_price', () => {
    const { result } = renderHook(() => useSalesCart());
    const productWithoutPrice = createMockProduct({ unit_price: undefined as any });

    act(() => {
      result.current.addItem(productWithoutPrice, 1);
    });

    expect(result.current.cart.items[0].unit_price).toBe(0);
    expect(result.current.cart.items[0].total_price).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should handle products with null unit_price', () => {
    const { result } = renderHook(() => useSalesCart());
    const productWithNullPrice = createMockProduct({ unit_price: null as any });

    act(() => {
      result.current.addItem(productWithNullPrice, 1);
    });

    expect(result.current.cart.items[0].unit_price).toBe(0);
    expect(result.current.cart.items[0].total_price).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should correctly calculate totals with mixed operations', () => {
    const { result } = renderHook(() => useSalesCart());
    const product1 = createMockProduct({ id: '1', unit_price: 1500 }); // 15.00
    const product2 = createMockProduct({ id: '2', unit_price: 2500 }); // 25.00

    // Add products
    act(() => {
      result.current.addItem(product1, 2); // 30.00
      result.current.addItem(product2, 1); // 25.00
    });

    expect(result.current.cart.total).toBe(5500); // 55.00

    // Update quantity
    act(() => {
      result.current.updateQuantity(product1.id, 3); // 45.00
    });

    expect(result.current.cart.total).toBe(7000); // 70.00

    // Add more of existing product
    act(() => {
      result.current.addItem(product2, 1); // Should increase to 2 total
    });

    expect(result.current.cart.total).toBe(9500); // 95.00 (45.00 + 50.00)

    // Remove one product completely
    act(() => {
      result.current.removeItem(product1.id);
    });

    expect(result.current.cart.total).toBe(5000); // 50.00
  });

  it('should handle fractional quantities correctly', () => {
    const { result } = renderHook(() => useSalesCart());
    const product = createMockProduct({ unit_price: 333 }); // 3.33

    act(() => {
      result.current.addItem(product, 1.5 as any); // Test with fractional quantity
    });

    // safeParseInt should floor fractional quantities to integer (1.5 -> 1)
    expect(result.current.cart.items[0].quantity).toBe(1);
    expect(result.current.cart.items[0].total_price).toBe(333);
  });

  it('should maintain cart integrity after clearing', () => {
    const { result } = renderHook(() => useSalesCart());
    const product1 = createMockProduct({ id: '1' });
    const product2 = createMockProduct({ id: '2' });

    act(() => {
      result.current.addItem(product1, 2);
      result.current.addItem(product2, 3);
    });

    expect(result.current.cart.items.length).toBe(2);
    expect(result.current.cart.total).toBeGreaterThan(0);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart.items.length).toBe(0);
    expect(result.current.cart.total).toBe(0);
    expect(result.current.cart.itemCount).toBe(0);
    expect(result.current.isEmpty()).toBe(true);
  });

  it('should handle concurrent operations correctly', () => {
    const { result } = renderHook(() => useSalesCart());
    const product1 = createMockProduct({ id: '1', unit_price: 1000 });
    const product2 = createMockProduct({ id: '2', unit_price: 2000 });

    // Simulate concurrent operations
    act(() => {
      result.current.addItem(product1, 1);
      result.current.addItem(product2, 1);
      result.current.updateQuantity(product1.id, 2);
      result.current.addItem(product1, 1); // Should make it 3 total
    });

    expect(result.current.getItemQuantity(product1.id)).toBe(3);
    expect(result.current.getItemQuantity(product2.id)).toBe(1);
    expect(result.current.cart.total).toBe(5000); // 30.00 + 20.00
  });

  it('should handle cart state consistency', () => {
    const { result } = renderHook(() => useSalesCart());
    const product = createMockProduct({ unit_price: 1500 });

    act(() => {
      result.current.addItem(product, 3);
    });

    const item = result.current.cart.items[0];
    
    // Verify all calculations are consistent
    expect(item.quantity).toBe(3);
    expect(item.unit_price).toBe(1500);
    expect(item.total_price).toBe(4500);
    expect(result.current.cart.total).toBe(4500);
    expect(result.current.cart.itemCount).toBe(3);
    expect(result.current.getTotal()).toBe(4500);
    expect(result.current.getItemCount()).toBe(3);
    expect(result.current.getItemQuantity(product.id)).toBe(3);
  });
});