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
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  full_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserManagementScreenProps {
  navigation: any;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  navigation,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'staff' as const,
  });

  const roles = [
    { key: 'admin', label: 'Administrator', color: '#dc2626' },
    { key: 'manager', label: 'Manager', color: '#ea580c' },
    { key: 'staff', label: 'Staff', color: '#2563eb' },
    { key: 'viewer', label: 'Viewer', color: '#059669' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to manage users');
        return;
      }

      // For now, we'll create mock user data since admin API requires special permissions
      // In a production environment, you would need to set up proper admin access
      const mockUsers: User[] = [
        {
          id: user.id,
          email: user.email || '',
          role: 'admin',
          full_name: 'Admin User',
          phone: '+1234567890',
          is_active: true,
          created_at: user.created_at || new Date().toISOString(),
          last_login: user.last_sign_in_at || new Date().toISOString(),
        },
        {
          id: 'mock-user-1',
          email: 'manager@example.com',
          role: 'manager',
          full_name: 'Manager User',
          phone: '+1234567891',
          is_active: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          last_login: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-user-2',
          email: 'staff@example.com',
          role: 'staff',
          full_name: 'Staff User',
          phone: '+1234567892',
          is_active: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          last_login: new Date(Date.now() - 7200000).toISOString(),
        },
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      Alert.alert('Error', 'Email and full name are required');
      return;
    }

    try {
      // For now, we'll simulate user creation since admin API requires special permissions
      // In a production environment, you would need to set up proper admin access
      const mockNewUser: User = {
        id: `mock-user-${Date.now()}`,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name,
        phone: newUser.phone,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
      };

      setUsers(prev => [...prev, mockNewUser]);
      Alert.alert(
        'Success',
        'User created successfully (mock data). In production, they would receive an email to set their password.'
      );
      setShowAddUserModal(false);
      setNewUser({ email: '', full_name: '', phone: '', role: 'staff' });
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'User role updated successfully');
      setShowEditUserModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { is_active: isActive },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        `User ${isActive ? 'activated' : 'deactivated'} successfully`
      );
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(
    user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const roleInfo = roles.find(r => r.key === role);
    return roleInfo?.color || '#6b7280';
  };

  const getRoleLabel = (role: string) => {
    const roleInfo = roles.find(r => r.key === role);
    return roleInfo?.label || role;
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.full_name || 'No name'}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(item.role) },
            ]}
          >
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
        <TouchableOpacity
          style={[
            styles.statusButton,
            { backgroundColor: item.is_active ? '#059669' : '#dc2626' },
          ]}
          onPress={() => handleToggleUserStatus(item.id, !item.is_active)}
        >
          <Text style={styles.statusButtonText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setSelectedUser(item);
            setShowEditUserModal(true);
          }}
        >
          <Icon name='edit' size={16} color='#2563eb' />
        </TouchableOpacity>
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
          <Icon name='arrow-back' size={24} color='white' />
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddUserModal(true)}
        >
          <Icon name='add' size={24} color='white' />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name='search' size={20} color='#6b7280' />
        <TextInput
          style={styles.searchInput}
          placeholder='Search users...'
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
        keyExtractor={item => item.id}
        style={styles.userList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name='users' size={48} color='#9ca3af' />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Add User Modal */}
      <Modal
        visible={showAddUserModal}
        animationType='slide'
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New User</Text>

            <TextInput
              style={styles.input}
              placeholder='Email'
              value={newUser.email}
              onChangeText={text => setNewUser({ ...newUser, email: text })}
              keyboardType='email-address'
              autoCapitalize='none'
            />

            <TextInput
              style={styles.input}
              placeholder='Full Name'
              value={newUser.full_name}
              onChangeText={text => setNewUser({ ...newUser, full_name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder='Phone (optional)'
              value={newUser.phone}
              onChangeText={text => setNewUser({ ...newUser, phone: text })}
              keyboardType='phone-pad'
            />

            <Text style={styles.label}>Role:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.roleSelector}>
                {roles.map(role => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      newUser.role === role.key && styles.roleOptionSelected,
                    ]}
                    onPress={() =>
                      setNewUser({ ...newUser, role: role.key as any })
                    }
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUser.role === role.key &&
                          styles.roleOptionTextSelected,
                      ]}
                    >
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
        animationType='slide'
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

                <Text style={styles.label}>
                  Current Role: {getRoleLabel(selectedUser.role)}
                </Text>

                <Text style={styles.label}>Change to:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.roleSelector}>
                    {roles.map(role => (
                      <TouchableOpacity
                        key={role.key}
                        style={[
                          styles.roleOption,
                          selectedUser.role === role.key &&
                            styles.roleOptionSelected,
                        ]}
                        onPress={() =>
                          handleUpdateUserRole(selectedUser.id, role.key)
                        }
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            selectedUser.role === role.key &&
                              styles.roleOptionTextSelected,
                          ]}
                        >
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
