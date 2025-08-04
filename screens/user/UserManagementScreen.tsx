import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { RoleManagementService, UserWithRole } from '../../lib/roleManagementService';
import { UserRole, ROLE_LABELS, ROLE_COLORS, hasPermission } from '../../lib/permissions';
import Icon from '../../components/Icon';

interface UserManagementScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  };
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  navigation,
}) => {
  const { user, userRole } = useAuthStore();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'cashier' as UserRole,
  });

  const availableRoles: { key: UserRole; label: string; color: string }[] = [
    { key: 'admin', label: ROLE_LABELS.admin, color: ROLE_COLORS.admin },
    { key: 'manager', label: ROLE_LABELS.manager, color: ROLE_COLORS.manager },
    { key: 'cashier', label: ROLE_LABELS.cashier, color: ROLE_COLORS.cashier },
  ];

  // Check if current user has permissions for user management
  const canViewUsers = hasPermission(userRole, 'users:view');
  const canCreateUsers = hasPermission(userRole, 'users:create');
  const canEditUsers = hasPermission(userRole, 'users:edit');
  const canAssignRoles = hasPermission(userRole, 'users:assign_roles');

  useEffect(() => {
    if (!canViewUsers) {
      Alert.alert('Access Denied', 'You do not have permission to view users');
      navigation.goBack();
      return;
    }
    fetchUsers();
  }, [canViewUsers, navigation]);

  const fetchUsers = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to manage users');
      return;
    }

    try {
      setLoading(true);
      const result = await RoleManagementService.getUsers(user.id);
      
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    }
  };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      Alert.alert('Error', 'Email, full name, and password are required');
      return;
    }

    if (!canCreateUsers) {
      Alert.alert('Access Denied', 'You do not have permission to create users');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User context not available');
      return;
    }

    try {
      const result = await RoleManagementService.createUser(
        {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
        },
        user.id
      );

      if (result.success) {
        Alert.alert('Success', 'User created successfully! They will receive an email to activate their account.');
        setShowAddUserModal(false);
        setNewUser({ email: '', full_name: '', phone: '', password: '', role: 'cashier' });
        fetchUsers();
      } else {
        Alert.alert('Error', result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (!canAssignRoles) {
      Alert.alert('Access Denied', 'You do not have permission to assign roles');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User context not available');
      return;
    }

    try {
      const result = await RoleManagementService.assignRole({
        userId,
        newRole,
        assignedBy: user.id,
      });

      if (result.success) {
        Alert.alert('Success', 'User role updated successfully');
        setShowEditUserModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        Alert.alert('Error', result.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!canEditUsers) {
      Alert.alert('Access Denied', 'You do not have permission to modify users');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User context not available');
      return;
    }

    try {
      const result = await RoleManagementService.toggleUserStatus(userId, isActive, user.id);

      if (result.success) {
        Alert.alert('Success', `User ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      } else {
        Alert.alert('Error', result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: UserRole) => {
    return ROLE_COLORS[role] || '#6b7280';
  };

  const getRoleLabel = (role: UserRole) => {
    return ROLE_LABELS[role] || role;
  };

  const renderUserItem = ({ item }: { item: UserWithRole }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.full_name || 'No name'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{getRoleLabel(item.role)}</Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
        <Text style={styles.userDate}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.last_login && (
          <Text style={styles.userDate}>
            Last login: {new Date(item.last_login).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <View style={styles.userActions}>
        {canEditUsers && (
          <TouchableOpacity
            style={[
              styles.statusButton, 
              item.is_active ? styles.statusButtonActive : styles.statusButtonInactive
            ]}
            onPress={() => handleToggleUserStatus(item.id, !item.is_active)}
          >
            <Text style={styles.statusButtonText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        )}
        
        {canAssignRoles && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setSelectedUser(item);
              setShowEditUserModal(true);
            }}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        {canCreateUsers && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddUserModal(true)}
          >
            <Icon name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {users.filter(u => u.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {users.filter(u => u.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.userList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="users" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Add User Modal */}
      <Modal
        visible={showAddUserModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New User</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newUser.email}
              onChangeText={(text) => setNewUser({ ...newUser, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={newUser.full_name}
              onChangeText={(text) => setNewUser({ ...newUser, full_name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={newUser.password}
              onChangeText={(text) => setNewUser({ ...newUser, password: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={newUser.phone}
              onChangeText={(text) => setNewUser({ ...newUser, phone: text })}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.label}>Role:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.roleSelector}>
                {availableRoles.map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      newUser.role === role.key && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewUser({ ...newUser, role: role.key })}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      newUser.role === role.key && styles.roleOptionTextSelected,
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddUserModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddUser}
              >
                <Text style={styles.saveButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditUserModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User Role</Text>
            
            {selectedUser && (
              <>
                <Text style={styles.userInfoText}>
                  {selectedUser.full_name} ({selectedUser.email})
                </Text>
                
                <Text style={styles.label}>Current Role: {getRoleLabel(selectedUser.role)}</Text>
                
                <Text style={styles.label}>Change to:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.roleSelector}>
                    {availableRoles.map((role) => (
                      <TouchableOpacity
                        key={role.key}
                        style={[
                          styles.roleOption,
                          selectedUser.role === role.key && styles.roleOptionSelected,
                        ]}
                        onPress={() => handleUpdateUserRole(selectedUser.id, role.key)}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          selectedUser.role === role.key && styles.roleOptionTextSelected,
                        ]}>
                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: 8,
    backgroundColor: '#059669',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
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
  userList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusButtonActive: {
    backgroundColor: '#059669',
  },
  statusButtonInactive: {
    backgroundColor: '#dc2626',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  roleOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#64748b',
  },
  roleOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    marginLeft: 8,
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default UserManagementScreen; 