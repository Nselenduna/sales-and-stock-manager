import { useState, useEffect, useCallback } from 'react';
import { supabase, LowStockProduct } from '../lib/supabase';
import { stockMonitoringService } from '../lib/stockMonitoring';
import { useNotificationStore } from '../store/notificationStore';

interface UseStockAlertsReturn {
  lowStockProducts: LowStockProduct[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastCheckAt: string | null;
  alertsSentToday: number;
  fetchLowStockProducts: () => Promise<void>;
  onRefresh: () => Promise<void>;
  checkStockLevelsNow: () => Promise<void>;
}

export const useStockAlerts = (): UseStockAlertsReturn => {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const [alertsSentToday, setAlertsSentToday] = useState(0);

  const { permissionStatus } = useNotificationStore();

  const fetchLowStockProducts = useCallback(async () => {
    try {
      setError(null);

      // Fetch all products and filter for low stock
      const { data: allProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, name, sku, quantity, low_stock_threshold, location')
        .order('quantity', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Filter products where quantity <= low_stock_threshold
      const lowStock = allProducts?.filter(
        product => product.quantity <= product.low_stock_threshold
      ) || [];

      setLowStockProducts(lowStock);

      // Update monitoring stats
      const stats = stockMonitoringService.getMonitoringStats();
      setLastCheckAt(stats.lastCheckAt);
      
      // Calculate alerts sent today
      const today = new Date().toDateString();
      const alertHistory = stockMonitoringService.getAlertHistory();
      const todayAlerts = alertHistory.filter(alert => 
        new Date(alert.lastSentAt).toDateString() === today
      ).length;
      setAlertsSentToday(todayAlerts);

    } catch (err: unknown) {
      console.error('Error fetching low stock products:', err);
      setError((err as Error).message || 'Failed to load stock alerts');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLowStockProducts();
    setRefreshing(false);
  }, [fetchLowStockProducts]);

  const checkStockLevelsNow = useCallback(async () => {
    try {
      setError(null);
      
      if (permissionStatus !== 'granted') {
        throw new Error('Notifications not enabled. Enable notifications to receive stock alerts.');
      }

      // Run stock monitoring check
      await stockMonitoringService.checkStockLevels();
      
      // Refresh the data
      await fetchLowStockProducts();
    } catch (err: unknown) {
      console.error('Error checking stock levels:', err);
      setError((err as Error).message || 'Failed to check stock levels');
      throw err;
    }
  }, [permissionStatus, fetchLowStockProducts]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchLowStockProducts();
      setLoading(false);
    };

    loadData();
  }, [fetchLowStockProducts]);

  // Set up periodic stock monitoring (every 30 minutes when app is active)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (permissionStatus === 'granted') {
      interval = setInterval(async () => {
        try {
          // eslint-disable-next-line no-console
          console.log('Running periodic stock check...');
          await stockMonitoringService.checkStockLevels();
          await fetchLowStockProducts();
        } catch (error) {
          console.error('Error in periodic stock check:', error);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [permissionStatus, fetchLowStockProducts]);

  return {
    lowStockProducts,
    loading,
    refreshing,
    error,
    lastCheckAt,
    alertsSentToday,
    fetchLowStockProducts,
    onRefresh,
    checkStockLevelsNow,
  };
};