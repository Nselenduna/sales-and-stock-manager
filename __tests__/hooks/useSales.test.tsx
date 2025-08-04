import { renderHook, act } from '@testing-library/react-hooks';
import { useSales } from '../../hooks/useSales';
import { supabase } from '../../lib/supabase';
import { SyncQueueManager } from '../../lib/SyncQueueManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/SyncQueueManager');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../hooks/useSalesCart');

const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  unit_price: 1000, // £10.00
  quantity: 10,
  barcode: '1234567890',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCartState = {
  items: [
    {
      product: mockProduct,
      quantity: 2,
      unit_price: 10.00,
      total_price: 20.00,
    },
  ],
  total: 20.00,
  itemCount: 2,
};

const mockUseSalesCart = {
  cart: mockCartState,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  getTotal: jest.fn(() => 20.00),
  isEmpty: jest.fn(() => false),
};

// Mock the useSalesCart hook
jest.mock('../../hooks/useSalesCart', () => ({
  useSalesCart: () => mockUseSalesCart,
}));

const mockSyncQueue = {
  addToQueue: jest.fn(),
  processQueue: jest.fn(),
};

describe('useSales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProduct,
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // Mock SyncQueueManager
    (SyncQueueManager.getInstance as jest.Mock).mockReturnValue(mockSyncQueue);

    // Mock NetInfo
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useSales());

    expect(result.current.cart).toEqual(mockCartState.items);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.syncStatus).toBe('idle');
  });

  it('should add product to cart successfully', async () => {
    const { result } = renderHook(() => useSales());

    await act(async () => {
      await result.current.addToCart('product-1', 2);
    });

    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(mockUseSalesCart.addItem).toHaveBeenCalledWith(mockProduct, 2);
  });

  it('should handle add to cart error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Product not found'),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useSales());

    await expect(result.current.addToCart('invalid-id')).rejects.toThrow(
      'Product not found'
    );
  });

  it('should remove product from cart', () => {
    const { result } = renderHook(() => useSales());

    act(() => {
      result.current.removeFromCart('product-1');
    });

    expect(mockUseSalesCart.removeItem).toHaveBeenCalledWith('product-1');
  });

  it('should update product quantity in cart', () => {
    const { result } = renderHook(() => useSales());

    act(() => {
      result.current.updateQuantity('product-1', 5);
    });

    expect(mockUseSalesCart.updateQuantity).toHaveBeenCalledWith('product-1', 5);
  });

  it('should clear cart', () => {
    const { result } = renderHook(() => useSales());

    act(() => {
      result.current.clearCart();
    });

    expect(mockUseSalesCart.clearCart).toHaveBeenCalled();
  });

  it('should get cart total', () => {
    const { result } = renderHook(() => useSales());

    const total = result.current.getCartTotal();

    expect(total).toBe(20.00);
    expect(mockUseSalesCart.getTotal).toHaveBeenCalled();
  });

  it('should checkout successfully when online', async () => {
    const { result } = renderHook(() => useSales());

    let checkoutResult;
    await act(async () => {
      checkoutResult = await result.current.checkout('cash', {
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    expect(checkoutResult.success).toBe(true);
    expect(checkoutResult.transactionId).toBeDefined();
    expect(checkoutResult.receipt).toContain('SALES AND STOCKS MANAGER');
    expect(supabase.from).toHaveBeenCalledWith('sales');
    expect(mockUseSalesCart.clearCart).toHaveBeenCalled();
  });

  it('should queue transaction when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const { result } = renderHook(() => useSales());

    let checkoutResult;
    await act(async () => {
      checkoutResult = await result.current.checkout('card');
    });

    expect(checkoutResult.success).toBe(true);
    expect(mockSyncQueue.addToQueue).toHaveBeenCalledWith({
      operation: 'create',
      entity: 'sales',
      data: expect.objectContaining({
        payment_method: 'card',
        total: 2000, // 20.00 * 100 (converted to pence)
      }),
    });
  });

  it('should handle empty cart checkout', async () => {
    mockUseSalesCart.isEmpty.mockReturnValue(true);

    const { result } = renderHook(() => useSales());

    let checkoutResult;
    await act(async () => {
      checkoutResult = await result.current.checkout('cash');
    });

    expect(checkoutResult.success).toBe(false);
    expect(checkoutResult.error).toBe('Cart is empty');
  });

  it('should generate receipt for existing transaction', async () => {
    const mockTransaction = {
      id: 'txn-001',
      created_at: '2024-01-01T12:00:00Z',
      total: 2000,
      payment_method: 'cash',
      items: [
        {
          product_name: 'Test Product',
          quantity: 2,
          unit_price: 1000,
          total_price: 2000,
        },
      ],
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify([mockTransaction])
    );

    const { result } = renderHook(() => useSales());

    let receipt;
    await act(async () => {
      receipt = await result.current.generateReceipt('txn-001');
    });

    expect(receipt).toContain('SALES AND STOCKS MANAGER');
    expect(receipt).toContain('txn-001');
    expect(receipt).toContain('Test Product');
  });

  it('should fall back to Supabase when transaction not found locally', async () => {
    const mockTransaction = {
      id: 'txn-002',
      created_at: '2024-01-01T12:00:00Z',
      total: 1500,
      payment_method: 'card',
      items: [
        {
          product_name: 'Remote Product',
          quantity: 1,
          unit_price: 1500,
          total_price: 1500,
        },
      ],
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTransaction,
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useSales());

    let receipt;
    await act(async () => {
      receipt = await result.current.generateReceipt('txn-002');
    });

    expect(receipt).toContain('SALES AND STOCKS MANAGER');
    expect(receipt).toContain('txn-002');
    expect(receipt).toContain('Remote Product');
  });

  it('should handle generate receipt error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Transaction not found'),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useSales());

    await expect(result.current.generateReceipt('invalid-id')).rejects.toThrow(
      'Transaction not found'
    );
  });

  it('should retry sync successfully', async () => {
    const { result } = renderHook(() => useSales());

    await act(async () => {
      await result.current.retrySync();
    });

    expect(result.current.syncStatus).toBe('idle');
    expect(mockSyncQueue.processQueue).toHaveBeenCalled();
  });

  it('should handle sync retry error', async () => {
    mockSyncQueue.processQueue.mockRejectedValue(new Error('Sync failed'));

    const { result } = renderHook(() => useSales());

    await act(async () => {
      await result.current.retrySync();
    });

    expect(result.current.syncStatus).toBe('error');
  });

  it('should update product quantities after successful online checkout', async () => {
    const { result } = renderHook(() => useSales());

    await act(async () => {
      await result.current.checkout('cash');
    });

    expect(supabase.from).toHaveBeenCalledWith('products');
    // Should update product quantity (10 - 2 = 8)
    expect(supabase.from('products').update).toHaveBeenCalledWith({
      quantity: 8,
    });
  });

  it('should convert prices correctly between pounds and pence', async () => {
    const { result } = renderHook(() => useSales());

    await act(async () => {
      await result.current.checkout('cash');
    });

    // Check that the transaction total is stored in pence
    expect(supabase.from('sales').insert).toHaveBeenCalledWith([
      expect.objectContaining({
        total: 2000, // £20.00 converted to pence
        items: expect.arrayContaining([
          expect.objectContaining({
            unit_price: 1000, // £10.00 converted to pence
            total_price: 2000, // £20.00 converted to pence
          }),
        ]),
      }),
    ]);
  });
});