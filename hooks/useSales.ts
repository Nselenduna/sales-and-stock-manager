import { useState, useEffect, useCallback } from 'react';
import { supabase, CartItem, SalesTransaction, SalesTransactionItem } from '../lib/supabase';
import { SyncQueueManager } from '../lib/SyncQueueManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Simple UUID generator that doesn't rely on crypto
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import NetInfo from '@react-native-community/netinfo';

interface UseSalesReturn {
  cart: CartItem[];
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  checkout: () => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  isProcessing: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  retrySync: () => Promise<void>;
}

const CART_STORAGE_KEY = 'sales_cart';
const TRANSACTIONS_STORAGE_KEY = 'sales_transactions';

export const useSales = (): UseSalesReturn => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const syncQueue = SyncQueueManager.getInstance();

  // Load cart from storage on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        setCart(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const saveCart = async (newCart: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      // Fetch product details from Supabase or local storage
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new Error('Product not found');
      }

      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.product.id === productId);
        let newCart: CartItem[];

        if (existingItem) {
          // Update existing item quantity
          newCart = prevCart.map(item =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total_price: (item.quantity + quantity) * item.unit_price
                }
              : item
          );
        } else {
          // Add new item
          const unitPrice = product.unit_price || 0;
          const newItem: CartItem = {
            product,
            quantity,
            unit_price: unitPrice,
            total_price: quantity * unitPrice
          };
          newCart = [...prevCart, newItem];
        }

        saveCart(newCart);
        return newCart;
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    if (!productId) return;
    
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.product.id !== productId);
      saveCart(newCart);
      return newCart;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!productId) return;
    
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      const newCart = prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.unit_price
            }
          : item
      );
      saveCart(newCart);
      return newCart;
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    saveCart([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.total_price, 0);
  }, [cart]);

  const checkout = useCallback(async () => {
    if (cart.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    setIsProcessing(true);
    try {
      const transactionId = generateUUID();
      const transaction: SalesTransaction = {
        id: transactionId,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product.name
        })),
        total: getCartTotal(),
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

      if (isOnline) {
        // Try to sync immediately
        try {
          const { error } = await supabase
            .from('sales')
            .insert([{
              id: transaction.id,
              items: transaction.items,
              total: transaction.total,
              status: 'synced',
              created_at: transaction.created_at
            }]);

          if (error) throw error;

          // Update inventory quantities
          for (const item of cart) {
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                quantity: item.product.quantity - item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product.id);

            if (updateError) {
              console.error('Failed to update inventory:', updateError);
            }
          }

          transaction.status = 'synced';
        } catch (error) {
          console.error('Failed to sync transaction:', error);
          transaction.status = 'queued';
        }
      }

      // Add to sync queue for offline handling
      await syncQueue.addToQueue({
        operation: 'create',
        entity: 'sales',
        data: transaction
      });

      // Store transaction locally
      const existingTransactions = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : [];
      transactions.push(transaction);
      await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));

      // Clear cart
      clearCart();

      return { success: true, transactionId };
    } catch (error) {
      console.error('Checkout failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Checkout failed' };
    } finally {
      setIsProcessing(false);
    }
  }, [cart, getCartTotal, clearCart, syncQueue]);

  const retrySync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await syncQueue.processQueue();
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync retry failed:', error);
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
    retrySync
  };
}; 