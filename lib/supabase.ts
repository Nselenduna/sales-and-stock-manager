import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  user_id: string;
  role_type: 'admin' | 'staff' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends User {
  role: Role;
}

// Inventory types
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  low_stock_threshold: number;
  location?: string;
  unit_price?: number;
  description?: string;
  category?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity_sold: number;
  sale_price: number;
  sold_by: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface SaleWithProduct extends Sale {
  product: Product;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  location?: string;
}

export interface SalesSummary {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
}
