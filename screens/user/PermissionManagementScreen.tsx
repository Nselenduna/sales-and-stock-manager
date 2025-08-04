import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'inventory' | 'users' | 'reports' | 'system';
}

interface RolePermission {
  role: string;
  permissions: { [key: string]: boolean };
}

interface PermissionManagementScreenProps {
  navigation: any;
}

const PermissionManagementScreen: React.FC<PermissionManagementScreenProps> = ({
  navigation,
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [loading, setLoading] = useState(true);

  const roles = [
    { key: 'admin', label: 'Administrator', color: '#dc2626' },
    { key: 'manager', label: 'Manager', color: '#ea580c' },
    { key: 'staff', label: 'Staff', color: '#2563eb' },
    { key: 'viewer', label: 'Viewer', color: '#059669' },
  ];

  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = () => {
    // Define all available permissions
    const allPermissions: Permission[] = [
      // Sales permissions
      {
        id: 'sales_view',
        name: 'View Sales',
        description: 'View sales records and history',
        category: 'sales',
      },
      {
        id: 'sales_create',
        name: 'Create Sales',
        description: 'Create new sales transactions',
        category: 'sales',
      },
      {
        id: 'sales_edit',
        name: 'Edit Sales',
        description: 'Modify existing sales records',
        category: 'sales',
      },
      {
        id: 'sales_delete',
        name: 'Delete Sales',
        description: 'Delete sales records',
        category: 'sales',
      },
      {
        id: 'sales_refund',
        name: 'Process Refunds',
        description: 'Process customer refunds',
        category: 'sales',
      },

      // Inventory permissions
      {
        id: 'inventory_view',
        name: 'View Inventory',
        description: 'View product inventory',
        category: 'inventory',
      },
      {
        id: 'inventory_create',
        name: 'Add Products',
        description: 'Add new products to inventory',
        category: 'inventory',
      },
      {
        id: 'inventory_edit',
        name: 'Edit Products',
        description: 'Modify product information',
        category: 'inventory',
      },
      {
        id: 'inventory_delete',
        name: 'Delete Products',
        description: 'Remove products from inventory',
        category: 'inventory',
      },
      {
        id: 'inventory_adjust',
        name: 'Adjust Stock',
        description: 'Adjust product quantities',
        category: 'inventory',
      },

      // User management permissions
      {
        id: 'users_view',
        name: 'View Users',
        description: 'View user list and profiles',
        category: 'users',
      },
      {
        id: 'users_create',
        name: 'Create Users',
        description: 'Create new user accounts',
        category: 'users',
      },
      {
        id: 'users_edit',
        name: 'Edit Users',
        description: 'Modify user information and roles',
        category: 'users',
      },
      {
        id: 'users_delete',
        name: 'Delete Users',
        description: 'Remove user accounts',
        category: 'users',
      },
      {
        id: 'users_permissions',
        name: 'Manage Permissions',
        description: 'Manage user permissions and roles',
        category: 'users',
      },

      // Reports permissions
      {
        id: 'reports_view',
        name: 'View Reports',
        description: 'Access to view reports and analytics',
        category: 'reports',
      },
      {
        id: 'reports_export',
        name: 'Export Reports',
        description: 'Export reports to various formats',
        category: 'reports',
      },
      {
        id: 'reports_create',
        name: 'Create Reports',
        description: 'Create custom reports',
        category: 'reports',
      },

      // System permissions
      {
        id: 'system_settings',
        name: 'System Settings',
        description: 'Access to system configuration',
        category: 'system',
      },
      {
        id: 'system_backup',
        name: 'System Backup',
        description: 'Perform system backups',
        category: 'system',
      },
      {
        id: 'system_logs',
        name: 'View Logs',
        description: 'Access system and activity logs',
        category: 'system',
      },
    ];

    setPermissions(allPermissions);

    // Initialize role permissions with default values
    const defaultRolePermissions: RolePermission[] = roles.map(role => ({
      role: role.key,
      permissions: allPermissions.reduce(
        (acc, permission) => {
          // Set default permissions based on role
          switch (role.key) {
            case 'admin':
              acc[permission.id] = true; // Admins have all permissions
              break;
            case 'manager':
              acc[permission.id] = [
                'sales_view',
                'sales_create',
                'sales_edit',
                'sales_refund',
                'inventory_view',
                'inventory_create',
                'inventory_edit',
                'inventory_adjust',
                'users_view',
                'reports_view',
                'reports_export',
                'system_logs',
              ].includes(permission.id);
              break;
            case 'staff':
              acc[permission.id] = [
                'sales_view',
                'sales_create',
                'inventory_view',
                'inventory_adjust',
                'reports_view',
              ].includes(permission.id);
              break;
            case 'viewer':
              acc[permission.id] = [
                'sales_view',
                'inventory_view',
                'reports_view',
              ].includes(permission.id);
              break;
            default:
              acc[permission.id] = false;
          }
          return acc;
        },
        {} as { [key: string]: boolean }
      ),
    }));

    setRolePermissions(defaultRolePermissions);
    setLoading(false);
  };

  const handlePermissionToggle = (permissionId: string, enabled: boolean) => {
    setRolePermissions(prev =>
      prev.map(rolePerm =>
        rolePerm.role === selectedRole
          ? {
              ...rolePerm,
              permissions: {
                ...rolePerm.permissions,
                [permissionId]: enabled,
              },
            }
          : rolePerm
      )
    );
  };

  const savePermissions = async () => {
    try {
      // In a real implementation, you would save these to your database
      // For now, we'll just show a success message
      Alert.alert('Success', 'Permissions updated successfully!', [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Error saving permissions:', error);
      Alert.alert('Error', 'Failed to save permissions');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales':
        return 'receipt';
      case 'inventory':
        return 'inventory';
      case 'users':
        return 'users';
      case 'reports':
        return 'bar-chart';
      case 'system':
        return 'settings';
      default:
        return 'info';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales':
        return '#059669';
      case 'inventory':
        return '#2563eb';
      case 'users':
        return '#dc2626';
      case 'reports':
        return '#ea580c';
      case 'system':
        return '#7c3aed';
      default:
        return '#6b7280';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'sales':
        return 'Sales';
      case 'inventory':
        return 'Inventory';
      case 'users':
        return 'Users';
      case 'reports':
        return 'Reports';
      case 'system':
        return 'System';
      default:
        return category;
    }
  };

  const currentRolePermissions =
    rolePermissions.find(rp => rp.role === selectedRole)?.permissions || {};

  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as { [key: string]: Permission[] }
  );

  const renderPermissionItem = ({ item }: { item: Permission }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionName}>{item.name}</Text>
        <Text style={styles.permissionDescription}>{item.description}</Text>
      </View>
      <Switch
        value={currentRolePermissions[item.id] || false}
        onValueChange={value => handlePermissionToggle(item.id, value)}
        trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
        thumbColor={currentRolePermissions[item.id] ? '#ffffff' : '#f4f3f4'}
      />
    </View>
  );

  const renderCategorySection = (
    category: string,
    categoryPermissions: Permission[]
  ) => (
    <View key={category} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Icon
          name={getCategoryIcon(category)}
          size={20}
          color={getCategoryColor(category)}
        />
        <Text
          style={[styles.categoryTitle, { color: getCategoryColor(category) }]}
        >
          {getCategoryLabel(category)}
        </Text>
      </View>
      {categoryPermissions.map(permission => (
        <View key={permission.id} style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>{permission.name}</Text>
            <Text style={styles.permissionDescription}>
              {permission.description}
            </Text>
          </View>
          <Switch
            value={currentRolePermissions[permission.id] || false}
            onValueChange={value =>
              handlePermissionToggle(permission.id, value)
            }
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor={
              currentRolePermissions[permission.id] ? '#ffffff' : '#f4f3f4'
            }
          />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name='arrow-back' size={24} color='white' />
        </TouchableOpacity>
        <Text style={styles.title}>Permission Management</Text>
        <TouchableOpacity style={styles.saveButton} onPress={savePermissions}>
          <Icon name='save' size={24} color='white' />
        </TouchableOpacity>
      </View>

      <View style={styles.roleSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {roles.map(role => (
            <TouchableOpacity
              key={role.key}
              style={[
                styles.roleButton,
                selectedRole === role.key && styles.roleButtonActive,
                { borderColor: role.color },
              ]}
              onPress={() => setSelectedRole(role.key)}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  selectedRole === role.key && styles.roleButtonTextActive,
                  { color: selectedRole === role.key ? 'white' : role.color },
                ]}
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.values(currentRolePermissions).filter(Boolean).length}
          </Text>
          <Text style={styles.statLabel}>Active Permissions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{permissions.length}</Text>
          <Text style={styles.statLabel}>Total Permissions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.keys(groupedPermissions).length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      <ScrollView style={styles.permissionsContainer}>
        {Object.entries(groupedPermissions).map(
          ([category, categoryPermissions]) =>
            renderCategorySection(category, categoryPermissions)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#059669',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelector: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  roleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  roleButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  permissionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  permissionInfo: {
    flex: 1,
    marginRight: 16,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default PermissionManagementScreen;
