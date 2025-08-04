import { auditLogger } from '../../lib/auditLogger';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            eq: jest.fn(() => ({
              range: jest.fn(() => ({
                order: jest.fn(),
              })),
            })),
          })),
        })),
        order: jest.fn(),
      })),
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log a successful audit event', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      } as any);

      // Mock successful insert
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logEvent({
        action_type: 'LOGIN',
        entity_type: 'USER',
        description: 'User logged in successfully',
        success: true,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        user_email: 'test@example.com',
        action_type: 'LOGIN',
        entity_type: 'USER',
        entity_id: undefined,
        old_values: undefined,
        new_values: undefined,
        description: 'User logged in successfully',
        ip_address: undefined,
        user_agent: undefined,
        success: true,
        error_message: undefined,
      });
    });

    it('should handle failed login attempts', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logEvent({
        action_type: 'LOGIN_FAILED',
        entity_type: 'USER',
        description: 'Failed login attempt for test@example.com',
        success: false,
        error_message: 'Invalid credentials',
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'anonymous',
        user_email: undefined,
        action_type: 'LOGIN_FAILED',
        entity_type: 'USER',
        entity_id: undefined,
        old_values: undefined,
        new_values: undefined,
        description: 'Failed login attempt for test@example.com',
        ip_address: undefined,
        user_agent: undefined,
        success: false,
        error_message: 'Invalid credentials',
      });
    });

    it('should log stock adjustments with old and new values', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'admin@example.com',
          },
        },
        error: null,
      } as any);

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logEvent({
        action_type: 'STOCK_ADJUSTMENT',
        entity_type: 'PRODUCT',
        entity_id: 'product-456',
        old_values: { quantity: 10 },
        new_values: { quantity: 15 },
        description: 'Stock increased from 10 to 15',
        success: true,
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        user_email: 'admin@example.com',
        action_type: 'STOCK_ADJUSTMENT',
        entity_type: 'PRODUCT',
        entity_id: 'product-456',
        old_values: { quantity: 10 },
        new_values: { quantity: 15 },
        description: 'Stock increased from 10 to 15',
        ip_address: undefined,
        user_agent: undefined,
        success: true,
        error_message: undefined,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      } as any);

      const mockInsert = jest.fn().mockResolvedValue({ 
        error: { message: 'Database connection failed' } 
      });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await auditLogger.logEvent({
        action_type: 'LOGIN',
        entity_type: 'USER',
        description: 'User logged in',
        success: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to insert audit log:',
        { message: 'Database connection failed' }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      } as any);

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);
    });

    it('should log successful login', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logLogin('test@example.com', true);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'LOGIN',
          entity_type: 'USER',
          description: 'User logged in: test@example.com',
          success: true,
          error_message: undefined,
        })
      );
    });

    it('should log failed login', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logLogin('test@example.com', false, 'Invalid password');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'LOGIN_FAILED',
          entity_type: 'USER',
          description: 'User failed to log in: test@example.com',
          success: false,
          error_message: 'Invalid password',
        })
      );
    });

    it('should log role change', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logRoleChange('user-456', 'staff', 'admin');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'ROLE_CHANGE',
          entity_type: 'ROLE',
          entity_id: 'user-456',
          old_values: { role_type: 'staff' },
          new_values: { role_type: 'admin' },
          description: 'User role changed from staff to admin',
          success: true,
        })
      );
    });

    it('should log stock adjustment', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logStockAdjustment('product-123', 5, 10, 'Restocking');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'STOCK_ADJUSTMENT',
          entity_type: 'PRODUCT',
          entity_id: 'product-123',
          old_values: { quantity: 5 },
          new_values: { quantity: 10 },
          description: 'Stock adjusted: Restocking. Quantity changed from 5 to 10',
          success: true,
        })
      );
    });

    it('should log receipt generation', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const receiptData = { format: 'pdf', total: 29.99, customer: 'John Doe' };
      await auditLogger.logReceiptGeneration('sale-789', receiptData);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'RECEIPT_GENERATE',
          entity_type: 'RECEIPT',
          entity_id: 'sale-789',
          new_values: { receipt_data: receiptData },
          description: 'Receipt generated for sale sale-789',
          success: true,
        })
      );
    });

    it('should log permission denied', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await auditLogger.logPermissionDenied('DELETE', 'products');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'PERMISSION_DENIED',
          entity_type: 'SYSTEM',
          description: 'Permission denied: DELETE on products',
          success: false,
          error_message: 'Insufficient permissions',
        })
      );
    });
  });

  describe('hasAuditPermission', () => {
    it('should return true for admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
          },
        },
        error: null,
      } as any);

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { role_type: 'admin' },
            error: null,
          }),
        })),
      }));
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const hasPermission = await auditLogger.hasAuditPermission();
      expect(hasPermission).toBe(true);
    });

    it('should return false for staff users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'staff-123',
            email: 'staff@example.com',
          },
        },
        error: null,
      } as any);

      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { role_type: 'staff' },
            error: null,
          }),
        })),
      }));
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const hasPermission = await auditLogger.hasAuditPermission();
      expect(hasPermission).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const hasPermission = await auditLogger.hasAuditPermission();
      expect(hasPermission).toBe(false);
    });
  });

  describe('getLogs', () => {
    it('should retrieve logs with basic functionality', async () => {
      // For now, just test that the method exists and handles errors gracefully
      const { data, count, error } = await auditLogger.getLogs();
      
      expect(Array.isArray(data)).toBe(true);
      expect(typeof count).toBe('number');
      expect(error === undefined || typeof error === 'string').toBe(true);
    });
  });
});