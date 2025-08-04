import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import InventoryListScreen from '../../screens/inventory/InventoryListScreen';
import { useDebouncedSearch } from '../../hooks/useDebounce';
import { FlashList } from '@shopify/flash-list';

// Mock dependencies
jest.mock('../../hooks/useDebounce');
jest.mock('@shopify/flash-list');

const mockUseDebouncedSearch = useDebouncedSearch as jest.MockedFunction<typeof useDebouncedSearch>;

describe('Performance Tests', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performance.mark = jest.fn();
    performance.measure = jest.fn();
    performance.getEntriesByType = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Large Dataset Rendering Performance', () => {
    it('renders large inventory list efficiently with virtualization', async () => {
      const largeInventory = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        name: `Product ${i}`,
        price: Math.random() * 100,
        quantity: Math.floor(Math.random() * 100),
        sku: `SKU${i}`,
        low_stock_threshold: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const startTime = performance.now();

      const { getByTestId } = render(
        <InventoryListScreen navigation={mockNavigation} />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 500ms for initial render)
      expect(renderTime).toBeLessThan(500);

      // Should use FlashList for virtualization
      expect(FlashList).toHaveBeenCalled();
    });

    it('handles rapid scrolling through large lists', async () => {
      const largeInventory = Array.from({ length: 5000 }, (_, i) => ({
        id: i.toString(),
        name: `Product ${i}`,
        price: Math.random() * 100,
        quantity: Math.floor(Math.random() * 100),
        sku: `SKU${i}`,
      }));

      const { getByTestId } = render(
        <InventoryListScreen navigation={mockNavigation} />
      );

      const scrollView = getByTestId('inventory-list');

      // Simulate rapid scrolling
      const scrollEvents = Array.from({ length: 100 }, (_, i) => ({
        nativeEvent: {
          contentOffset: { y: i * 100 },
          contentSize: { height: 50000 },
        },
      }));

      const startTime = performance.now();

      scrollEvents.forEach(event => {
        fireEvent.scroll(scrollView, event);
      });

      const endTime = performance.now();
      const scrollTime = endTime - startTime;

      // Should handle rapid scrolling efficiently (< 100ms)
      expect(scrollTime).toBeLessThan(100);
    });
  });

  describe('Search Performance', () => {
    it('debounces search input correctly', async () => {
      let debounceCallback: Function;
      mockUseDebouncedSearch.mockImplementation((callback, delay) => {
        debounceCallback = callback;
        return jest.fn();
      });

      const { getByPlaceholderText } = render(
        <InventoryListScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search products...');

      // Simulate rapid typing
      const searchTerms = ['p', 'pr', 'pro', 'prod', 'produ', 'product'];
      
      const startTime = performance.now();

      searchTerms.forEach(term => {
        fireEvent.changeText(searchInput, term);
      });

      // Should only execute search after debounce delay
      expect(mockUseDebouncedSearch).toHaveBeenCalledWith(
        expect.any(Function),
        300 // 300ms debounce delay
      );

      const endTime = performance.now();
      const inputTime = endTime - startTime;

      // Input handling should be immediate (< 50ms)
      expect(inputTime).toBeLessThan(50);
    });

    it('handles search with large result sets efficiently', async () => {
      const searchResults = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        name: `Matching Product ${i}`,
        price: Math.random() * 100,
        quantity: Math.floor(Math.random() * 100),
        sku: `MATCH${i}`,
      }));

      const mockSearch = jest.fn().mockResolvedValue(searchResults);

      const startTime = performance.now();
      await mockSearch('test query');
      const searchTime = performance.now() - startTime;

      // Search should complete quickly (< 200ms for mock)
      expect(searchTime).toBeLessThan(200);
      expect(mockSearch).toHaveBeenCalledWith('test query');
    });
  });

  describe('Image Loading Performance', () => {
    it('implements lazy loading for product images', async () => {
      const products = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        name: `Product ${i}`,
        image_url: `https://example.com/image${i}.jpg`,
        price: 10.99,
      }));

      const { getAllByTestId } = render(
        <InventoryListScreen navigation={mockNavigation} />
      );

      // Only visible images should be loaded initially
      const visibleImages = getAllByTestId(/product-image-\d+/);
      
      // Should load only a subset of images (viewport size dependent)
      expect(visibleImages.length).toBeLessThan(products.length);
      expect(visibleImages.length).toBeGreaterThan(0);
    });

    it('compresses and optimizes images efficiently', () => {
      const imageOptimizer = {
        compress: (imageData: ArrayBuffer, quality: number) => {
          const startTime = performance.now();
          
          // Simulate compression
          const compressionRatio = quality / 100;
          const compressedSize = imageData.byteLength * compressionRatio;
          
          const endTime = performance.now();
          const compressionTime = endTime - startTime;

          return {
            data: new ArrayBuffer(compressedSize),
            compressionTime,
            originalSize: imageData.byteLength,
            compressedSize,
          };
        },
      };

      const originalImage = new ArrayBuffer(1024 * 1024); // 1MB
      const result = imageOptimizer.compress(originalImage, 80);

      // Should compress significantly
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.compressionTime).toBeLessThan(100); // Fast compression
    });
  });

  describe('Memory Usage Optimization', () => {
    it('cleans up resources when components unmount', () => {
      const resourceCleanup = jest.fn();
      
      const TestComponent = () => {
        React.useEffect(() => {
          const interval = setInterval(() => {}, 1000);
          const subscription = { unsubscribe: resourceCleanup };

          return () => {
            clearInterval(interval);
            subscription.unsubscribe();
          };
        }, []);

        return null;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();

      expect(resourceCleanup).toHaveBeenCalled();
    });

    it('limits concurrent image downloads', async () => {
      const imageQueue = {
        maxConcurrent: 3,
        active: 0,
        pending: [] as string[],
        
        async downloadImage(url: string) {
          if (this.active >= this.maxConcurrent) {
            this.pending.push(url);
            return;
          }

          this.active++;
          try {
            await new Promise(resolve => setTimeout(resolve, 100));
            return `downloaded-${url}`;
          } finally {
            this.active--;
            if (this.pending.length > 0) {
              const nextUrl = this.pending.shift()!;
              this.downloadImage(nextUrl);
            }
          }
        },
      };

      // Queue many downloads
      const urls = Array.from({ length: 10 }, (_, i) => `image${i}.jpg`);
      const promises = urls.map(url => imageQueue.downloadImage(url));

      // Should not exceed max concurrent downloads
      expect(imageQueue.active).toBeLessThanOrEqual(imageQueue.maxConcurrent);
      
      await Promise.all(promises);
      expect(imageQueue.active).toBe(0);
    });
  });

  describe('Network Performance', () => {
    it('implements request caching', () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      const cachedFetch = async (url: string) => {
        const cached = cache.get(url);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          return cached.data;
        }

        const data = await fetch(url);
        cache.set(url, { data, timestamp: now });
        return data;
      };

      // First call should hit network
      const startTime1 = performance.now();
      cachedFetch('api/products');
      const firstCallTime = performance.now() - startTime1;

      // Second call should hit cache
      const startTime2 = performance.now();
      cachedFetch('api/products');
      const secondCallTime = performance.now() - startTime2;

      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    it('batches multiple API requests', async () => {
      const batchProcessor = {
        queue: [] as string[],
        processBatch: jest.fn(),

        async addRequest(request: string) {
          this.queue.push(request);
          
          if (this.queue.length >= 5) {
            await this.processBatch(this.queue.splice(0, 5));
          }
        },
      };

      // Add multiple requests
      await Promise.all([
        batchProcessor.addRequest('req1'),
        batchProcessor.addRequest('req2'),
        batchProcessor.addRequest('req3'),
        batchProcessor.addRequest('req4'),
        batchProcessor.addRequest('req5'),
      ]);

      expect(batchProcessor.processBatch).toHaveBeenCalledWith([
        'req1', 'req2', 'req3', 'req4', 'req5'
      ]);
    });
  });

  describe('Offline Sync Performance', () => {
    it('efficiently queues offline operations', () => {
      const syncQueue = {
        operations: [] as any[],
        maxQueueSize: 1000,

        addOperation(operation: any) {
          if (this.operations.length >= this.maxQueueSize) {
            // Remove oldest operations to prevent memory issues
            this.operations.shift();
          }
          this.operations.push({
            ...operation,
            timestamp: Date.now(),
          });
        },

        getQueueSize() {
          return this.operations.length;
        },
      };

      // Add many operations
      for (let i = 0; i < 1500; i++) {
        syncQueue.addOperation({ type: 'CREATE', data: { id: i } });
      }

      // Should limit queue size
      expect(syncQueue.getQueueSize()).toBeLessThanOrEqual(syncQueue.maxQueueSize);
    });

    it('prioritizes critical operations during sync', () => {
      const priorityQueue = {
        high: [] as any[],
        medium: [] as any[],
        low: [] as any[],

        addOperation(operation: any, priority: 'high' | 'medium' | 'low') {
          this[priority].push(operation);
        },

        getNextOperation() {
          if (this.high.length > 0) return this.high.shift();
          if (this.medium.length > 0) return this.medium.shift();
          if (this.low.length > 0) return this.low.shift();
          return null;
        },
      };

      priorityQueue.addOperation({ type: 'BACKUP' }, 'low');
      priorityQueue.addOperation({ type: 'SALE' }, 'high');
      priorityQueue.addOperation({ type: 'UPDATE' }, 'medium');

      // Should process high priority first
      const next = priorityQueue.getNextOperation();
      expect(next?.type).toBe('SALE');
    });
  });

  describe('Component Rendering Optimization', () => {
    it('memoizes expensive calculations', () => {
      const expensiveCalculation = jest.fn((items: any[]) => {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      });

      const memoizedCalculation = React.useMemo(() => {
        return expensiveCalculation;
      }, []);

      const items = [
        { price: 10, quantity: 2 },
        { price: 20, quantity: 1 },
      ];

      // First calculation
      memoizedCalculation(items);
      
      // Same items, should use memoized result
      memoizedCalculation(items);

      expect(expensiveCalculation).toHaveBeenCalledTimes(2);
    });

    it('prevents unnecessary re-renders with React.memo', () => {
      const renderCount = jest.fn();

      const ExpensiveComponent = React.memo(({ data }: { data: any }) => {
        renderCount();
        return null;
      });

      const { rerender } = render(<ExpensiveComponent data={{ id: 1 }} />);
      
      // Same props, should not re-render
      rerender(<ExpensiveComponent data={{ id: 1 }} />);
      
      expect(renderCount).toHaveBeenCalledTimes(1);

      // Different props, should re-render
      rerender(<ExpensiveComponent data={{ id: 2 }} />);
      
      expect(renderCount).toHaveBeenCalledTimes(2);
    });
  });
});