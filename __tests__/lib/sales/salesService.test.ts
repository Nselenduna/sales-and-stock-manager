import { SalesService, getSalesService } from '../../../lib/sales/salesService';
import { 
  SalesTransaction, 
  SalesItem, 
  CreateSalesTransactionRequest,
  PaymentMethod,
  CustomerInfo 
} from '../../../lib/types/sales';

// Mock dependencies
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            eq: jest.fn(() => ({
              ilike: jest.fn(() => ({
                limit: jest.fn(() => ({
                  range: jest.fn(() => ({
                    order: jest.fn(() => ({
                      order: jest.fn()
                    }))
                  }))
                }))
              }))
            }))
          }))
        })),
        or: jest.fn(() => ({
          limit: jest.fn()
        })),
        order: jest.fn(),
        limit: jest.fn(),
        range: jest.fn()
      })),
      insert: jest.fn(),
      upsert: jest.fn()
    })),
    rpc: jest.fn()
  }
}));

jest.mock('../../../lib/SyncQueueManager', () => {
  const mockInstance = {
    addToQueue: jest.fn(),
    processQueue: jest.fn()
  };
  
  return {
    SyncQueueManager: {
      getInstance: jest.fn(() => mockInstance)
    }
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true }))
}));

const mockSalesItem: SalesItem = {
  product_id: 'product-1',
  quantity: 2,
  unit_price: 1500,
  total_price: 3000,
  product_name: 'Test Product'
};

