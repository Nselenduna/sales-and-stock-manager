import { supabase, Product } from './supabase';
import { notificationService } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StockMonitorAlert {
  productId: string;
  type: 'low_stock' | 'out_of_stock';
  lastSentAt: string;
}

interface MonitoringStats {
  lastCheckAt: string;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  alertsSent: number;
}

class StockMonitoringService {
  private static instance: StockMonitoringService;
  private lastAlerts: Map<string, StockMonitorAlert> = new Map();
  private monitoringStats: MonitoringStats = {
    lastCheckAt: '',
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    alertsSent: 0,
  };

  // Cooldown period to prevent spam (in milliseconds)
  private readonly ALERT_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours

  private constructor() {
    this.loadPreviousAlerts();
  }

  public static getInstance(): StockMonitoringService {
    if (!StockMonitoringService.instance) {
      StockMonitoringService.instance = new StockMonitoringService();
    }
    return StockMonitoringService.instance;
  }

  /**
   * Check all products for stock alerts and send notifications if needed
   */
  async checkStockLevels(): Promise<MonitoringStats> {
    try {
      // eslint-disable-next-line no-console
      console.log('Starting stock level check...');

      // Fetch all products from Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity, low_stock_threshold')
        .order('quantity', { ascending: true });

      if (error) {
        console.error('Error fetching products for stock monitoring:', error);
        throw error;
      }

      if (!products || products.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No products found for stock monitoring');
        return this.updateStats(0, 0, 0, 0);
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let alertsSent = 0;

      // Check each product for stock alerts
      for (const product of products) {
        const alertResult = await this.checkProductStock(product);
        
        if (alertResult.type === 'low_stock') {
          lowStockCount++;
          if (alertResult.alertSent) alertsSent++;
        } else if (alertResult.type === 'out_of_stock') {
          outOfStockCount++;
          if (alertResult.alertSent) alertsSent++;
        }
      }

      // eslint-disable-next-line no-console
      console.log(`Stock check completed: ${products.length} products, ${lowStockCount} low stock, ${outOfStockCount} out of stock, ${alertsSent} alerts sent`);

      return this.updateStats(products.length, lowStockCount, outOfStockCount, alertsSent);
    } catch (error) {
      console.error('Error during stock level check:', error);
      throw error;
    }
  }

  /**
   * Check a single product for stock alerts
   */
  private async checkProductStock(product: Product): Promise<{
    type: 'normal' | 'low_stock' | 'out_of_stock';
    alertSent: boolean;
  }> {
    const { id, name, quantity, low_stock_threshold } = product;
    
    // Determine stock status
    let stockType: 'normal' | 'low_stock' | 'out_of_stock' = 'normal';
    
    if (quantity === 0) {
      stockType = 'out_of_stock';
    } else if (quantity <= low_stock_threshold) {
      stockType = 'low_stock';
    }

    // If stock is normal, no alert needed
    if (stockType === 'normal') {
      return { type: stockType, alertSent: false };
    }

    // Check if we've already sent an alert for this product recently
    const alertKey = `${id}_${stockType}`;
    const lastAlert = this.lastAlerts.get(alertKey);
    
    if (lastAlert && this.isWithinCooldown(lastAlert.lastSentAt)) {
      // eslint-disable-next-line no-console
      console.log(`Alert for ${name} (${stockType}) skipped - within cooldown period`);
      return { type: stockType, alertSent: false };
    }

    // Send notification
    try {
      await notificationService.sendStockAlert(
        name,
        quantity,
        low_stock_threshold,
        stockType
      );

      // Record that we sent this alert
      this.lastAlerts.set(alertKey, {
        productId: id,
        type: stockType,
        lastSentAt: new Date().toISOString(),
      });

      await this.saveAlertHistory();

      // eslint-disable-next-line no-console
      console.log(`Alert sent for ${name}: ${stockType} (quantity: ${quantity}, threshold: ${low_stock_threshold})`);
      
      return { type: stockType, alertSent: true };
    } catch (error) {
      console.error(`Error sending alert for ${name}:`, error);
      return { type: stockType, alertSent: false };
    }
  }

  /**
   * Check if an alert is within the cooldown period
   */
  private isWithinCooldown(lastSentAt: string): boolean {
    const lastSentTime = new Date(lastSentAt).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - lastSentTime) < this.ALERT_COOLDOWN;
  }

