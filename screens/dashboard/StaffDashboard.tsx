import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import QuickActionsModal from '../../components/QuickActionsModal';

const StaffDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleNavigateToInventory = () => {
    navigation.navigate('Inventory');
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct', { mode: 'add' });
  };

  const handleStockAlerts = () => {
    navigation.navigate('StockAlerts');
  };

  const handleQuickActions = () => {
    setQuickActionsVisible(true);
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'scan-product':
        navigation.navigate('BarcodeScanner', {
          onBarcodeScanned: (result: any) => {
            // Handle the scanned barcode result
            // You can navigate to inventory or product detail based on the result
            if (result.product) {
              navigation.navigate('ProductDetail', {
                productId: result.product.id,
              });
            } else {
              navigation.navigate('Inventory');
            }
          },
        });
        break;
      case 'create-sale':
        navigation.navigate('Sales');
        break;
      case 'add-stock':
        navigation.navigate('Inventory');
        break;
      case 'view-inventory':
        navigation.navigate('Inventory');
        break;
      case 'stock-alerts':
        navigation.navigate('StockAlerts');
        break;
      case 'search-products':
        navigation.navigate('Inventory');
        break;
      default:
        // Unknown action
        break;
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome, {user?.email || 'Staff Member'}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inventory Management</Text>
            <Text style={styles.cardDescription}>
              View and manage product inventory, check stock levels, and add new
              products.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={handleNavigateToInventory}
            >
              <Text style={styles.cardButtonText}>View Inventory</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add New Product</Text>
            <Text style={styles.cardDescription}>
              Add new products to the inventory with detailed information.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={handleAddProduct}
            >
              <Text style={styles.cardButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sales</Text>
            <Text style={styles.cardDescription}>
              Process sales transactions, scan barcodes, and manage customer
              purchases.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={() => navigation.navigate('Sales')}
            >
              <Text style={styles.cardButtonText}>Start Sale</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stock Alerts</Text>
            <Text style={styles.cardDescription}>
              Monitor low stock items and receive alerts when products need
              restocking.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={handleStockAlerts}
            >
              <Text style={styles.cardButtonText}>View Alerts</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Text style={styles.cardDescription}>
              Quick access to common tasks and frequently used features.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={handleQuickActions}
            >
              <Text style={styles.cardButtonText}>Quick Actions</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <QuickActionsModal
        visible={quickActionsVisible}
        onClose={() => setQuickActionsVisible(false)}
        onAction={handleQuickAction}
      />
    </>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    margin: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StaffDashboard;
