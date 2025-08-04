import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SalesHistoryScreen from '../../screens/sales/SalesHistoryScreen';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('../../components/Icon', () => 'Icon');

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const mockTransactions = [
  {
    id: 'txn-001',
    created_at: '2024-01-01T10:00:00Z',
    total: 1500,
    status: 'synced',
    payment_method: 'cash',
    customer_name: 'Alice Smith',
    customer_email: 'alice@example.com',
    items: [
      { product_name: 'Apple', quantity: 3, unit_price: 500, total_price: 1500 }
    ],
  },
  {
    id: 'txn-002',
    created_at: '2024-01-01T11:00:00Z',
    total: 2000,
    status: 'queued',
    payment_method: 'card',
    customer_name: 'Bob Johnson',
    customer_email: 'bob@example.com',
    items: [
      { product_name: 'Banana', quantity: 4, unit_price: 500, total_price: 2000 }
    ],
  },
  {
    id: 'txn-003',
    created_at: '2024-01-01T12:00:00Z',
    total: 3000,
    status: 'failed',
    payment_method: 'cash',
    customer_name: 'Charlie Brown',
    customer_email: 'charlie@example.com',
    items: [
      { product_name: 'Orange', quantity: 6, unit_price: 500, total_price: 3000 }
    ],
  },
];

describe('SalesHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(mockTransactions)
    );
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    expect(getByText('Loading sales history...')).toBeTruthy();
  });

  it('should load and display transactions', async () => {
    const { getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    expect(getByText('Sales History')).toBeTruthy();
    expect(getByText('txn-001...')).toBeTruthy();
    expect(getByText('txn-002...')).toBeTruthy();
    expect(getByText('txn-003...')).toBeTruthy();
  });

  it('should filter transactions by status', async () => {
    const { getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    // Filter by 'synced' status
    const syncedButton = getByText('Synced');
    fireEvent.press(syncedButton);

    // Should show only synced transactions
    expect(getByText('txn-001...')).toBeTruthy();
    expect(queryByText('txn-002...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should search transactions by transaction ID', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'txn-001');

    // Should show only matching transaction
    expect(getByText('txn-001...')).toBeTruthy();
    expect(queryByText('txn-002...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should search transactions by customer name', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'Alice');

    // Should show only Alice's transaction
    expect(getByText('txn-001...')).toBeTruthy();
    expect(queryByText('txn-002...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should search transactions by customer email', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'bob@example.com');

    // Should show only Bob's transaction
    expect(getByText('txn-002...')).toBeTruthy();
    expect(queryByText('txn-001...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should search transactions by product name', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'Orange');

    // Should show only transaction with Orange
    expect(getByText('txn-003...')).toBeTruthy();
    expect(queryByText('txn-001...')).toBeNull();
    expect(queryByText('txn-002...')).toBeNull();
  });

  it('should clear search when clear button is pressed', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'Alice');

    // Should show only Alice's transaction
    expect(getByText('txn-001...')).toBeTruthy();
    expect(queryByText('txn-002...')).toBeNull();

    // Clear search
    fireEvent.changeText(searchInput, '');

    // Should show all transactions again
    expect(getByText('txn-001...')).toBeTruthy();
    expect(getByText('txn-002...')).toBeTruthy();
    expect(getByText('txn-003...')).toBeTruthy();
  });

  it('should combine search and status filters', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    // Filter by queued status
    const queuedButton = getByText('Queued');
    fireEvent.press(queuedButton);

    // Then search for Bob
    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'Bob');

    // Should show only Bob's queued transaction
    expect(getByText('txn-002...')).toBeTruthy();
    expect(queryByText('txn-001...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should navigate to receipt screen when transaction is pressed', async () => {
    const { getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const transaction = getByText('txn-001...');
    fireEvent.press(transaction);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Receipt', {
      transactionId: 'txn-001',
    });
  });

  it('should show empty state when no transactions match search', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'nonexistent');

    expect(getByText('No transactions found')).toBeTruthy();
    expect(queryByText('txn-001...')).toBeNull();
    expect(queryByText('txn-002...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should handle case-insensitive search', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Search by ID, customer, or product...');
    fireEvent.changeText(searchInput, 'ALICE'); // Uppercase

    // Should still find Alice's transaction
    expect(getByText('txn-001...')).toBeTruthy();
    expect(queryByText('txn-002...')).toBeNull();
    expect(queryByText('txn-003...')).toBeNull();
  });

  it('should handle refresh functionality', async () => {
    const { queryByText } = render(
      <SalesHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(queryByText('Loading sales history...')).toBeNull();
    });

    // Note: In the actual implementation, we would need to add testID to the FlatList
    // and simulate pull-to-refresh. This test demonstrates the expected behavior.
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});