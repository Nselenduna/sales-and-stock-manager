import {
  SalesTransaction,
  SalesItem,
  SalesStats,
  CreateSalesTransactionRequest,
  SalesFilters,
  PaymentMethod,
  CustomerInfo,
  CheckoutResult,
} from '../types/sales';
import { supabase } from '../supabase';
import { SyncQueueManager } from '../SyncQueueManager';
import NetInfo from '@react-native-community/netinfo';

// Simple UUID generator that doesn't rely on crypto
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class SalesService {
  private syncQueue: SyncQueueManager;

  constructor() {
    this.syncQueue = SyncQueueManager.getInstance();
  }

  /**
   * Create a new sales transaction
   */
  async createTransaction(
    request: CreateSalesTransactionRequest
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Calculate total and validate items
      let total = 0;
      const processedItems: SalesItem[] = [];

      for (const item of request.items) {
        const totalPrice = item.unit_price * item.quantity;
        total += totalPrice;

        processedItems.push({
          ...item,
          total_price: totalPrice,
        });
      }

      // Create transaction object
      const transactionId = generateUUID();
      const transaction: SalesTransaction = {
        id: transactionId,
        items: processedItems,
        total,
        status: 'queued',
        customer_name: request.customer_name,
        customer_email: request.customer_email,
        customer_phone: request.customer_phone,
        payment_method: request.payment_method,
        notes: request.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Check if online
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Try to sync immediately
        const syncResult = await this.syncTransactionToServer(transaction);
        if (syncResult.success) {
          transaction.status = 'synced';
          // Update inventory immediately
          await this.updateInventoryForTransaction(transaction);
        }
      }

      // Queue for offline sync if needed
      if (transaction.status === 'queued') {
        await this.syncQueue.addToQueue({
          operation: 'create',
          entity: 'sales',
          data: transaction,
        });
      }

      return { success: true, transactionId };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process checkout with payment and customer info
   */
  async checkout(
    items: SalesItem[],
    paymentMethod: PaymentMethod,
    customerInfo?: CustomerInfo
  ): Promise<CheckoutResult> {
    try {
      if (!items || items.length === 0) {
        return { success: false, error: 'No items in cart' };
      }

      const request: CreateSalesTransactionRequest = {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name,
        })),
        payment_method: paymentMethod,
        customer_name: customerInfo?.name,
        customer_email: customerInfo?.email,
        customer_phone: customerInfo?.phone,
        notes: customerInfo?.notes,
      };

      const result = await this.createTransaction(request);

      if (result.success && result.transactionId) {
        // Generate receipt
        const receipt = await this.generateReceipt(result.transactionId);
        return {
          success: true,
          transactionId: result.transactionId,
          receipt,
        };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error during checkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      };
    }
  }

  /**
   * Get sales transactions with optional filtering
   */
  async getTransactions(filters?: SalesFilters): Promise<SalesTransaction[]> {
    try {
      let query = supabase.from('sales_transactions').select('*');

      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_name) {
        query = query.ilike('customer_name', `%${filters.customer_name}%`);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(
          filters.offset,
          (filters.offset || 0) + (filters.limit || 50) - 1
        );
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get a specific transaction by ID
   */
  async getTransactionById(id: string): Promise<SalesTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Calculate sales statistics for a given period
   */
  async calculateStats(
    startDate: string,
    endDate: string
  ): Promise<SalesStats> {
    try {
      // Get transactions for the period
      const transactions = await this.getTransactions({
        start_date: startDate,
        end_date: endDate,
        status: 'synced',
      });

      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalTransactions = transactions.length;
      const averageTransactionValue =
        totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Calculate top selling products
      const productSales = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();

      transactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const existing = productSales.get(item.product_id) || {
            name: item.product_name || '',
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.total_price;
          productSales.set(item.product_id, existing);
        });
      });

      const topSellingProducts = Array.from(productSales.entries())
        .map(([product_id, data]) => ({
          product_id,
          product_name: data.name,
          quantity_sold: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate daily sales
      const dailySalesMap = new Map<
        string,
        { sales: number; transactions: number }
      >();

      transactions.forEach(transaction => {
        const date = transaction.created_at.split('T')[0];
        const existing = dailySalesMap.get(date) || {
          sales: 0,
          transactions: 0,
        };
        existing.sales += transaction.total;
        existing.transactions += 1;
        dailySalesMap.set(date, existing);
      });

      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        total_sales: totalSales,
        total_transactions: totalTransactions,
        average_transaction_value: averageTransactionValue,
        period_start: startDate,
        period_end: endDate,
        top_selling_products: topSellingProducts,
        daily_sales: dailySales,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total_sales: 0,
        total_transactions: 0,
        average_transaction_value: 0,
        period_start: startDate,
        period_end: endDate,
        top_selling_products: [],
        daily_sales: [],
      };
    }
  }

  /**
   * Update inventory after a successful transaction
   */
  private async updateInventoryForTransaction(
    transaction: SalesTransaction
  ): Promise<void> {
    try {
      for (const item of transaction.items) {
        const { error } = await supabase.rpc('decrease_product_quantity', {
          product_id: item.product_id,
          quantity_to_subtract: item.quantity,
        });

        if (error) {
          console.error(
            'Error updating inventory for product:',
            item.product_id,
            error
          );
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }

  /**
   * Sync transaction to server
   */
  private async syncTransactionToServer(
    transaction: SalesTransaction
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('sales_transactions')
        .insert([transaction]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error syncing transaction to server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Generate a receipt for a transaction
   */
  async generateReceipt(transactionId: string): Promise<string> {
    try {
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction) {
        return 'Receipt not found';
      }

      const timestamp = new Date(transaction.created_at).toLocaleString();
      const total = (transaction.total / 100).toFixed(2);

      let receipt = `
SALES RECEIPT
===================
Transaction ID: ${transaction.id}
Date: ${timestamp}
${transaction.customer_name ? `Customer: ${transaction.customer_name}` : ''}
${transaction.payment_method ? `Payment: ${transaction.payment_method.toUpperCase()}` : ''}

ITEMS:
-------------------
`;

      transaction.items.forEach(item => {
        const unitPrice = (item.unit_price / 100).toFixed(2);
        const totalPrice = (item.total_price / 100).toFixed(2);
        receipt += `${item.product_name || item.product_id}\n`;
        receipt += `  ${item.quantity} x £${unitPrice} = £${totalPrice}\n`;
      });

      receipt += `
-------------------
TOTAL: £${total}
===================
Thank you for your purchase!
`;

      return receipt;
    } catch (error) {
      console.error('Error generating receipt:', error);
      return 'Error generating receipt';
    }
  }

  /**
   * Retry failed sync operations
   */
  async retrySync(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.syncQueue.processQueue();
      return { success: true };
    } catch (error) {
      console.error('Error retrying sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed',
      };
    }
  }
}

// Singleton instance
let salesServiceInstance: SalesService | null = null;

export const getSalesService = (): SalesService => {
  if (!salesServiceInstance) {
    salesServiceInstance = new SalesService();
  }
  return salesServiceInstance;
};
