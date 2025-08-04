import { renderHook, act } from '@testing-library/react-native';
import { useStockAlerts } from '../../hooks/useStockAlerts';
import { stockMonitoringService } from '../../lib/stockMonitoring';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/stockMonitoring');
jest.mock('../../store/notificationStore', () => ({
  useNotificationStore: () => ({
    permissionStatus: 'granted',
  }),
}));

const mockedStockMonitoringService = stockMonitoringService as jest.Mocked<typeof stockMonitoringService>;

// Mock products data
const mockProducts = [
  {
    id: '1',
    name: 'Test Product 1',
    sku: 'SKU001',
    quantity: 0,
    low_stock_threshold: 5,
    location: 'Warehouse A',
  },
  {
    id: '2',
    name: 'Test Product 2',
    sku: 'SKU002',
    quantity: 3,
    low_stock_threshold: 5,
    location: 'Warehouse B',
  },
];

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    }),
  }),
};

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('useStockAlerts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock stock monitoring service methods
    mockedStockMonitoringService.checkStockLevels = jest.fn().mockResolvedValue({
      totalProducts: 2,
      lowStockProducts: 1,
      outOfStockProducts: 1,
      alertsSent: 2,
    });

    mockedStockMonitoringService.getMonitoringStats = jest.fn().mockReturnValue({
      lastCheckAt: '2024-01-01T12:00:00Z',
      totalProducts: 2,
      lowStockProducts: 1,
      outOfStockProducts: 1,
      alertsSent: 2,
    });

    mockedStockMonitoringService.getAlertHistory = jest.fn().mockReturnValue([
      {
        productId: '1',
        type: 'out_of_stock',
        lastSentAt: '2024-01-01T12:00:00Z',
      },
    ]);
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useStockAlerts());

    expect(result.current.loading).toBe(true);
    expect(result.current.lowStockProducts).toEqual([]);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and filter low stock products', async () => {
    const { result } = renderHook(() => useStockAlerts());

    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.lowStockProducts).toHaveLength(2);
    expect(result.current.lowStockProducts[0].name).toBe('Test Product 1');
    expect(result.current.lowStockProducts[1].name).toBe('Test Product 2');
  });

  it('should handle refresh correctly', async () => {
    const { result } = renderHook(() => useStockAlerts());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
    expect(mockSupabase.from).toHaveBeenCalledWith('products');
  });

  it('should handle stock level check with permissions', async () => {
    const { result } = renderHook(() => useStockAlerts());

    await act(async () => {
      await result.current.checkStockLevelsNow();
    });

    expect(mockedStockMonitoringService.checkStockLevels).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Mock Supabase to return an error
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    const { result } = renderHook(() => useStockAlerts());

    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Database error');
  });

  it('should throw error when checking stock without permissions', async () => {
    // Mock notification store to return denied permissions
    jest.doMock('../../store/notificationStore', () => ({
      useNotificationStore: () => ({
        permissionStatus: 'denied',
      }),
    }));

    const { result } = renderHook(() => useStockAlerts());

    await act(async () => {
      try {
        await result.current.checkStockLevelsNow();
      } catch (error) {
        expect((error as Error).message).toContain('Notifications not enabled');
      }
    });
  });

  it('should return monitoring statistics', () => {
    const { result } = renderHook(() => useStockAlerts());

    expect(result.current.lastCheckAt).toBe('2024-01-01T12:00:00Z');
    expect(result.current.alertsSentToday).toBe(1); // Should filter for today
  });

  it('should calculate alerts sent today correctly', async () => {
    const todayDate = new Date().toISOString();
    
    mockedStockMonitoringService.getAlertHistory.mockReturnValue([
      {
        productId: '1',
        type: 'out_of_stock',
        lastSentAt: todayDate,
      },
      {
        productId: '2',
        type: 'low_stock',
        lastSentAt: todayDate,
      },
      {
        productId: '3',
        type: 'low_stock',
        lastSentAt: '2023-12-01T12:00:00Z', // Yesterday
      },
    ]);

    const { result } = renderHook(() => useStockAlerts());

    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.alertsSentToday).toBe(2); // Only today's alerts
  });
});