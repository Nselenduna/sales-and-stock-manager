import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import InventoryListScreen from '../../../screens/inventory/InventoryListScreen';
import useAuthStore from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';

// Mock dependencies
jest.mock('../../../store/authStore');
jest.mock('../../../lib/supabase');
jest.mock('../../../components/ProductCard', () => 'ProductCard');
jest.mock('../../../components/SearchBar', () => 'SearchBar');
jest.mock('../../../components/FilterBar', () => 'FilterBar');
jest.mock('../../../components/FloatingActionButton', () => 'FloatingActionButton');
jest.mock('../../../components/EmptyState', () => 'EmptyState');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock products data
const mockProducts = [
  {
    id: '1',
    name: 'Test Product 1',
    sku: 'SKU001',
    barcode: '123456789',
    quantity: 10,
    low_stock_threshold: 5,
    location: 'Warehouse A',
    unit_price: 29.99,
    description: 'Test product description',
    category: 'Electronics',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Product 2',
    sku: 'SKU002',
    barcode: '987654321',
    quantity: 0,
    low_stock_threshold: 10,
    location: 'Warehouse B',
    unit_price: 49.99,
    description: 'Another test product',
    category: 'Clothing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('InventoryListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth store mock
    mockUseAuthStore.mockReturnValue({
      userRole: 'staff',
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      checkUser: jest.fn(),
    });

    // Default Supabase mock
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }),
    } as any);
  });

  describe('UI State Validation', () => {
    it('renders loading state initially', () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      expect(screen.getByText('Loading inventory...')).toBeTruthy();
    });

    it('renders empty state when no products', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No products found')).toBeTruthy();
      });
    });

    it('renders product list when products exist', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Inventory')).toBeTruthy();
      });
    });

    it('shows error message when API fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      } as any);

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load inventory')).toBeTruthy();
      });
    });
  });

  describe('Role Access Simulation', () => {
    it('shows FAB for admin users', async () => {
      mockUseAuthStore.mockReturnValue({
        userRole: 'admin',
        user: { id: '1', email: 'admin@example.com' },
        isAuthenticated: true,
        loading: false,
        signOut: jest.fn(),
        signIn: jest.fn(),
        signUp: jest.fn(),
        checkUser: jest.fn(),
      });

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        // FAB should be visible for admin
        expect(screen.getByTestId('fab-add-product')).toBeTruthy();
      });
    });

    it('shows FAB for staff users', async () => {
      mockUseAuthStore.mockReturnValue({
        userRole: 'staff',
        user: { id: '2', email: 'staff@example.com' },
        isAuthenticated: true,
        loading: false,
        signOut: jest.fn(),
        signIn: jest.fn(),
        signUp: jest.fn(),
        checkUser: jest.fn(),
      });

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        // FAB should be visible for staff
        expect(screen.getByTestId('fab-add-product')).toBeTruthy();
      });
    });

    it('hides FAB for viewer users', async () => {
      mockUseAuthStore.mockReturnValue({
        userRole: 'viewer',
        user: { id: '3', email: 'viewer@example.com' },
        isAuthenticated: true,
        loading: false,
        signOut: jest.fn(),
        signIn: jest.fn(),
        signUp: jest.fn(),
        checkUser: jest.fn(),
      });

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        // FAB should not be visible for viewer
        expect(screen.queryByTestId('fab-add-product')).toBeNull();
      });
    });
  });

  describe('Sync Status Overlays', () => {
    it('shows sync status indicator', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toBeTruthy();
      });
    });

    it('shows offline indicator when network is down', async () => {
      // Mock network status
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Offline Mode')).toBeTruthy();
      });
    });
  });

  describe('Search and Filter Functionality', () => {
    it('filters products by search query', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        fireEvent.changeText(searchInput, 'Test Product 1');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeTruthy();
        expect(screen.queryByText('Test Product 2')).toBeNull();
      });
    });

    it('filters products by stock status', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const lowStockFilter = screen.getByText('Low Stock');
        fireEvent.press(lowStockFilter);
      });

      await waitFor(() => {
        // Should show only products with low stock
        expect(screen.getByText('Test Product 1')).toBeTruthy();
      });
    });

    it('sorts products by name', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const sortButton = screen.getByTestId('sort-button');
        fireEvent.press(sortButton);
      });

      await waitFor(() => {
        // Products should be sorted
        expect(screen.getByText('Test Product 1')).toBeTruthy();
      });
    });
  });

  describe('Navigation and Actions', () => {
    it('navigates to add product screen when FAB is pressed', async () => {
      mockUseAuthStore.mockReturnValue({
        userRole: 'admin',
        user: { id: '1', email: 'admin@example.com' },
        isAuthenticated: true,
        loading: false,
        signOut: jest.fn(),
        signIn: jest.fn(),
        signUp: jest.fn(),
        checkUser: jest.fn(),
      });

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const fab = screen.getByTestId('fab-add-product');
        fireEvent.press(fab);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddProduct', { mode: 'add' });
    });

    it('navigates to product detail when product is pressed', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const productCard = screen.getByTestId('product-card-1');
        fireEvent.press(productCard);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ProductDetail', {
        product: mockProducts[0],
      });
    });

    it('navigates to QR scanner when QR icon is pressed', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const qrIcon = screen.getByTestId('qr-icon-1');
        fireEvent.press(qrIcon);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('QRScanner', {
        sku: 'SKU001',
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Search products')).toBeTruthy();
        expect(screen.getByLabelText('Add new product')).toBeTruthy();
      });
    });

    it('supports screen reader navigation', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const productCards = screen.getAllByRole('button');
        expect(productCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('implements proper list virtualization', async () => {
      const manyProducts = Array.from({ length: 100 }, (_, i) => ({
        ...mockProducts[0],
        id: i.toString(),
        name: `Product ${i}`,
        sku: `SKU${i.toString().padStart(3, '0')}`,
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: manyProducts,
            error: null,
          }),
        }),
      } as any);

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should render without performance issues
        expect(screen.getByText('Product 0')).toBeTruthy();
      });
    });

    it('debounces search input', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        fireEvent.changeText(searchInput, 'test');
      });

      // Fast forward timers to trigger debounced search
      jest.runAllTimers();

      await waitFor(() => {
        // Search should be executed after debounce
        expect(screen.getByText('Test Product 1')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      } as any);

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load inventory')).toBeTruthy();
      });
    });

    it('provides retry functionality', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      } as any);

      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.press(retryButton);
      });

      // Should attempt to reload data
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('Regression Testing', () => {
    it('maintains state after screen re-render', async () => {
      const { rerender } = render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeTruthy();
      });

      // Re-render the component
      rerender(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // State should be maintained
      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeTruthy();
      });
    });

    it('handles rapid navigation changes', async () => {
      render(
        <TestWrapper>
          <InventoryListScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const fab = screen.getByTestId('fab-add-product');
        
        // Rapidly press the FAB multiple times
        fireEvent.press(fab);
        fireEvent.press(fab);
        fireEvent.press(fab);
      });

      // Should only navigate once
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });
  });
}); 