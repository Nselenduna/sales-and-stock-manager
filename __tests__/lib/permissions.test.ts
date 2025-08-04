/**
 * Role Management Tests
 * Comprehensive tests for role-based access control system
 */

import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  canManageUser,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY
} from '../../lib/permissions';

describe('Role-Based Access Control System', () => {
  describe('Permission Checking', () => {
    test('hasPermission should correctly identify admin permissions', () => {
      expect(hasPermission('admin', 'sales:view')).toBe(true);
      expect(hasPermission('admin', 'users:assign_roles')).toBe(true);
      expect(hasPermission('admin', 'system:settings')).toBe(true);
    });

    test('hasPermission should correctly identify manager permissions', () => {
      expect(hasPermission('manager', 'sales:view')).toBe(true);
      expect(hasPermission('manager', 'sales:create')).toBe(true);
      expect(hasPermission('manager', 'inventory:edit')).toBe(true);
      expect(hasPermission('manager', 'users:assign_roles')).toBe(false);
      expect(hasPermission('manager', 'system:settings')).toBe(false);
    });

    test('hasPermission should correctly identify cashier permissions', () => {
      expect(hasPermission('cashier', 'sales:view')).toBe(true);
      expect(hasPermission('cashier', 'sales:create')).toBe(true);
      expect(hasPermission('cashier', 'sales:delete')).toBe(false);
      expect(hasPermission('cashier', 'inventory:view')).toBe(true);
      expect(hasPermission('cashier', 'inventory:edit')).toBe(false);
      expect(hasPermission('cashier', 'users:view')).toBe(false);
    });

    test('hasPermission should return false for null role', () => {
      expect(hasPermission(null, 'sales:view')).toBe(false);
      expect(hasPermission(null, 'users:view')).toBe(false);
    });

    test('hasAnyPermission should work correctly', () => {
      expect(hasAnyPermission('cashier', ['sales:view', 'users:view'])).toBe(true);
      expect(hasAnyPermission('cashier', ['users:view', 'system:settings'])).toBe(false);
      expect(hasAnyPermission('manager', ['inventory:edit', 'system:backup'])).toBe(true);
    });

    test('hasAllPermissions should work correctly', () => {
      expect(hasAllPermissions('admin', ['sales:view', 'users:view'])).toBe(true);
      expect(hasAllPermissions('cashier', ['sales:view', 'inventory:view'])).toBe(true);
      expect(hasAllPermissions('cashier', ['sales:view', 'users:view'])).toBe(false);
      expect(hasAllPermissions('manager', ['sales:view', 'system:settings'])).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    test('canManageUser should respect role hierarchy', () => {
      expect(canManageUser('admin', 'manager')).toBe(true);
      expect(canManageUser('admin', 'cashier')).toBe(true);
      expect(canManageUser('manager', 'cashier')).toBe(true);
      expect(canManageUser('manager', 'admin')).toBe(false);
      expect(canManageUser('cashier', 'manager')).toBe(false);
      expect(canManageUser('cashier', 'admin')).toBe(false);
    });

    test('canManageUser should not allow managing same level roles', () => {
      expect(canManageUser('admin', 'admin')).toBe(false);
      expect(canManageUser('manager', 'manager')).toBe(false);
      expect(canManageUser('cashier', 'cashier')).toBe(false);
    });

    test('canManageUser should return false for null role', () => {
      expect(canManageUser(null, 'cashier')).toBe(false);
      expect(canManageUser(null, 'manager')).toBe(false);
      expect(canManageUser(null, 'admin')).toBe(false);
    });
  });

  describe('Role Permissions Configuration', () => {
    test('admin role should have all permissions', () => {
      const adminPermissions = ROLE_PERMISSIONS.admin;
      expect(adminPermissions.includes('sales:view')).toBe(true);
      expect(adminPermissions.includes('sales:delete')).toBe(true);
      expect(adminPermissions.includes('users:assign_roles')).toBe(true);
      expect(adminPermissions.includes('system:settings')).toBe(true);
    });

    test('manager role should have appropriate permissions', () => {
      const managerPermissions = ROLE_PERMISSIONS.manager;
      expect(managerPermissions.includes('sales:view')).toBe(true);
      expect(managerPermissions.includes('sales:create')).toBe(true);
      expect(managerPermissions.includes('inventory:edit')).toBe(true);
      expect(managerPermissions.includes('users:assign_roles')).toBe(false);
      expect(managerPermissions.includes('system:settings')).toBe(false);
    });

    test('cashier role should have limited permissions', () => {
      const cashierPermissions = ROLE_PERMISSIONS.cashier;
      expect(cashierPermissions.includes('sales:view')).toBe(true);
      expect(cashierPermissions.includes('sales:create')).toBe(true);
      expect(cashierPermissions.includes('sales:delete')).toBe(false);
      expect(cashierPermissions.includes('inventory:view')).toBe(true);
      expect(cashierPermissions.includes('inventory:edit')).toBe(false);
      expect(cashierPermissions.includes('users:view')).toBe(false);
    });

    test('role hierarchy values should be correct', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.manager);
      expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.cashier);
      expect(ROLE_HIERARCHY.admin).toBe(3);
      expect(ROLE_HIERARCHY.manager).toBe(2);
      expect(ROLE_HIERARCHY.cashier).toBe(1);
    });
  });

  describe('Permission Categories', () => {
    test('should have all required permission categories', () => {
      const { PERMISSION_CATEGORIES } = require('../../lib/permissions');
      
      expect(PERMISSION_CATEGORIES.sales).toBeDefined();
      expect(PERMISSION_CATEGORIES.inventory).toBeDefined();
      expect(PERMISSION_CATEGORIES.users).toBeDefined();
      expect(PERMISSION_CATEGORIES.reports).toBeDefined();
      expect(PERMISSION_CATEGORIES.system).toBeDefined();
    });

    test('permission categories should have proper structure', () => {
      const { PERMISSION_CATEGORIES } = require('../../lib/permissions');
      
      Object.entries(PERMISSION_CATEGORIES).forEach(([_key, category]) => {
        expect(category).toHaveProperty('label');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('icon');
        expect(category).toHaveProperty('permissions');
        expect(Array.isArray(category.permissions)).toBe(true);
      });
    });
  });
});