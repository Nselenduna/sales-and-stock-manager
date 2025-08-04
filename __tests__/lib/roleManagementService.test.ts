/**
 * Role Management Service Tests
 * Tests for secure role assignment and management functionality
 */

// Mock the supabase import at the top level
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
  },
}));

import { RoleManagementService } from '../../lib/roleManagementService';
import { supabase } from '../../lib/supabase';

describe('RoleManagementService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    test('should successfully assign role when user has permission', async () => {
      // Mock current user as admin
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } }
      });

      // Mock current user role query
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { role_type: 'admin' } }) // Current user role
              .mockResolvedValueOnce({ data: { role_type: 'cashier' } }) // Target user role
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.assignRole({
        userId: 'target-user-id',
        newRole: 'manager',
        assignedBy: 'admin-user-id'
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should fail when user lacks permission to assign roles', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'cashier-user-id' } }
      });

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'cashier' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.assignRole({
        userId: 'target-user-id',
        newRole: 'manager',
        assignedBy: 'cashier-user-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    test('should fail when trying to assign higher role than own role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'manager-user-id' } }
      });

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { role_type: 'manager' } }) // Current user role
              .mockResolvedValueOnce({ data: { role_type: 'cashier' } }) // Target user role
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.assignRole({
        userId: 'target-user-id',
        newRole: 'admin',
        assignedBy: 'manager-user-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot assign roles equal to or higher than your own');
    });

    test('should fail when trying to manage user of same or higher role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'manager-user-id' } }
      });

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { role_type: 'manager' } }) // Current user role
              .mockResolvedValueOnce({ data: { role_type: 'admin' } }) // Target user role
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.assignRole({
        userId: 'target-user-id',
        newRole: 'cashier',
        assignedBy: 'manager-user-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot manage users of equal or higher role level');
    });
  });

  describe('getUsers', () => {
    test('should return users when user has permission', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id', email: 'admin@example.com', created_at: '2023-01-01' } }
      });

      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'admin' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.getUsers('admin-user-id');

      expect(result.success).toBe(true);
      expect(result.users).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });

    test('should fail when user lacks permission to view users', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'cashier' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.getUsers('cashier-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('createUser', () => {
    test('should allow admin to create users', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'admin' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.createUser({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
        role: 'cashier'
      }, 'admin-user-id');

      expect(result.success).toBe(true);
    });

    test('should prevent non-admin from creating users', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'cashier' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.createUser({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
        role: 'cashier'
      }, 'cashier-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    test('should prevent manager from creating admin users', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'manager' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.createUser({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
        role: 'admin'
      }, 'manager-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot create users with equal or higher role level');
    });
  });

  describe('toggleUserStatus', () => {
    test('should allow admin to toggle user status', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { role_type: 'admin' } }) // Current user role
              .mockResolvedValueOnce({ data: { role_type: 'cashier' } }) // Target user role
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.toggleUserStatus('target-user-id', false, 'admin-user-id');

      expect(result.success).toBe(true);
    });

    test('should prevent unauthorized user status changes', async () => {
      const fromMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role_type: 'cashier' } })
          })
        })
      });
      mockSupabase.from.mockImplementation(fromMock);

      const result = await RoleManagementService.toggleUserStatus('target-user-id', false, 'cashier-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });
});