describe('SalesService', () => {
  let salesService: SalesService;
  let mockSupabase: any;
  let mockSyncQueue: any;
  let mockNetInfo: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get fresh instances
    mockSupabase = require('../../../lib/supabase').supabase;
    mockNetInfo = require('@react-native-community/netinfo');
    
    // Get the shared mock instance 
    const { SyncQueueManager } = require('../../../lib/SyncQueueManager');
    mockSyncQueue = SyncQueueManager.getInstance();
    
    // Create new service after mocks are set up
    salesService = new SalesService();

    // Setup chainable mock query builder
    const createMockQueryBuilder = () => {
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      };

      // Make order return a promise for getTransactions
      mockBuilder.order.mockResolvedValue({ data: [], error: null });
      
      return mockBuilder;
    };

    // Setup default mock implementations
    mockSupabase.from.mockImplementation(() => createMockQueryBuilder());
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSyncQueue.addToQueue.mockResolvedValue(undefined);
    mockSyncQueue.processQueue.mockResolvedValue(undefined);
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true });
  });

  describe('createTransaction', () => {
    it('should create a transaction successfully when online', async () => {
      const request: CreateSalesTransactionRequest = {
        items: [
          {
            product_id: 'product-1',
            quantity: 2,
            unit_price: 1500,
            product_name: 'Test Product'
          }
        ],
        payment_method: 'cash',
        customer_name: 'John Doe'
      };

      const result = await salesService.createTransaction(request);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('sales_transactions');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrease_product_quantity', {
        product_id: 'product-1',
        quantity_to_subtract: 2
      });
    });

    it('should queue transaction when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false });

      const request: CreateSalesTransactionRequest = {
        items: [mockSalesItem],
        payment_method: 'cash'
      };

      const result = await salesService.createTransaction(request);

      expect(result.success).toBe(true);
      expect(mockSyncQueue.addToQueue).toHaveBeenCalled();
    });

    it('should calculate total price correctly', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const request: CreateSalesTransactionRequest = {
        items: [
          {
            product_id: 'product-1',
            quantity: 3,
            unit_price: 1000,
            product_name: 'Product 1'
          },
          {
            product_id: 'product-2', 
            quantity: 2,
            unit_price: 1500,
            product_name: 'Product 2'
          }
        ]
      };

      const result = await salesService.createTransaction(request);

      expect(result.success).toBe(true);
      // Verify the transaction was created with correct total (3*1000 + 2*1500 = 6000)
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0][0];
      expect(insertCall.total).toBe(6000);
      expect(insertCall.items).toHaveLength(2);
      expect(insertCall.items[0].total_price).toBe(3000);
      expect(insertCall.items[1].total_price).toBe(3000);
    });

    it('should handle sync errors gracefully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ 
          error: new Error('Database error') 
        })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const request: CreateSalesTransactionRequest = {
        items: [mockSalesItem]
      };

      const result = await salesService.createTransaction(request);

      expect(result.success).toBe(true); // Should still succeed and queue for retry
      expect(mockSyncQueue.addToQueue).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const request: CreateSalesTransactionRequest = {
        items: [] // Empty items should be handled gracefully
      };

      const result = await salesService.createTransaction(request);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('checkout', () => {
    it('should process checkout successfully', async () => {
      const items: SalesItem[] = [mockSalesItem];
      const paymentMethod: PaymentMethod = 'card';
      const customerInfo: CustomerInfo = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      };

      // Mock successful transaction creation
      const mockTransactionId = 'transaction-123';
      jest.spyOn(salesService, 'createTransaction').mockResolvedValue({
        success: true,
        transactionId: mockTransactionId
      });

      // Mock receipt generation
      jest.spyOn(salesService, 'generateReceipt').mockResolvedValue('Mock receipt');

      const result = await salesService.checkout(items, paymentMethod, customerInfo);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(mockTransactionId);
      expect(result.receipt).toBe('Mock receipt');
    });

    it('should fail checkout with empty cart', async () => {
      const result = await salesService.checkout([], 'cash');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No items in cart');
    });

    it('should handle transaction creation failure', async () => {
      jest.spyOn(salesService, 'createTransaction').mockResolvedValue({
        success: false,
        error: 'Transaction failed'
      });

      const result = await salesService.checkout([mockSalesItem], 'cash');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions without filters', async () => {
      const mockTransactions = [
        {
          id: '1',
          items: [],
          total: 1000,
          status: 'synced',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await salesService.getTransactions();

      expect(result).toEqual(mockTransactions);
      expect(mockSupabase.from).toHaveBeenCalledWith('sales_transactions');
    });

    it('should apply filters correctly', async () => {
      const filters = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'synced' as const,
        customer_name: 'John',
        limit: 10,
        offset: 20
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await salesService.getTransactions(filters);

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-01-31');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'synced');
      expect(mockQuery.ilike).toHaveBeenCalledWith('customer_name', '%John%');
      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });

    it('should handle database errors', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await salesService.getTransactions();

      expect(result).toEqual([]);
    });
  });

  describe('getTransactionById', () => {
    it('should fetch transaction by ID', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        items: [],
        total: 1000,
        status: 'synced'
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTransaction,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await salesService.getTransactionById('transaction-1');

      expect(result).toEqual(mockTransaction);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'transaction-1');
    });

    it('should return null if transaction not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found')
        })
      };
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await salesService.getTransactionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('calculateStats', () => {
    it('should calculate sales statistics correctly', async () => {
      const mockTransactions: SalesTransaction[] = [
        {
          id: '1',
          total: 2000,
          items: [
            { product_id: 'p1', product_name: 'Product 1', quantity: 2, unit_price: 1000, total_price: 2000 }
          ],
          status: 'synced',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '2',
          total: 1500,
          items: [
            { product_id: 'p1', product_name: 'Product 1', quantity: 1, unit_price: 1000, total_price: 1000 },
            { product_id: 'p2', product_name: 'Product 2', quantity: 1, unit_price: 500, total_price: 500 }
          ],
          status: 'synced',
          created_at: '2024-01-01T14:00:00Z',
          updated_at: '2024-01-01T14:00:00Z'
        }
      ];

      jest.spyOn(salesService, 'getTransactions').mockResolvedValue(mockTransactions);

      const stats = await salesService.calculateStats('2024-01-01', '2024-01-31');

      expect(stats.total_sales).toBe(3500);
      expect(stats.total_transactions).toBe(2);
      expect(stats.average_transaction_value).toBe(1750);
      expect(stats.top_selling_products).toHaveLength(2);
      expect(stats.top_selling_products[0]).toEqual({
        product_id: 'p1',
        product_name: 'Product 1',
        quantity_sold: 3,
        revenue: 3000
      });
      expect(stats.daily_sales).toHaveLength(1);
      expect(stats.daily_sales[0]).toEqual({
        date: '2024-01-01',
        sales: 3500,
        transactions: 2
      });
    });

    it('should handle empty transactions', async () => {
      jest.spyOn(salesService, 'getTransactions').mockResolvedValue([]);

      const stats = await salesService.calculateStats('2024-01-01', '2024-01-31');

      expect(stats.total_sales).toBe(0);
      expect(stats.total_transactions).toBe(0);
      expect(stats.average_transaction_value).toBe(0);
      expect(stats.top_selling_products).toEqual([]);
      expect(stats.daily_sales).toEqual([]);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for transaction', async () => {
      const mockTransaction: SalesTransaction = {
        id: 'transaction-1',
        items: [
          {
            product_id: 'p1',
            product_name: 'Test Product',
            quantity: 2,
            unit_price: 1000,
            total_price: 2000
          }
        ],
        total: 2000,
        status: 'synced',
        customer_name: 'John Doe',
        payment_method: 'cash',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      };

      jest.spyOn(salesService, 'getTransactionById').mockResolvedValue(mockTransaction);

      const receipt = await salesService.generateReceipt('transaction-1');

      expect(receipt).toContain('SALES RECEIPT');
      expect(receipt).toContain('Transaction ID: transaction-1');
      expect(receipt).toContain('Customer: John Doe');
      expect(receipt).toContain('Payment: CASH');
      expect(receipt).toContain('Test Product');
      expect(receipt).toContain('2 x £10.00 = £20.00');
      expect(receipt).toContain('TOTAL: £20.00');
    });

    it('should handle missing transaction', async () => {
      jest.spyOn(salesService, 'getTransactionById').mockResolvedValue(null);

      const receipt = await salesService.generateReceipt('non-existent');

      expect(receipt).toBe('Receipt not found');
    });
  });

  describe('retrySync', () => {
    it('should retry sync successfully', async () => {
      const result = await salesService.retrySync();

      expect(result.success).toBe(true);
      expect(mockSyncQueue.processQueue).toHaveBeenCalled();
    });

    it('should handle sync queue errors', async () => {
      mockSyncQueue.processQueue.mockRejectedValue(new Error('Sync failed'));

      const result = await salesService.retrySync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync failed');
    });
  });

  describe('getSalesService', () => {
    it('should return singleton instance', () => {
      const instance1 = getSalesService();
      const instance2 = getSalesService();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SalesService);
    });
  });

  describe('inventory updates', () => {
    it('should update inventory for each item in transaction', async () => {
      const request: CreateSalesTransactionRequest = {
        items: [
          {
            product_id: 'product-1',
            quantity: 3,
            unit_price: 1000,
            product_name: 'Product 1'
          },
          {
            product_id: 'product-2',
            quantity: 2,
            unit_price: 1500,
            product_name: 'Product 2'
          }
        ]
      };

      await salesService.createTransaction(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrease_product_quantity', {
        product_id: 'product-1',
        quantity_to_subtract: 3
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrease_product_quantity', {
        product_id: 'product-2',
        quantity_to_subtract: 2
      });
    });

    it('should handle inventory update errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: new Error('Inventory update failed') });

      const request: CreateSalesTransactionRequest = {
        items: [mockSalesItem]
      };

      // Should not throw error
      const result = await salesService.createTransaction(request);
      expect(result.success).toBe(true);
    });
  });
});