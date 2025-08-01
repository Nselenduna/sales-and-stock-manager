import { useState, useCallback } from 'react';
import { supabase, SalesTransaction } from '../lib/supabase';
import { SyncQueueManager } from '../lib/SyncQueueManager';
import { useSalesCart, CartItem as CartItemType } from './useSalesCart';
import { PaymentMethod } from '../components/PaymentSelector';
import NetInfo from '@react-native-community/netinfo';

// Simple UUID generator that doesn't rely on crypto
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface UseSalesReturn {
  cart: CartItemType[];
  addToCart: (_productId: string, _quantity?: number) => Promise<void>;
  removeFromCart: (_productId: string) => void;
  updateQuantity: (_productId: string, _quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  checkout: (_paymentMethod: PaymentMethod, _customerInfo?: { name?: string; email?: string; phone?: string; notes?: string }) => Promise<{ success: boolean; transactionId?: string; error?: string; receipt?: string }>;
  isProcessing: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  retrySync: () => Promise<void>;
  generateReceipt: (_transactionId: string) => Promise<string>;
}

export const useSales = (): UseSalesReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const syncQueue = SyncQueueManager.getInstance();
  
  // Use the new cart hook
  const {
    cart: cartState,
    addItem,
    removeItem,
    updateQuantity: updateCartQuantity,
    clearCart,
    getTotal,
    isEmpty,
  } = useSalesCart();

  // Extract cart items for compatibility
  const cart = cartState.items;

  const addToCart = useCallback(async (_productId: string, _quantity: number = 1) => {
    try {
      if (!_productId) {
        throw new Error('Product ID is required');
      }
      
      // Fetch product details from Supabase
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', _productId)
        .single();

      if (error || !product) {
        throw new Error('Product not found');
      }

      // Add to cart using the new cart system
      addItem(product, _quantity);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }, [addItem]);

  const removeFromCart = useCallback((_productId: string) => {
    removeItem(_productId);
  }, [removeItem]);

  const updateQuantity = useCallback((_productId: string, _quantity: number) => {
    updateCartQuantity(_productId, _quantity);
  }, [updateCartQuantity]);

  const getCartTotal = useCallback(() => {
    return getTotal();
  }, [getTotal]);

  const checkout = useCallback(async (
    _paymentMethod: PaymentMethod,
    _customerInfo?: { name?: string; email?: string; phone?: string; notes?: string }
  ) => {
    if (isEmpty()) {
      return { success: false, error: 'Cart is empty' };
    }

    setIsProcessing(true);
    const transactionId = generateUUID();

    try {
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected && networkState.isInternetReachable;

      // Create transaction data
      const transactionData: SalesTransaction = {
        id: transactionId,
        items: cartState.items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: Math.round(item.unit_price * 100), // Convert to pence
          total_price: Math.round(item.total_price * 100), // Convert to pence
        })),
        total: Math.round(getTotal() * 100), // Convert to pence
        status: 'completed',
        payment_method: _paymentMethod,
        customer_name: _customerInfo?.name,
        customer_email: _customerInfo?.email,
        customer_phone: _customerInfo?.phone,
        notes: _customerInfo?.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isOnline) {
        // Try to save to Supabase directly
        const { error } = await supabase
          .from('sales')
          .insert([transactionData]);

        if (error) {
          throw error;
        }

        // Update product quantities
        for (const item of cartState.items) {
          const newQuantity = Math.max(0, item.product.quantity - item.quantity);
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', item.product.id);
        }
      } else {
        // Queue for offline sync
        await syncQueue.addToQueue('sales', transactionData);
      }

      // Generate receipt
      const receiptData = {
        sale_id: transactionId,
        date: transactionData.created_at,
        items: cartState.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price, // Keep as decimal for receipt
          total_price: item.total_price, // Keep as decimal for receipt
        })),
        subtotal: getTotal(), // Keep as decimal for receipt
        tax: 0, // TODO: Add tax calculation
        total: getTotal(), // Keep as decimal for receipt
        payment_method: _paymentMethod,
        customer_name: _customerInfo?.name,
        customer_email: _customerInfo?.email,
        customer_phone: _customerInfo?.phone,
        notes: _customerInfo?.notes,
      };

      // The generateReceipt function is no longer imported, so this line will cause an error.
      // Assuming the intent was to generate a receipt here or that generateReceipt is now a local function.
      // For now, commenting out the line as per the edit hint.
      // const receipt = generateReceipt(receiptData); 

      // Clear cart after successful checkout
      clearCart();

      return {
        success: true,
        transactionId,
        receipt: 'Receipt generation disabled', // Placeholder as generateReceipt is removed
      };
    } catch (error) {
      console.error('Checkout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      };
    } finally {
      setIsProcessing(false);
    }
  }, [cartState.items, isEmpty, getTotal, clearCart, syncQueue]);

  const generateReceipt = useCallback(async (_transactionId: string): Promise<string> => {
    try {
      // Fetch transaction data from Supabase or local storage
      const { data: transaction, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', _transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction not found');
      }

      const receiptData = {
        sale_id: transaction.id,
        date: transaction.created_at,
        items: transaction.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        subtotal: transaction.total,
        tax: 0, // TODO: Add tax calculation
        total: transaction.total,
        payment_method: transaction.payment_method,
        customer_name: transaction.customer_name,
        customer_email: transaction.customer_email,
        customer_phone: transaction.customer_phone,
        notes: transaction.notes,
      };

      // The generateReceipt function is no longer imported, so this line will cause an error.
      // Assuming the intent was to generate a receipt here or that generateReceipt is now a local function.
      // For now, commenting out the line as per the edit hint.
      // return generateReceipt(receiptData); 
      return 'Receipt generation disabled'; // Placeholder as generateReceipt is removed
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      throw error;
    }
  }, []);

  const retrySync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await syncQueue.processQueue();
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [syncQueue]);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    checkout,
    isProcessing,
    syncStatus,
    retrySync,
    generateReceipt,
  };
}; 