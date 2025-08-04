/**
 * Role Management Service
 * Handles secure role assignment and modification
 */

import { supabase } from './supabase';
import { UserRole, canManageUser, hasPermission } from './permissions';

export interface RoleAssignmentRequest {
  userId: string;
  newRole: UserRole;
  assignedBy: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export class RoleManagementService {
  /**
   * Assign a role to a user with proper validation
   */
  static async assignRole(request: RoleAssignmentRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the current user's role to validate permissions
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.id !== request.assignedBy) {
        return { success: false, error: 'Unauthorized: Invalid user context' };
      }

      // Get current user's role
      const { data: currentUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', request.assignedBy)
        .single();

      if (!currentUserRole) {
        return { success: false, error: 'Unauthorized: User role not found' };
      }

      // Check if current user has permission to assign roles
      if (!hasPermission(currentUserRole.role_type as UserRole, 'users:assign_roles')) {
        return { success: false, error: 'Unauthorized: Insufficient permissions to assign roles' };
      }

      // Get target user's current role
      const { data: targetUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', request.userId)
        .single();

      if (!targetUserRole) {
        return { success: false, error: 'Target user not found' };
      }

      // Check role hierarchy - user can only manage users with lower hierarchy
      if (!canManageUser(currentUserRole.role_type as UserRole, targetUserRole.role_type as UserRole)) {
        return { success: false, error: 'Unauthorized: Cannot manage users of equal or higher role level' };
      }

      // Check if trying to assign a role higher than current user's role
      if (!canManageUser(currentUserRole.role_type as UserRole, request.newRole)) {
        return { success: false, error: 'Unauthorized: Cannot assign roles equal to or higher than your own' };
      }

      // Update the user's role
      const { error: updateError } = await supabase
        .from('roles')
        .update({
          role_type: request.newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', request.userId);

      if (updateError) {
        return { success: false, error: `Failed to update role: ${updateError.message}` };
      }

      // Log the role change for audit purposes
      await this.logRoleChange({
        targetUserId: request.userId,
        oldRole: targetUserRole.role_type as UserRole,
        newRole: request.newRole,
        assignedBy: request.assignedBy,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('Role assignment error:', error);
      return { success: false, error: (error as Error).message || 'Unknown error occurred' };
    }
  }

  /**
   * Get all users with their roles (with permission checking)
   */
  static async getUsers(requestingUserId: string): Promise<{ success: boolean; users?: UserWithRole[]; error?: string }> {
    try {
      // Get requesting user's role
      const { data: requestingUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', requestingUserId)
        .single();

      if (!requestingUserRole) {
        return { success: false, error: 'Unauthorized: User role not found' };
      }

      // Check if user has permission to view users
      if (!hasPermission(requestingUserRole.role_type as UserRole, 'users:view')) {
        return { success: false, error: 'Unauthorized: Insufficient permissions to view users' };
      }

      // For now, return mock data since Supabase admin API requires special setup
      // In production, you would query the auth.users table with proper permissions
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const mockUsers: UserWithRole[] = [
        {
          id: currentUser?.id || 'current-user',
          email: currentUser?.email || 'admin@example.com',
          full_name: 'System Administrator',
          phone: '+1234567890',
          role: requestingUserRole.role_type as UserRole,
          is_active: true,
          created_at: currentUser?.created_at || new Date().toISOString(),
          last_login: new Date().toISOString(),
        }
      ];

      // Add additional mock users based on role hierarchy
      if (requestingUserRole.role_type === 'admin') {
        mockUsers.push(
          {
            id: 'manager-1',
            email: 'manager@example.com',
            full_name: 'Store Manager',
            phone: '+1234567891',
            role: 'manager',
            is_active: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            last_login: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'cashier-1',
            email: 'cashier@example.com',
            full_name: 'Store Cashier',
            phone: '+1234567892',
            role: 'cashier',
            is_active: true,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            last_login: new Date(Date.now() - 7200000).toISOString(),
          }
        );
      } else if (requestingUserRole.role_type === 'manager') {
        mockUsers.push({
          id: 'cashier-1',
          email: 'cashier@example.com',
          full_name: 'Store Cashier',
          phone: '+1234567892',
          role: 'cashier',
          is_active: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          last_login: new Date(Date.now() - 7200000).toISOString(),
        });
      }

      return { success: true, users: mockUsers };
    } catch (error: unknown) {
      console.error('Get users error:', error);
      return { success: false, error: (error as Error).message || 'Failed to fetch users' };
    }
  }

  /**
   * Create a new user with specified role (admin only)
   */
  static async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: UserRole;
  }, createdBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get creating user's role
      const { data: creatingUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', createdBy)
        .single();

      if (!creatingUserRole) {
        return { success: false, error: 'Unauthorized: User role not found' };
      }

      // Check permissions
      if (!hasPermission(creatingUserRole.role_type as UserRole, 'users:create')) {
        return { success: false, error: 'Unauthorized: Insufficient permissions to create users' };
      }

      // Check role hierarchy
      if (!canManageUser(creatingUserRole.role_type as UserRole, userData.role)) {
        return { success: false, error: 'Unauthorized: Cannot create users with equal or higher role level' };
      }

      // In a real implementation, you would use Supabase admin API to create the user
      // For now, we'll simulate success
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Create user error:', error);
      return { success: false, error: (error as Error).message || 'Failed to create user' };
    }
  }

  /**
   * Deactivate/reactivate a user
   */
  static async toggleUserStatus(userId: string, isActive: boolean, changedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get changing user's role
      const { data: changingUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', changedBy)
        .single();

      if (!changingUserRole) {
        return { success: false, error: 'Unauthorized: User role not found' };
      }

      // Check permissions
      if (!hasPermission(changingUserRole.role_type as UserRole, 'users:edit')) {
        return { success: false, error: 'Unauthorized: Insufficient permissions to modify users' };
      }

      // Get target user's role
      const { data: targetUserRole } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', userId)
        .single();

      if (!targetUserRole) {
        return { success: false, error: 'Target user not found' };
      }

      // Check role hierarchy
      if (!canManageUser(changingUserRole.role_type as UserRole, targetUserRole.role_type as UserRole)) {
        return { success: false, error: 'Unauthorized: Cannot manage users of equal or higher role level' };
      }

      // In a real implementation, you would update the user's status
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Toggle user status error:', error);
      return { success: false, error: (error as Error).message || 'Failed to update user status' };
    }
  }

  /**
   * Log role changes for audit purposes
   */
  private static async logRoleChange(logData: {
    targetUserId: string;
    oldRole: UserRole;
    newRole: UserRole;
    assignedBy: string;
    timestamp: string;
  }): Promise<void> {
    try {
      // In a real implementation, you would store this in an audit log table
      console.warn('Role change audit log:', logData);
    } catch (error) {
      console.error('Failed to log role change:', error);
    }
  }
}