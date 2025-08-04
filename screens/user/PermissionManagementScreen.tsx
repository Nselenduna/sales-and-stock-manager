import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { 
  Permission, 
  UserRole, 
  ROLE_PERMISSIONS, 
  ROLE_LABELS, 
  ROLE_COLORS,
  PERMISSION_CATEGORIES,
  PERMISSION_DESCRIPTIONS,
  hasPermission
} from '../../lib/permissions';
import Icon from '../../components/Icon';

interface RolePermissionState {
  role: UserRole;
  permissions: { [key in Permission]?: boolean };
}

interface PermissionManagementScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const PermissionManagementScreen: React.FC<PermissionManagementScreenProps> = ({
  navigation,
}) => {
  const { userRole } = useAuthStore();
  const [rolePermissions, setRolePermissions] = useState<RolePermissionState[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const availableRoles: { key: UserRole; label: string; color: string }[] = [
    { key: 'admin', label: ROLE_LABELS.admin, color: ROLE_COLORS.admin },
    { key: 'manager', label: ROLE_LABELS.manager, color: ROLE_COLORS.manager },
    { key: 'cashier', label: ROLE_LABELS.cashier, color: ROLE_COLORS.cashier },
  ];

  // Check if current user has permission to manage permissions
  const canManagePermissions = hasPermission(userRole, 'users:assign_roles');

  useEffect(() => {
    if (!canManagePermissions) {
      Alert.alert('Access Denied', 'You do not have permission to manage permissions');
      navigation.goBack();
      return;
    }
    initializePermissions();
  }, [canManagePermissions, navigation]);

  const initializePermissions = () => {
    // Initialize role permissions with actual permission definitions
    const initialRolePermissions: RolePermissionState[] = availableRoles.map(role => ({
      role: role.key,
      permissions: Object.values(PERMISSION_CATEGORIES)
        .flatMap(category => category.permissions)
        .reduce((acc, permission) => {
          acc[permission] = ROLE_PERMISSIONS[role.key]?.includes(permission) ?? false;
          return acc;
        }, {} as { [key in Permission]?: boolean })
    }));

    setRolePermissions(initialRolePermissions);
  };

  const handlePermissionToggle = (permission: Permission, enabled: boolean) => {
    setRolePermissions(prev => 
      prev.map(rolePerm => 
        rolePerm.role === selectedRole 
          ? {
              ...rolePerm,
              permissions: {
                ...rolePerm.permissions,
                [permission]: enabled
              }
            }
          : rolePerm
      )
    );
  };

  const savePermissions = async () => {
    try {
      // In a real implementation, you would save these to your database
      // For now, we'll just show a success message
      Alert.alert(
        'Success', 
        'Permissions updated successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving permissions:', error);
      Alert.alert('Error', 'Failed to save permissions');
    }
  };

  const getCurrentRolePermissions = () => {
    return rolePermissions.find(rp => rp.role === selectedRole)?.permissions || {};
  };

  const renderCategorySection = (categoryKey: string, category: typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES]) => {
    const currentPermissions = getCurrentRolePermissions();
    
    return (
      <View key={categoryKey} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Icon 
            name={category.icon} 
            size={20} 
            color={category.color} 
          />
          <Text style={[styles.categoryTitle, { color: category.color }]}>
            {category.label}
          </Text>
        </View>
        {category.permissions.map(permission => (
          <View key={permission} style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>
                {permission.split(':')[1].charAt(0).toUpperCase() + permission.split(':')[1].slice(1)}
              </Text>
              <Text style={styles.permissionDescription}>
                {PERMISSION_DESCRIPTIONS[permission]}
              </Text>
            </View>
            <Switch
              value={currentPermissions[permission] || false}
              onValueChange={(value) => handlePermissionToggle(permission, value)}
              trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
              thumbColor={currentPermissions[permission] ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Permission Management</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={savePermissions}
        >
          <Icon name="save" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.roleSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableRoles.map((role) => (
            <TouchableOpacity
              key={role.key}
              style={[
                styles.roleButton,
                selectedRole === role.key && styles.roleButtonActive,
                { borderColor: role.color }
              ]}
              onPress={() => setSelectedRole(role.key)}
            >
              <Text style={[
                styles.roleButtonText,
                selectedRole === role.key && styles.roleButtonTextActive,
                selectedRole === role.key ? styles.roleButtonTextWhite : { color: role.color }
              ]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.values(getCurrentRolePermissions()).filter(Boolean).length}
          </Text>
          <Text style={styles.statLabel}>Active Permissions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.values(PERMISSION_CATEGORIES).flatMap(c => c.permissions).length}
          </Text>
          <Text style={styles.statLabel}>Total Permissions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Object.keys(PERMISSION_CATEGORIES).length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      <ScrollView style={styles.permissionsContainer}>
        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) =>
          renderCategorySection(categoryKey, category)
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
  roleButtonTextWhite: {
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