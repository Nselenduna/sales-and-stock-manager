import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import useAuthStore from '../store/authStore';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Dashboard Screens
import AdminDashboard from '../screens/dashboard/AdminDashboard';
import StaffDashboard from '../screens/dashboard/StaffDashboard';
import ViewerDashboard from '../screens/dashboard/ViewerDashboard';

// Inventory Screens
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import InventoryDetailScreen from '../screens/inventory/InventoryDetailScreen';
import InventoryFormScreen from '../screens/inventory/InventoryFormScreen';

// Scanner Screen
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';

// Dashboard Screens
import StockAlertScreen from '../screens/StockAlertScreen';

// Sales Screens
import SalesScreen from '../screens/sales/SalesScreen';
import SalesHistoryScreen from '../screens/sales/SalesHistoryScreen';
import SalesAnalyticsScreen from '../screens/sales/SalesAnalyticsScreen';
import CustomerManagementScreen from '../screens/sales/CustomerManagementScreen';
import InventoryAnalyticsScreen from '../screens/inventory/InventoryAnalyticsScreen';
import SalesForecastingScreen from '../screens/sales/SalesForecastingScreen';
import ReportsDashboardScreen from '../screens/reports/ReportsDashboardScreen';

// User Management Screens
import UserManagementScreen from '../screens/user/UserManagementScreen';
import UserActivityScreen from '../screens/user/UserActivityScreen';
import PermissionManagementScreen from '../screens/user/PermissionManagementScreen';

// Security Screens
import SecuritySettingsScreen from '../screens/security/SecuritySettingsScreen';

// Other Screens
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Simple Icon Component for React Native
const TabIcon = ({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) => {
  const getIconSymbol = (iconName: string) => {
    const icons: { [key: string]: string } = {
      settings: '⚙️',
      cube: '📦',
      person: '👤',
      eye: '👁️',
      add: '➕',
    };
    return icons[iconName] || '❓';
  };

  return <Text style={{ fontSize: size, color }}>{getIconSymbol(name)}</Text>;
};

// Admin Tab Navigator
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'settings';
          if (route.name === 'Inventory') {
            iconName = 'cube';
          }
          return <TabIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name='Admin'
        component={AdminDashboard}
        options={{ title: 'Admin' }}
      />
      <Tab.Screen
        name='Inventory'
        component={InventoryListScreen}
        options={{ title: 'Inventory' }}
      />
    </Tab.Navigator>
  );
};

// Staff Tab Navigator
const StaffTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'person';
          if (route.name === 'Inventory') {
            iconName = 'cube';
          }
          return <TabIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name='Staff'
        component={StaffDashboard}
        options={{ title: 'Staff' }}
      />
      <Tab.Screen
        name='Inventory'
        component={InventoryListScreen}
        options={{ title: 'Inventory' }}
      />
    </Tab.Navigator>
  );
};

// Viewer Tab Navigator
const ViewerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'eye';
          if (route.name === 'Inventory') {
            iconName = 'cube';
          }
          return <TabIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name='Viewer'
        component={ViewerDashboard}
        options={{ title: 'Viewer' }}
      />
      <Tab.Screen
        name='Inventory'
        component={InventoryListScreen}
        options={{ title: 'Inventory' }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user, loading, isAuthenticated, userRole } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name='Login' component={LoginScreen} />
          <Stack.Screen name='Register' component={RegisterScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Main role-based screens */}
        {userRole === 'admin' && (
          <Stack.Screen name='AdminMain' component={AdminTabNavigator} />
        )}
        {userRole === 'staff' && (
          <Stack.Screen name='StaffMain' component={StaffTabNavigator} />
        )}
        {userRole === 'viewer' && (
          <Stack.Screen name='ViewerMain' component={ViewerTabNavigator} />
        )}

        {/* Inventory screens - accessible from any role */}
        <Stack.Screen
          name='AddProduct'
          component={InventoryFormScreen}
          options={{
            headerShown: true,
            title: 'Add Product',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name='EditProduct'
          component={InventoryFormScreen}
          options={{
            headerShown: true,
            title: 'Edit Product',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name='ProductDetail'
          component={InventoryDetailScreen}
          options={{
            headerShown: true,
            title: 'Product Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name='BarcodeScanner'
          component={BarcodeScannerScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name='StockAlerts'
          component={StockAlertScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='Sales'
          component={SalesScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='SalesHistory'
          component={SalesHistoryScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='SalesAnalytics'
          component={SalesAnalyticsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='CustomerManagement'
          component={CustomerManagementScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='InventoryAnalytics'
          component={InventoryAnalyticsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='SalesForecasting'
          component={SalesForecastingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='ReportsDashboard'
          component={ReportsDashboardScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='UserManagement'
          component={UserManagementScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='UserActivity'
          component={UserActivityScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='PermissionManagement'
          component={PermissionManagementScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='SecuritySettings'
          component={SecuritySettingsScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
