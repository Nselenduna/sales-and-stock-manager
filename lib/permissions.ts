/**
 * Role-based Access Control (RBAC) System
 * Manages user permissions and role-based access to features
 */

export type UserRole = 'admin' | 'manager' | 'cashier';

export type Permission = 
  // Sales permissions
  | 'sales:view'
  | 'sales:create'
  | 'sales:edit'
  | 'sales:delete'
  | 'sales:refund'
  
  // Inventory permissions
  | 'inventory:view'
  | 'inventory:create'
  | 'inventory:edit'
  | 'inventory:delete'
  | 'inventory:adjust'
  
  // User management permissions
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:assign_roles'
  
  // Reports permissions
  | 'reports:view'
  | 'reports:export'
  | 'reports:create'
  
  // System permissions
  | 'system:settings'
  | 'system:backup'
  | 'system:logs';

/**
 * Role permissions mapping
 * Defines what permissions each role has by default
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admins have all permissions
    'sales:view', 'sales:create', 'sales:edit', 'sales:delete', 'sales:refund',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete', 'inventory:adjust',
    'users:view', 'users:create', 'users:edit', 'users:delete', 'users:assign_roles',
    'reports:view', 'reports:export', 'reports:create',
    'system:settings', 'system:backup', 'system:logs'
  ],
  manager: [
    // Managers can manage sales, inventory, view reports, and manage lower-level users
    'sales:view', 'sales:create', 'sales:edit', 'sales:refund',
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:adjust',
    'users:view', 'users:create', 'users:edit', 'users:assign_roles',
    'reports:view', 'reports:export',
    'system:logs'
  ],
  cashier: [
    // Cashiers can handle sales and view inventory
    'sales:view', 'sales:create',
    'inventory:view',
    'reports:view'
  ]
};

/**
 * Check if a user role has a specific permission
 */
export const hasPermission = (userRole: UserRole | null, permission: Permission): boolean => {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
};

/**
 * Check if a user role has any of the specified permissions
 */
export const hasAnyPermission = (userRole: UserRole | null, permissions: Permission[]): boolean => {
  if (!userRole) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if a user role has all of the specified permissions
 */
export const hasAllPermissions = (userRole: UserRole | null, permissions: Permission[]): boolean => {
  if (!userRole) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Get all permissions for a user role
 */
export const getRolePermissions = (userRole: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * Role hierarchy - used for determining if a user can manage another user
 * Higher numbers indicate higher hierarchy level
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  cashier: 1
};

/**
 * Check if a user can manage another user based on role hierarchy
 */
export const canManageUser = (managerRole: UserRole | null, targetRole: UserRole): boolean => {
  if (!managerRole) return false;
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
};

/**
 * Get human-readable role names
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager', 
  cashier: 'Cashier'
};

/**
 * Get role colors for UI display
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#dc2626',     // Red
  manager: '#ea580c',   // Orange
  cashier: '#059669'    // Green
};

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  sales: {
    label: 'Sales',
    color: '#059669',
    icon: 'receipt',
    permissions: ['sales:view', 'sales:create', 'sales:edit', 'sales:delete', 'sales:refund'] as Permission[]
  },
  inventory: {
    label: 'Inventory',
    color: '#2563eb',
    icon: 'inventory',
    permissions: ['inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete', 'inventory:adjust'] as Permission[]
  },
  users: {
    label: 'Users',
    color: '#dc2626',
    icon: 'users',
    permissions: ['users:view', 'users:create', 'users:edit', 'users:delete', 'users:assign_roles'] as Permission[]
  },
  reports: {
    label: 'Reports',
    color: '#ea580c',
    icon: 'bar-chart',
    permissions: ['reports:view', 'reports:export', 'reports:create'] as Permission[]
  },
  system: {
    label: 'System',
    color: '#7c3aed',
    icon: 'settings',
    permissions: ['system:settings', 'system:backup', 'system:logs'] as Permission[]
  }
};

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'sales:view': 'View sales records and transactions',
  'sales:create': 'Create new sales transactions',
  'sales:edit': 'Modify existing sales records',
  'sales:delete': 'Delete sales records',
  'sales:refund': 'Process customer refunds',
  
  'inventory:view': 'View product inventory and stock levels',
  'inventory:create': 'Add new products to inventory',
  'inventory:edit': 'Modify product information and details',
  'inventory:delete': 'Remove products from inventory',
  'inventory:adjust': 'Adjust product quantities and stock levels',
  
  'users:view': 'View user list and profiles',
  'users:create': 'Create new user accounts',
  'users:edit': 'Modify user information and settings',
  'users:delete': 'Remove user accounts',
  'users:assign_roles': 'Assign and modify user roles',
  
  'reports:view': 'Access reports and analytics',
  'reports:export': 'Export reports to various formats',
  'reports:create': 'Create custom reports and analytics',
  
  'system:settings': 'Access system configuration and settings',
  'system:backup': 'Perform system backups and maintenance',
  'system:logs': 'View system and activity logs'
};