import { supabase } from '../supabase';
import type { SalesTransaction, SalesStats } from '../types/sales';

export class SalesService {
  async createTransaction(transaction: Omit<SalesTransaction, 'id'>): Promise<SalesTransaction> {
    const { data, error } = await supabase
      .from('sales_transactions')
      .insert([transaction])
      .single();

    if (error) throw error;
    return data;
  }

  async getTransactionById(id: string): Promise<SalesTransaction | null> {
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateInventory(items: SalesItem[]): Promise<void> {
    const { error } = await supabase.rpc('update_inventory_after_sale', {
      items: items
    });

    if (error) throw error;
  }

  async getDailyStats(): Promise<SalesStats> {
    const { data, error } = await supabase
      .rpc('get_daily_sales_stats');

    if (error) throw error;
    return data;
  }
}