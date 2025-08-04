import { Product } from '../supabase';

export interface SalesItem {
  product_id: string;
  quantity: number;
  unit_price: number; // in pence
  total_price: number; // in pence
  product_name?: string; // denormalized for offline display
  product?: Product; // optional full product details
}

export interface SalesTransaction {
  id: string;
  store_id?: string;
  items: SalesItem[];
  total: number; // in pence
  status: 'queued' | 'synced' | 'failed' | 'completed';
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesStats {
  total_sales: number; // in pence
  total_transactions: number;
  average_transaction_value: number; // in pence
  period_start: string;
  period_end: string;
  top_selling_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number; // in pence
  }>;
  daily_sales: Array<{
    date: string;
    sales: number; // in pence
    transactions: number;
  }>;
}

export interface CreateSalesTransactionRequest {
  items: Omit<SalesItem, 'total_price'>[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  notes?: string;
}

export interface SalesFilters {
  start_date?: string;
  end_date?: string;
  status?: SalesTransaction['status'];
  customer_name?: string;
  limit?: number;
  offset?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface CheckoutResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  receipt?: string;
}
