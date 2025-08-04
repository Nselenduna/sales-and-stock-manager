import { stockMonitoringService } from '../../lib/stockMonitoring';
import { supabase } from '../../lib/supabase';
import { notificationService } from '../../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/notifications');
jest.mock('@react-native-async-storage/async-storage');

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock products data
const mockProducts = [
  {
    id: '1',
    name: 'Product 1',
    sku: 'SKU001',
    quantity: 0,
    low_stock_threshold: 5,
  },
  {
    id: '2',
    name: 'Product 2',
    sku: 'SKU002',
    quantity: 3,
    low_stock_threshold: 5,
  },
  {
    id: '3',
    name: 'Product 3',
    sku: 'SKU003',
    quantity: 10,
    low_stock_threshold: 5,
  },
];

describe('StockMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase response
    mockedSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      }),
    });

    // Mock notification service
    mockedNotificationService.sendStockAlert = jest.fn().mockResolvedValue(undefined);

    // Mock AsyncStorage
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
  });

  describe('checkStockLevels', () => {
    it('should identify and process all stock alerts correctly', async () => {
      // Setup mock for products query
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const stats = await stockMonitoringService.checkStockLevels();

      expect(stats.totalProducts).toBe(3);
      expect(stats.outOfStockProducts).toBe(1); // Product 1
      expect(stats.lowStockProducts).toBe(1);   // Product 2
      expect(stats.alertsSent).toBe(2);         // Both Product 1 and 2 should trigger alerts

      // Verify notification calls
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledWith(
        'Product 1',
        0,
        5,
        'out_of_stock'
      );
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledWith(
        'Product 2',
        3,
        5,
        'low_stock'
      );
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      await expect(stockMonitoringService.checkStockLevels()).rejects.toThrow();
    });

    it('should not send duplicate alerts within cooldown period', async () => {
      // First check - should send alerts
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [mockProducts[0]], // Only out of stock product
            error: null,
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      // First check
      await stockMonitoringService.checkStockLevels();
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledTimes(1);

      // Reset mock call count
      mockedNotificationService.sendStockAlert.mockClear();

      // Second check immediately (within cooldown) - should not send alert
      await stockMonitoringService.checkStockLevels();
      expect(mockedNotificationService.sendStockAlert).not.toHaveBeenCalled();
    });

    it('should handle empty product list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const stats = await stockMonitoringService.checkStockLevels();

      expect(stats.totalProducts).toBe(0);
      expect(stats.lowStockProducts).toBe(0);
      expect(stats.outOfStockProducts).toBe(0);
      expect(stats.alertsSent).toBe(0);
      expect(mockedNotificationService.sendStockAlert).not.toHaveBeenCalled();
    });
  });

  describe('checkSpecificProduct', () => {
    it('should check and alert for a specific low stock product', async () => {
      const lowStockProduct = mockProducts[1]; // Product 2 with low stock
      
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: lowStockProduct,
              error: null,
            }),
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await stockMonitoringService.checkSpecificProduct('2');

      expect(result.success).toBe(true);
      expect(result.alertSent).toBe(true);
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledWith(
        'Product 2',
        3,
        5,
        'low_stock'
      );
    });

    it('should check and alert for a specific out of stock product', async () => {
      const outOfStockProduct = mockProducts[0]; // Product 1 out of stock
      
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: outOfStockProduct,
              error: null,
            }),
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await stockMonitoringService.checkSpecificProduct('1');

      expect(result.success).toBe(true);
      expect(result.alertSent).toBe(true);
      expect(mockedNotificationService.sendStockAlert).toHaveBeenCalledWith(
        'Product 1',
        0,
        5,
        'out_of_stock'
      );
    });

    it('should not alert for products with normal stock levels', async () => {
      const normalStockProduct = mockProducts[2]; // Product 3 with normal stock
      
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: normalStockProduct,
              error: null,
            }),
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await stockMonitoringService.checkSpecificProduct('3');

      expect(result.success).toBe(true);
      expect(result.alertSent).toBe(false);
      expect(mockedNotificationService.sendStockAlert).not.toHaveBeenCalled();
    });

    it('should handle product not found error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Product not found' },
            }),
          }),
        }),
      };
      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await stockMonitoringService.checkSpecificProduct('999');

      expect(result.success).toBe(false);
      expect(result.alertSent).toBe(false);
      expect(result.error).toBe('Product not found');
    });
  });

  describe('clearAlertHistory', () => {
    it('should clear alert history from storage', async () => {
      await stockMonitoringService.clearAlertHistory();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('stock_alert_history');
    });
  });

  describe('getMonitoringStats', () => {
    it('should return current monitoring statistics', () => {
      const stats = stockMonitoringService.getMonitoringStats();

      expect(stats).toEqual(
        expect.objectContaining({
          totalProducts: expect.any(Number),
          lowStockProducts: expect.any(Number),
          outOfStockProducts: expect.any(Number),
          alertsSent: expect.any(Number),
        })
      );
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history as array', () => {
      const history = stockMonitoringService.getAlertHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });
});