  /**
   * Update monitoring statistics
   */
  private updateStats(
    totalProducts: number,
    lowStockProducts: number,
    outOfStockProducts: number,
    alertsSent: number
  ): MonitoringStats {
    this.monitoringStats = {
      lastCheckAt: new Date().toISOString(),
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      alertsSent,
    };
    
    this.saveMonitoringStats();
    return { ...this.monitoringStats };
  }

  /**
   * Get current monitoring statistics
   */
  getMonitoringStats(): MonitoringStats {
    return { ...this.monitoringStats };
  }

  /**
   * Force check a specific product (useful for testing or manual triggers)
   */
  async checkSpecificProduct(productId: string): Promise<{
    success: boolean;
    alertSent: boolean;
    error?: string;
  }> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return { success: false, alertSent: false, error: 'Product not found' };
      }

      const result = await this.checkProductStock(product);
      return {
        success: true,
        alertSent: result.alertSent,
      };
    } catch (error: unknown) {
      return {
        success: false,
        alertSent: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Clear alert history (useful for testing or reset)
   */
  async clearAlertHistory(): Promise<void> {
    this.lastAlerts.clear();
    await AsyncStorage.removeItem('stock_alert_history');
    // eslint-disable-next-line no-console
    console.log('Alert history cleared');
  }

  /**
   * Get alert history for debugging
   */
  getAlertHistory(): StockMonitorAlert[] {
    return Array.from(this.lastAlerts.values());
  }

  /**
   * Save alert history to local storage
   */
  private async saveAlertHistory(): Promise<void> {
    try {
      const historyArray = Array.from(this.lastAlerts.entries());
      await AsyncStorage.setItem('stock_alert_history', JSON.stringify(historyArray));
    } catch (error) {
      console.error('Error saving alert history:', error);
    }
  }

  /**
   * Load alert history from local storage
   */
  private async loadPreviousAlerts(): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem('stock_alert_history');
      if (historyData) {
        const historyArray = JSON.parse(historyData);
        this.lastAlerts = new Map(historyArray);
        // eslint-disable-next-line no-console
        console.log(`Loaded ${this.lastAlerts.size} previous alerts from storage`);
      }
    } catch (error) {
      console.error('Error loading alert history:', error);
    }
  }

  /**
   * Save monitoring statistics
   */
  private async saveMonitoringStats(): Promise<void> {
    try {
      await AsyncStorage.setItem('stock_monitoring_stats', JSON.stringify(this.monitoringStats));
    } catch (error) {
      console.error('Error saving monitoring stats:', error);
    }
  }

  /**
   * Load monitoring statistics
   */
  private async loadMonitoringStats(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem('stock_monitoring_stats');
      if (statsData) {
        this.monitoringStats = JSON.parse(statsData);
      }
    } catch (error) {
      console.error('Error loading monitoring stats:', error);
    }
  }
}

// Export singleton instance
export const stockMonitoringService = StockMonitoringService.getInstance();

// Export utility functions
export const checkStockLevels = () => stockMonitoringService.checkStockLevels();
export const checkSpecificProduct = (productId: string) => stockMonitoringService.checkSpecificProduct(productId);
export const getMonitoringStats = () => stockMonitoringService.getMonitoringStats();
export const clearAlertHistory = () => stockMonitoringService.clearAlertHistory();
export const getAlertHistory = () => stockMonitoringService.getAlertHistory();