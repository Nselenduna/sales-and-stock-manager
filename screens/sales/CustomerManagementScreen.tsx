import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_spent: number;
  total_orders: number;
  last_order_date: string;
  created_at: string;
}

interface CustomerManagementScreenProps {
  navigation: any;
}

const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ navigation }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      // First try to get customers using the database function
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_customers_from_sales');
      
      if (!functionError && functionData) {
        // Transform function data to match our Customer interface
        const customersList = functionData.map((customer: any) => ({
          id: customer.customer_email || customer.customer_name,
          name: customer.customer_name,
          email: customer.customer_email || '',
          phone: customer.customer_phone || '',
          total_spent: customer.total_spent || 0,
          total_orders: customer.total_orders || 0,
          last_order_date: customer.last_order_date,
          created_at: customer.last_order_date,
        }));
        
        setCustomers(customersList);
        return;
      }

      // Fallback: Try to query sales table directly
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales data:', error);
        // Show mock data if database query fails
        const mockCustomers: Customer[] = [
          {
            id: 'john-doe',
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            total_spent: 150.00,
            total_orders: 1,
            last_order_date: new Date(Date.now() - 86400000).toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'jane-smith',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+1234567891',
            total_spent: 275.50,
            total_orders: 2,
            last_order_date: new Date(Date.now() - 172800000).toISOString(),
            created_at: new Date(Date.now() - 172800000).toISOString(),
          }
        ];
        setCustomers(mockCustomers);
        return;
      }

      // Process sales data to extract customer information
      const customerMap = new Map<string, Customer>();
      
      salesData?.forEach(sale => {
        // Handle both old and new schema
        const customerName = sale.customer_name || 'Walk-in Customer';
        const customerEmail = sale.customer_email || '';
        const customerPhone = sale.customer_phone || '';
        
        if (!customerMap.has(customerName)) {
          customerMap.set(customerName, {
            id: customerName,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            total_spent: 0,
            total_orders: 0,
            last_order_date: sale.created_at,
            created_at: sale.created_at,
          });
        }
        
        const customer = customerMap.get(customerName)!;
        customer.total_spent += (sale.total || 0) / 100; // Convert pence to dollars
        customer.total_orders += 1;
        
        if (new Date(sale.created_at) > new Date(customer.last_order_date)) {
          customer.last_order_date = sale.created_at;
        }
      });

      const customersList = Array.from(customerMap.values())
        .filter(customer => customer.name !== 'Walk-in Customer') // Filter out walk-in customers
        .sort((a, b) => b.total_spent - a.total_spent);
      
      setCustomers(customersList);
    } catch (error) {
      console.error('Failed to load customers:', error);
      // Show mock data if everything fails
      const mockCustomers: Customer[] = [
        {
          id: 'john-doe',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          total_spent: 150.00,
          total_orders: 1,
          last_order_date: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      setCustomers(mockCustomers);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadCustomers();
    setIsRefreshing(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    try {
      // For now, we'll just add to local state since we don't have a separate customers table
      const customer: Customer = {
        id: Date.now().toString(),
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        total_spent: 0,
        total_orders: 0,
        last_order_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      setCustomers(prev => [customer, ...prev]);
      setNewCustomer({ name: '', email: '', phone: '' });
      setShowAddCustomer(false);
      Alert.alert('Success', 'Customer added successfully');
    } catch (error) {
      console.error('Failed to add customer:', error);
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
          {item.phone && <Text style={styles.customerPhone}>{item.phone}</Text>}
        </View>
        <View style={styles.customerStats}>
          <Text style={styles.customerSpent}>{formatCurrency(item.total_spent)}</Text>
          <Text style={styles.customerOrders}>{item.total_orders} orders</Text>
        </View>
      </View>
      
      <View style={styles.customerFooter}>
        <Text style={styles.customerDate}>
          Last order: {formatDate(item.last_order_date)}
        </Text>
        <Icon name="chevron-right" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Customer Management</Text>
        <Text style={styles.headerSubtitle}>
          {customers.length} customer{customers.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessible={true}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Icon name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderAddCustomerModal = () => (
    <Modal
      visible={showAddCustomer}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddCustomer(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            <TouchableOpacity
              onPress={() => setShowAddCustomer(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Customer Name *"
              value={newCustomer.name}
              onChangeText={(text) => setNewCustomer(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              value={newCustomer.email}
              onChangeText={(text) => setNewCustomer(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowAddCustomer(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleAddCustomer}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                Add Customer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddCustomer(true)}
        >
          <Icon name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="person" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Customers Found</Text>
            <Text style={styles.emptyStateDescription}>
              {searchQuery ? 'Try adjusting your search terms' : 'Start by adding your first customer'}
            </Text>
          </View>
        }
      />

      {renderAddCustomerModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContainer: {
    padding: 20,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  customerSpent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  customerOrders: {
    fontSize: 12,
    color: '#666',
  },
  customerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  customerDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: 'white',
  },
});

export default CustomerManagementScreen; 