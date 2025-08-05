import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../lib/supabase';
import { safeParseNumber, safeParseInt, calculateItemTotal, validateCartTotals } from '../lib/numberUtils';

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const CART_STORAGE_KEY = '@sales_cart';

export const useSalesCart = () => {
  const [cart, setCart] = useState<CartState>({
    items: [],
    total: 0,
    itemCount: 0,
  });

  // Load cart from storage on mount
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    saveCartToStorage();
  }, [cart]);

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        setCart(parsedCart);
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    }
  };

  const saveCartToStorage = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  };

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    const safeQuantity = safeParseInt(quantity);
    const safeUnitPrice = safeParseNumber(product.unit_price || 0);
    
    if (safeQuantity <= 0) {
      console.warn('Invalid quantity for addItem:', quantity);
      return;
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(
        item => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevCart.items];
        const existingItem = updatedItems[existingItemIndex];
        const newQuantity = existingItem.quantity + safeQuantity;
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          total_price: calculateItemTotal(existingItem.unit_price, newQuantity),
        };

        const newTotal = updatedItems.reduce((sum, item) => sum + safeParseNumber(item.total_price), 0);
        const newItemCount = updatedItems.reduce((sum, item) => sum + safeParseInt(item.quantity), 0);

        const result = {
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount,
        };

        // Validate totals for consistency
        const validation = validateCartTotals(updatedItems, newTotal);
        if (!validation.isValid) {
          console.warn('Cart total mismatch detected:', validation);
        }

        return result;
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity: safeQuantity,
          unit_price: safeUnitPrice,
          total_price: calculateItemTotal(safeUnitPrice, safeQuantity),
        };

        const updatedItems = [...prevCart.items, newItem];
        const newTotal = updatedItems.reduce((sum, item) => sum + safeParseNumber(item.total_price), 0);
        const newItemCount = updatedItems.reduce((sum, item) => sum + safeParseInt(item.quantity), 0);

        return {
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount,
        };
      }
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prevCart => {
      const updatedItems = prevCart.items.filter(
        item => item.product.id !== productId
      );
      
      const newTotal = updatedItems.reduce((sum, item) => sum + safeParseNumber(item.total_price), 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + safeParseInt(item.quantity), 0);
      
      return {
        items: updatedItems,
        total: newTotal,
        itemCount: newItemCount,
      };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    const safeQuantity = safeParseInt(quantity);

    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: safeQuantity,
            total_price: calculateItemTotal(item.unit_price, safeQuantity),
          };
        }
        return item;
      });

      const newTotal = updatedItems.reduce((sum, item) => sum + safeParseNumber(item.total_price), 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + safeParseInt(item.quantity), 0);

      return {
        items: updatedItems,
        total: newTotal,
        itemCount: newItemCount,
      };
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      total: 0,
      itemCount: 0,
    });
  }, []);

  const getItemQuantity = useCallback((productId: string) => {
    const item = cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }, [cart.items]);

  const getTotal = useCallback(() => {
    return cart.total;
  }, [cart.total]);

  const getItemCount = useCallback(() => {
    return cart.itemCount;
  }, [cart.itemCount]);

  const isEmpty = useCallback(() => {
    return cart.items.length === 0;
  }, [cart.items.length]);

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    getTotal,
    getItemCount,
    isEmpty,
  };
}; 