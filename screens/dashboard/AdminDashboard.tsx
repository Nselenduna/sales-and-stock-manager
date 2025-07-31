import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/Icon';
import QuickActionsModal from '../../components/QuickActionsModal';

const AdminDashboard = ({ navigation }: { navigation: any }) => {
  const { user, signOut } = useAuthStore();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const handleSignOut = async () => {
    await signOut();
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
            console.log('Barcode scanned:', result);
            // You can navigate to inventory or product detail based on the result
            if (result.product) {
              navigation.navigate('ProductDetail', { productId: result.product.id });
            } else {
              navigation.navigate('Inventory');
            }
          }
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
        console.log('Unknown action:', actionId);
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.email || 'Admin'}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer Management</Text>
            <Text style={styles.cardDescription}>
              Manage customers, view purchase history, and track customer data
            </Text>
            <TouchableOpacity 
              style={styles.cardButton}
              onPress={() => navigation.navigate('CustomerManagement')}
            >
              <Text style={styles.cardButtonText}>Manage Customers</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sales</Text>
            <Text style={styles.cardDescription}>
              Process sales transactions, scan barcodes, and manage customer purchases.
            </Text>
            <TouchableOpacity 
              style={styles.cardButton}
              onPress={() => navigation.navigate('Sales')}
            >
              <Text style={styles.cardButtonText}>Start Sale</Text>
            </TouchableOpacity>
          </View>

                     <View style={styles.card}>
             <Text style={styles.cardTitle}>Sales Analytics</Text>
             <Text style={styles.cardDescription}>
               View comprehensive sales reports and analytics
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('SalesAnalytics')}
             >
               <Text style={styles.cardButtonText}>View Analytics</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>Sales Forecasting</Text>
             <Text style={styles.cardDescription}>
               Predictive analytics for inventory planning and demand forecasting
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('SalesForecasting')}
             >
               <Text style={styles.cardButtonText}>View Forecast</Text>
             </TouchableOpacity>
           </View>

                     <View style={styles.card}>
             <Text style={styles.cardTitle}>Inventory Management</Text>
             <Text style={styles.cardDescription}>
               Manage stock levels and inventory
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('Inventory')}
             >
               <Text style={styles.cardButtonText}>Manage Inventory</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>Inventory Analytics</Text>
             <Text style={styles.cardDescription}>
               Advanced analytics, turnover analysis, and performance insights
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('InventoryAnalytics')}
             >
               <Text style={styles.cardButtonText}>View Analytics</Text>
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

                     <View style={styles.card}>
             <Text style={styles.cardTitle}>Reports & Analytics</Text>
             <Text style={styles.cardDescription}>
               Generate comprehensive business reports and export data
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('ReportsDashboard')}
             >
               <Text style={styles.cardButtonText}>View Reports</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>User Management</Text>
             <Text style={styles.cardDescription}>
               Manage users, roles, and permissions
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('UserManagement')}
             >
               <Text style={styles.cardButtonText}>Manage Users</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>User Activity Log</Text>
             <Text style={styles.cardDescription}>
               Monitor user activities and system events
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('UserActivity')}
             >
               <Text style={styles.cardButtonText}>View Activity</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>Permission Management</Text>
             <Text style={styles.cardDescription}>
               Configure role-based access controls and permissions
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('PermissionManagement')}
             >
               <Text style={styles.cardButtonText}>Manage Permissions</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>Security Settings</Text>
             <Text style={styles.cardDescription}>
               Configure security policies, password requirements, and access controls
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('SecuritySettings')}
             >
               <Text style={styles.cardButtonText}>Security Settings</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>Advanced Analytics</Text>
             <Text style={styles.cardDescription}>
               Real-time business intelligence, predictive analytics, and performance insights
             </Text>
             <TouchableOpacity 
               style={styles.cardButton}
               onPress={() => navigation.navigate('AdvancedAnalytics')}
             >
               <Text style={styles.cardButtonText}>View Analytics</Text>
             </TouchableOpacity>
           </View>

           <View style={styles.card}>
             <Text style={styles.cardTitle}>System Settings</Text>
             <Text style={styles.cardDescription}>
               Configure system-wide settings
             </Text>
             <TouchableOpacity style={styles.cardButton}>
               <Text style={styles.cardButtonText}>Settings</Text>
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
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
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
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminDashboard;
