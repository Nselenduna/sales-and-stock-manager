import { SyncQueueManager, SyncQueueItem } from '../../lib/SyncQueueManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'mock-id' }], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { updated_at: new Date().toISOString() }, error: null })),
        })),
      })),
    })),
  })),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn())
}));



// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset singleton instance
  // @ts-ignore - accessing private property for testing
  SyncQueueManager.instance = undefined;
});

describe('SyncQueueManager', () => {
  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = SyncQueueManager.getInstance();
      const instance2 = SyncQueueManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should load queue from AsyncStorage on initialization', async () => {
      const mockQueueData = JSON.stringify([
        {
          id: 'item-1',
          operation: 'create',
          entity: 'products',
          data: { name: 'Test Product' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending'
        }
      ]);
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(mockQueueData);
      
      const instance = SyncQueueManager.getInstance();
      await instance.loadQueue();
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('sync_queue');
      
      // @ts-ignore - accessing private property for testing
      expect(instance.queue.length).toBe(1);
      // @ts-ignore
      expect(instance.queue[0].id).toBe('item-1');
    });
  });
  
  describe('Queue Operations', () => {
    it('should add items to the queue', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Mock network connectivity to prevent automatic processing
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      const item = await instance.addToQueue({
        operation: 'create',
        entity: 'products',
        data: { name: 'New Product' }
      });
      
      expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(item.operation).toBe('create');
      expect(item.entity).toBe('products');
      expect(item.data.name).toBe('New Product');
      expect(item.status).toBe('pending');
      expect(item.retryCount).toBe(0);
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
    
    it('should process queue items', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Mock network connectivity
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Add a test item with network disconnected first
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
      await instance.addToQueue({
        operation: 'create',
        entity: 'products',
        data: { name: 'Test Product' }
      });
      
      // Mock successful processing
      const mockProcessItem = jest.fn().mockResolvedValue(undefined);
      // @ts-ignore - replacing private method for testing
      instance.processItem = mockProcessItem;
      
      // Register event handlers for testing
      const onSyncStart = jest.fn();
      const onSyncComplete = jest.fn();
      const onItemProcessed = jest.fn();
      
      instance.registerEvents({
        onSyncStart,
        onSyncComplete,
        onItemProcessed
      });
      
      // Process the queue
      await instance.processQueue();
      
      // Verify events were fired
      expect(onSyncStart).toHaveBeenCalled();
      expect(onSyncComplete).toHaveBeenCalledWith({ success: 1, failed: 0 });
      expect(onItemProcessed).toHaveBeenCalledWith(expect.any(Object), true);
      
      // Verify item was processed
      expect(mockProcessItem).toHaveBeenCalled();
      
      // Verify item status was updated
      // @ts-ignore - accessing private property for testing
      expect(instance.queue[0].status).toBe('completed');
    });
    
    it('should handle failed items and retry logic', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Mock network connectivity
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Add a test item with network disconnected first
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
      await instance.addToQueue({
        operation: 'update',
        entity: 'products',
        data: { id: 'test-id', name: 'Updated Product' }
      });
      
      // Mock failed processing
      const mockError = new Error('Test error');
      const mockProcessItem = jest.fn().mockRejectedValue(mockError);
      // @ts-ignore - replacing private method for testing
      instance.processItem = mockProcessItem;
      
      // Register event handlers for testing
      const onItemProcessed = jest.fn();
      
      instance.registerEvents({
        onItemProcessed
      });
      
      // Process the queue
      await instance.processQueue();
      
      // Verify events were fired
      expect(onItemProcessed).toHaveBeenCalledWith(expect.any(Object), false);
      
      // Verify item status was updated
      // @ts-ignore - accessing private property for testing
      const item = instance.queue[0];
      expect(item.status).toBe('pending'); // First failure, still pending
      expect(item.retryCount).toBe(1);
      expect(item.errorMessage).toBe('Test error');
      
      // Simulate multiple failures to reach max retry count
      for (let i = 0; i < 2; i++) {
        await instance.processQueue();
      }
      
      // @ts-ignore - accessing private property for testing
      expect(instance.queue[0].status).toBe('failed'); // After 3 failures
      expect(instance.queue[0].retryCount).toBe(3);
    });
    
    it('should retry failed items', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Mock network connectivity
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Add a failed item
      // @ts-ignore - directly manipulating queue for testing
      instance.queue = [{
        id: 'failed-item',
        operation: 'create',
        entity: 'products',
        data: { name: 'Failed Product' },
        timestamp: Date.now(),
        retryCount: 3,
        status: 'failed',
        errorMessage: 'Previous error'
      }];
      
      // Mock successful processing for retry
      const mockProcessItem = jest.fn().mockResolvedValue(undefined);
      // @ts-ignore - replacing private method for testing
      instance.processItem = mockProcessItem;
      
      // Retry failed items
      await instance.retryFailedItems();
      
      // @ts-ignore - accessing private property for testing
      const item = instance.queue[0];
      expect(item.status).toBe('processing'); // Status changes to processing when processQueue is called
      expect(item.retryCount).toBe(0);
      
      // Verify persistence was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
    
    it('should remove items from the queue', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Add two items
      const item1 = await instance.addToQueue({
        operation: 'create',
        entity: 'products',
        data: { name: 'Product 1' }
      });
      
      await instance.addToQueue({
        operation: 'create',
        entity: 'products',
        data: { name: 'Product 2' }
      });
      
      // Remove one item
      await instance.removeFromQueue(item1.id);
      
      // @ts-ignore - accessing private property for testing
      expect(instance.queue.length).toBe(1);
      // @ts-ignore
      expect(instance.queue[0].data.name).toBe('Product 2');
      
      // Verify persistence was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
  
  describe('CRUD Operations', () => {
    it('should handle create operations', async () => {
      const instance = SyncQueueManager.getInstance();
      
      const item: SyncQueueItem = {
        id: 'test-create',
        operation: 'create',
        entity: 'products',
        data: { name: 'New Product' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };
      
      // @ts-ignore - accessing private method for testing
      await instance.handleCreate(item);
      
      // Verify data was updated with server response
      expect(item.data.id).toBe('mock-id');
    });
    
    it('should handle update operations with conflict detection', async () => {
      const instance = SyncQueueManager.getInstance();
      
      const item: SyncQueueItem = {
        id: 'test-update',
        operation: 'update',
        entity: 'products',
        data: { id: 'product-id', name: 'Updated Product' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        version: Date.now() - 1000 // Older version
      };
      
      // Mock server response with newer timestamp
      const mockServerTimestamp = new Date(Date.now() + 1000).toISOString();
      const mockSupabaseSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { updated_at: mockServerTimestamp }, 
            error: null 
          }))
        }))
      }));
      
      // @ts-ignore - mocking supabase
      supabase.from.mockImplementationOnce(() => ({
        select: mockSupabaseSelect
      }));
      
      // Should throw conflict error
      await expect(
        // @ts-ignore - accessing private method for testing
        instance.handleUpdate(item)
      ).rejects.toThrow('Conflict detected');
    });
    
    it('should handle delete operations', async () => {
      const instance = SyncQueueManager.getInstance();
      
      const item: SyncQueueItem = {
        id: 'test-delete',
        operation: 'delete',
        entity: 'products',
        data: { id: 'product-id' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };
      
      // @ts-ignore - accessing private method for testing
      await instance.handleDelete(item);
      
      // Verify supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('products');
    });
  });
  
  describe('Utility Methods', () => {
    it('should get pending and failed counts', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // @ts-ignore - directly manipulating queue for testing
      instance.queue = [
        {
          id: 'item-1',
          operation: 'create',
          entity: 'products',
          data: { name: 'Pending Product' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending'
        },
        {
          id: 'item-2',
          operation: 'update',
          entity: 'products',
          data: { id: 'test', name: 'Failed Product' },
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed'
        },
        {
          id: 'item-3',
          operation: 'create',
          entity: 'products',
          data: { name: 'Completed Product' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'completed'
        }
      ];
      
      expect(instance.getPendingCount()).toBe(1);
      expect(instance.getFailedCount()).toBe(1);
      expect(instance.getQueue().length).toBe(3);
    });
    
    it('should clean up completed items', async () => {
      const instance = SyncQueueManager.getInstance();
      
      // Create 110 completed items
      // @ts-ignore - directly manipulating queue for testing
      instance.queue = Array.from({ length: 110 }, (_, i) => ({
        id: `completed-${i}`,
        operation: 'create',
        entity: 'products',
        data: { name: `Product ${i}` },
        timestamp: Date.now() - (i * 1000), // Older items have smaller timestamps
        retryCount: 0,
        status: 'completed'
      }));
      
      // Add one pending item
      // @ts-ignore
      instance.queue.push({
        id: 'pending-item',
        operation: 'create',
        entity: 'products',
        data: { name: 'Pending Product' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      });
      
      // @ts-ignore - accessing private method for testing
      await instance.cleanupCompletedItems();
      
      // Should keep 100 completed items + 1 pending item
      // @ts-ignore
      expect(instance.queue.length).toBe(101);
      
      // Should keep newest completed items (higher timestamps)
      // @ts-ignore
      const completedItems = instance.queue.filter(item => item.status === 'completed');
      expect(completedItems.length).toBe(100);
      
      // First item should have id completed-0 (newest)
      expect(completedItems[0].id).toBe('completed-0');
      
      // Pending item should remain
      // @ts-ignore
      const pendingItem = instance.queue.find(item => item.status === 'pending');
      expect(pendingItem).toBeDefined();
      expect(pendingItem?.id).toBe('pending-item');
    });
  });
}); 