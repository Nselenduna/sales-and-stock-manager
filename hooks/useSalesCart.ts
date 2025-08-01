import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../lib/supabase';

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
    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(
        item => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevCart.items];
        const existingItem = updatedItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          total_price: newQuantity * existingItem.unit_price,
        };

        return {
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
          itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity,
          unit_price: product.unit_price || 0,
          total_price: (product.unit_price || 0) * quantity,
        };

        const updatedItems = [...prevCart.items, newItem];
        return {
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
          itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prevCart => {
      const updatedItems = prevCart.items.filter(
        item => item.product.id !== productId
      );
      
      return {
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
            total_price: item.unit_price * quantity,
          };
        }
        return item;
      });

      return {
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
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