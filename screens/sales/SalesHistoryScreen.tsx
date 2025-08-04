import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { supabase, SalesTransaction, SalesHistoryFilters } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency, formatDate } from '../../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface SalesHistoryScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const SalesHistoryScreen: React.FC<SalesHistoryScreenProps> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SalesTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters] = useState<SalesHistoryFilters>({
    limit: 50,
    offset: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'synced' | 'failed'>('all');

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load from local storage first
      const localTransactions = await loadLocalTransactions();
      
      // Try to load from Supabase
      let remoteTransactions: SalesTransaction[] = [];
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(filters.limit || 50)
          .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

        if (error) throw error;
        remoteTransactions = data || [];
      } catch (error) {
        console.error('Failed to load remote transactions:', error);
      }

      // Merge local and remote transactions
      const mergedTransactions = mergeTransactions(localTransactions, remoteTransactions);
      setTransactions(mergedTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      Alert.alert('Error', 'Failed to load sales history');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadLocalTransactions = async (): Promise<SalesTransaction[]> => {
    try {
      const localData = await AsyncStorage.getItem('sales_transactions');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error('Failed to load local transactions:', error);
      return [];
    }
  };

  const mergeTransactions = (local: SalesTransaction[], remote: SalesTransaction[]): SalesTransaction[] => {
    const merged = [...local, ...remote];
    
    // Remove duplicates based on ID
    const uniqueMap = new Map();
    merged.forEach(transaction => {
      if (!uniqueMap.has(transaction.id)) {
        uniqueMap.set(transaction.id, transaction);
      }
    });
    
    // Sort by created_at descending
    return Array.from(uniqueMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const applyFilters = useCallback(() => {
    let filtered = transactions;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(transaction => {
        // Search by transaction ID
        if (transaction.id.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search by customer name
        if (transaction.customer_name?.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search by customer email
        if (transaction.customer_email?.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search by product names in items
        return transaction.items.some(item => 
          item.product_name?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, statusFilter, searchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadTransactions();
    setIsRefreshing(false);
  };

  const exportToCSV = async () => {
    try {
      const csvContent = generateCSV(filteredTransactions);
      const fileName = `sales_history_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Sales History',
        });
      } else {
        Alert.alert('Export Complete', `File saved as: ${fileName}`);
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      Alert.alert('Export Failed', 'Failed to export sales history');
    }
  };

  const generateCSV = (transactions: SalesTransaction[]): string => {
    const headers = [
      'Transaction ID',
      'Date',
      'Total (pence)',
      'Total (formatted)',
      'Status',
      'Items Count',
      'Items JSON'
    ];

    const rows = transactions.map(transaction => [
      transaction.id,
      transaction.created_at,
      transaction.total.toString(),
      formatCurrency(transaction.total),
      transaction.status,
      transaction.items.length.toString(),
      JSON.stringify(transaction.items)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return '#34C759';
      case 'queued':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return 'checkmark-circle';
      case 'queued':
        return 'clock';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderTransaction = ({ item }: { item: SalesTransaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => {
        navigation.navigate('Receipt', { transactionId: item.id });
      }}
    >
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionId}>{item.id.slice(0, 8)}...</Text>
        <View style={styles.statusContainer}>
          <Icon 
            name={getStatusIcon(item.status)} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDate}>
          {formatDate(item.created_at)}
        </Text>
        <Text style={styles.transactionTotal}>
          {formatCurrency(item.total)}
        </Text>
      </View>

      <View style={styles.transactionItems}>
        <Text style={styles.itemsCount}>
          {item.items.length} item{item.items.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.itemsPreview}>
          {item.items.slice(0, 2).map(item => item.product_name).join(', ')}
          {item.items.length > 2 && '...'}
        </Text>
      </View>
      
      <View style={styles.receiptAction}>
        <Icon name="receipt" size={16} color="#007AFF" />
        <Text style={styles.receiptActionText}>View Receipt</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (status: 'all' | 'queued' | 'synced' | 'failed', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === status && styles.filterButtonActive
      ]}
      onPress={() => setStatusFilter(status)}
    >
      <Text style={[
        styles.filterButtonText,
        statusFilter === status && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading sales history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Sales History</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportToCSV}
        >
          <Icon name="download" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('synced', 'Synced')}
          {renderFilterButton('queued', 'Queued')}
          {renderFilterButton('failed', 'Failed')}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, customer, or product..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Icon name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {statusFilter === 'all' 
                ? 'No sales transactions yet'
                : `No ${statusFilter} transactions found`
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  exportButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  transactionTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  transactionItems: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 8,
  },
  itemsCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemsPreview: {
    fontSize: 14,
    color: '#000000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  receiptAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  receiptActionText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default SalesHistoryScreen; 