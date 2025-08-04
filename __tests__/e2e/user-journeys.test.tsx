import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import App from '../../App';
import { useAuthStore } from '../../store/authStore';

// Mock all external dependencies
jest.mock('../../store/authStore');
jest.mock('../../lib/supabase');
jest.mock('expo-camera');
jest.mock('expo-barcode-scanner');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('End-to-End User Journeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey: Staff Login to Sale', () => {
    it('allows staff to login, navigate to sales, add products, and complete transaction', async () => {
      // Mock authenticated user
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'staff123',
          email: 'staff@example.com',
          role: 'staff',
        },
        session: { access_token: 'token123' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, getByPlaceholderText, getByTestId } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Should show staff dashboard
      await waitFor(() => {
        expect(getByText('Staff Dashboard')).toBeTruthy();
      });

      // Navigate to sales
      const salesButton = getByText('Sales');
      fireEvent.press(salesButton);

      await waitFor(() => {
        expect(getByText('Sales Screen')).toBeTruthy();
      });

      // Search for products
      const searchInput = getByPlaceholderText('Search products...');
      fireEvent.changeText(searchInput, 'laptop');

      await waitFor(() => {
        expect(getByText('Laptop - $999.99')).toBeTruthy();
      });

      // Add product to cart
      const addToCartButton = getByTestId('add-to-cart-laptop');
      fireEvent.press(addToCartButton);

      // Verify cart
      expect(getByText('Cart (1)')).toBeTruthy();
      expect(getByText('Total: $999.99')).toBeTruthy();

      // Proceed to checkout
      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      // Select payment method
      const cashButton = getByText('Cash');
      fireEvent.press(cashButton);

      // Confirm payment
      const confirmButton = getByText('Confirm Payment');
      fireEvent.press(confirmButton);

      // Verify transaction completion
      await waitFor(() => {
        expect(getByText('Transaction Complete')).toBeTruthy();
        expect(getByText('Receipt ID:')).toBeTruthy();
      });
    });
  });

  describe('Admin Role Management Journey', () => {
    it('allows admin to manage user roles and permissions', async () => {
      // Mock admin user
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
        },
        session: { access_token: 'admin_token' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Navigate to admin dashboard
      await waitFor(() => {
        expect(getByText('Admin Dashboard')).toBeTruthy();
      });

      // Access user management
      const userMgmtButton = getByText('User Management');
      fireEvent.press(userMgmtButton);

      await waitFor(() => {
        expect(getByText('User Management Screen')).toBeTruthy();
      });

      // Select a user to modify
      const userRow = getByTestId('user-row-staff123');
      fireEvent.press(userRow);

      // Change role
      const roleSelector = getByTestId('role-selector');
      fireEvent.press(roleSelector);

      const viewerOption = getByText('Viewer');
      fireEvent.press(viewerOption);

      // Save changes
      const saveButton = getByText('Save Changes');
      fireEvent.press(saveButton);

      // Verify role change
      await waitFor(() => {
        expect(getByText('Role Updated Successfully')).toBeTruthy();
      });
    });
  });

  describe('Inventory Management Flow', () => {
    it('completes full inventory management cycle', async () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'staff123',
          email: 'staff@example.com',
          role: 'staff',
        },
        session: { access_token: 'token123' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, getByPlaceholderText, getByTestId } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Navigate to inventory
      const inventoryButton = getByText('Inventory');
      fireEvent.press(inventoryButton);

      await waitFor(() => {
        expect(getByText('Inventory List')).toBeTruthy();
      });

      // Add new product
      const addProductButton = getByText('Add Product');
      fireEvent.press(addProductButton);

      // Fill product form
      const nameInput = getByPlaceholderText('Product Name');
      const priceInput = getByPlaceholderText('Price');
      const quantityInput = getByPlaceholderText('Quantity');
      const skuInput = getByPlaceholderText('SKU');

      fireEvent.changeText(nameInput, 'New Laptop');
      fireEvent.changeText(priceInput, '1299.99');
      fireEvent.changeText(quantityInput, '10');
      fireEvent.changeText(skuInput, 'LAP002');

      // Save product
      const saveProductButton = getByText('Save Product');
      fireEvent.press(saveProductButton);

      // Verify product was added
      await waitFor(() => {
        expect(getByText('Product Added Successfully')).toBeTruthy();
      });

      // Update stock quantity
      const existingProduct = getByTestId('product-LAP001');
      fireEvent.press(existingProduct);

      const updateStockButton = getByText('Update Stock');
      fireEvent.press(updateStockButton);

      const newQuantityInput = getByPlaceholderText('New Quantity');
      fireEvent.changeText(newQuantityInput, '15');

      const confirmUpdateButton = getByText('Confirm Update');
      fireEvent.press(confirmUpdateButton);

      // Verify stock update
      await waitFor(() => {
        expect(getByText('Stock Updated Successfully')).toBeTruthy();
      });
    });
  });

  describe('Offline to Online Sync Flow', () => {
    it('handles offline operations and syncs when back online', async () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'staff123',
          email: 'staff@example.com',
          role: 'staff',
        },
        session: { access_token: 'token123' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      // Mock network state
      const mockNetworkState = { isConnected: false };
      
      const { getByText, getByTestId, rerender } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Perform operations while offline
      expect(getByText('Offline Mode')).toBeTruthy();

      // Try to make a sale
      const salesButton = getByText('Sales');
      fireEvent.press(salesButton);

      // Add product and checkout
      const addButton = getByTestId('add-to-cart-laptop');
      fireEvent.press(addButton);

      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      // Should queue transaction
      await waitFor(() => {
        expect(getByText('Transaction Queued')).toBeTruthy();
      });

      // Go back online
      mockNetworkState.isConnected = true;
      rerender(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Should start syncing
      await waitFor(() => {
        expect(getByText('Syncing...')).toBeTruthy();
      });

      // Should complete sync
      await waitFor(() => {
        expect(getByText('Sync Complete')).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('gracefully handles and recovers from errors', async () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'staff123',
          email: 'staff@example.com',
          role: 'staff',
        },
        session: { access_token: 'token123' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Simulate API error during checkout
      const salesButton = getByText('Sales');
      fireEvent.press(salesButton);

      const addButton = getByTestId('add-to-cart-laptop');
      fireEvent.press(addButton);

      // Mock checkout failure
      const checkoutButton = getByText('Checkout');
      fireEvent.press(checkoutButton);

      // Should show error message
      await waitFor(() => {
        expect(getByText('Checkout Failed')).toBeTruthy();
      });

      // Should offer retry option
      expect(getByText('Retry')).toBeTruthy();

      // Retry should work
      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(getByText('Processing...')).toBeTruthy();
      });
    });
  });

  describe('Permission Boundary Testing', () => {
    it('enforces role-based access controls', async () => {
      // Test viewer permissions
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'viewer123',
          email: 'viewer@example.com',
          role: 'viewer',
        },
        session: { access_token: 'viewer_token' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, queryByText } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Should show viewer dashboard
      await waitFor(() => {
        expect(getByText('Viewer Dashboard')).toBeTruthy();
      });

      // Should not have access to admin functions
      expect(queryByText('User Management')).toBeNull();
      expect(queryByText('System Settings')).toBeNull();

      // Should have read-only access to inventory
      const inventoryButton = getByText('View Inventory');
      fireEvent.press(inventoryButton);

      // Should not see edit buttons
      expect(queryByText('Add Product')).toBeNull();
      expect(queryByText('Edit')).toBeNull();
    });
  });

  describe('Data Integrity and Validation', () => {
    it('validates data integrity throughout user flows', async () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'staff123',
          email: 'staff@example.com',
          role: 'staff',
        },
        session: { access_token: 'token123' },
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        loading: false,
        initialize: jest.fn(),
      });

      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          <App />
        </NavigationContainer>
      );

      // Test invalid input handling
      const inventoryButton = getByText('Inventory');
      fireEvent.press(inventoryButton);

      const addProductButton = getByText('Add Product');
      fireEvent.press(addProductButton);

      // Try to save with invalid data
      const priceInput = getByPlaceholderText('Price');
      fireEvent.changeText(priceInput, 'invalid_price');

      const saveButton = getByText('Save Product');
      fireEvent.press(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(getByText('Invalid price format')).toBeTruthy();
      });

      // Test negative quantity
      const quantityInput = getByPlaceholderText('Quantity');
      fireEvent.changeText(quantityInput, '-5');

      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Quantity must be positive')).toBeTruthy();
      });
    });
  });
});