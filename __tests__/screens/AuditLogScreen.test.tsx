import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AuditLogScreen from '../../screens/AuditLogScreen';
import { useAuthStore } from '../../store/authStore';
import { auditLogger } from '../../lib/auditLogger';

// Mock dependencies
jest.mock('../../store/authStore');
jest.mock('../../lib/auditLogger');
jest.mock('expo-file-system');
jest.mock('expo-sharing');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>;

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockAuditLogs = [
  {
    id: '1',
    user_id: 'user-123',
    user_email: 'admin@example.com',
    action_type: 'LOGIN' as const,
    entity_type: 'USER' as const,
    description: 'User logged in successfully',
    success: true,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-456',
    user_email: 'staff@example.com',
    action_type: 'STOCK_ADJUSTMENT' as const,
    entity_type: 'PRODUCT' as const,
    entity_id: 'product-123',
    old_values: { quantity: 10 },
    new_values: { quantity: 15 },
    description: 'Stock adjusted: Restocking. Quantity changed from 10 to 15',
    success: true,
    created_at: '2024-01-01T11:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-789',
    user_email: 'viewer@example.com',
    action_type: 'PERMISSION_DENIED' as const,
    entity_type: 'SYSTEM' as const,
    description: 'Permission denied: DELETE on products',
    success: false,
    error_message: 'Insufficient permissions',
    created_at: '2024-01-01T12:00:00Z',
  },
];

describe('AuditLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      userRole: 'admin',
      user: null,
      session: null,
      loading: false,
      isAuthenticated: true,
      setUser: jest.fn(),
      setSession: jest.fn(),
      setLoading: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      checkAuth: jest.fn(),
      checkUser: jest.fn(),
      getUserRole: jest.fn(),
    });
  });

  describe('Admin Access', () => {
    beforeEach(() => {
      mockAuditLogger.hasAuditPermission.mockResolvedValue(true);
      mockAuditLogger.getLogs.mockResolvedValue({
        data: mockAuditLogs,
        count: 3,
      });
    });

    it('should render audit logs for admin users', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(screen.getByText('Audit Logs')).toBeTruthy();
        expect(screen.getByText('User logged in successfully')).toBeTruthy();
        expect(screen.getByText('Stock adjusted: Restocking. Quantity changed from 10 to 15')).toBeTruthy();
        expect(screen.getByText('Permission denied: DELETE on products')).toBeTruthy();
      });

      expect(mockAuditLogger.hasAuditPermission).toHaveBeenCalled();
      expect(mockAuditLogger.getLogs).toHaveBeenCalledWith({});
    });

    it('should display filter and export buttons', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(screen.getByText('🔍 Filter')).toBeTruthy();
        expect(screen.getByText('📤 Export')).toBeTruthy();
      });
    });

    it('should open filter modal when filter button is pressed', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        const filterButton = screen.getByText('🔍 Filter');
        fireEvent.press(filterButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Filter Audit Logs')).toBeTruthy();
        expect(screen.getByText('Action Type')).toBeTruthy();
        expect(screen.getByText('Entity Type')).toBeTruthy();
        expect(screen.getByText('Success Status')).toBeTruthy();
      });
    });

    it('should show log details when log item is pressed', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        const logItem = screen.getByText('User logged in successfully');
        fireEvent.press(logItem);
      });

      await waitFor(() => {
        expect(screen.getByText('Audit Log Details')).toBeTruthy();
        expect(screen.getByText('LOGIN')).toBeTruthy();
        expect(screen.getByText('USER')).toBeTruthy();
        expect(screen.getByText('admin@example.com')).toBeTruthy();
      });
    });

    it('should handle refresh', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(screen.getByText('Audit Logs')).toBeTruthy();
      });

      // Simulate pull to refresh
      const scrollView = screen.getByTestId('audit-log-list') || screen.getByDisplayValue('') || screen.getByRole('scrollview');
      if (scrollView) {
        fireEvent(scrollView, 'refresh');
      }

      await waitFor(() => {
        expect(mockAuditLogger.getLogs).toHaveBeenCalledTimes(2);
      });
    });

    it('should show export options when export button is pressed', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        const exportButton = screen.getByText('📤 Export');
        fireEvent.press(exportButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Export Audit Logs',
        'Choose export format:',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'JSON' }),
          expect.objectContaining({ text: 'CSV' }),
        ])
      );
    });

    it('should apply filters correctly', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        const filterButton = screen.getByText('🔍 Filter');
        fireEvent.press(filterButton);
      });

      await waitFor(() => {
        // Select LOGIN action type
        const loginChip = screen.getByText('LOGIN');
        fireEvent.press(loginChip);

        // Apply filters
        const applyButton = screen.getByText('Apply');
        fireEvent.press(applyButton);
      });

      await waitFor(() => {
        expect(mockAuditLogger.getLogs).toHaveBeenCalledWith({
          action_type: 'LOGIN',
        });
      });
    });

    it('should handle empty logs', async () => {
      mockAuditLogger.getLogs.mockResolvedValue({
        data: [],
        count: 0,
      });

      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(screen.getByText('No audit logs found')).toBeTruthy();
        expect(screen.getByText('Try adjusting your filters or check back later')).toBeTruthy();
      });
    });

    it('should handle errors when loading logs', async () => {
      mockAuditLogger.getLogs.mockResolvedValue({
        data: [],
        count: 0,
        error: 'Database connection failed',
      });

      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load audit logs: Database connection failed'
        );
      });
    });

    it('should display different status indicators correctly', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        // Check that success and failure logs are both displayed
        expect(screen.getByText('User logged in successfully')).toBeTruthy();
        expect(screen.getByText('Permission denied: DELETE on products')).toBeTruthy();
      });
    });

    it('should format timestamps correctly', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        // Check that dates are displayed (exact format may vary based on locale)
        expect(screen.getByText(/1\/1\/2024/)).toBeTruthy();
      });
    });
  });

  describe('Permission Denied', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        userRole: 'staff',
        user: null,
        session: null,
        loading: false,
        isAuthenticated: true,
        setUser: jest.fn(),
        setSession: jest.fn(),
        setLoading: jest.fn(),
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        checkAuth: jest.fn(),
        checkUser: jest.fn(),
        getUserRole: jest.fn(),
      });

      mockAuditLogger.hasAuditPermission.mockResolvedValue(false);
    });

    it('should show access denied for non-admin users', async () => {
      render(<AuditLogScreen />);

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeTruthy();
        expect(screen.getByText('You need admin privileges to view audit logs.')).toBeTruthy();
      });

      expect(mockAuditLogger.logPermissionDenied).toHaveBeenCalledWith(
        'VIEW',
        'audit_logs'
      );
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator', async () => {
      mockAuditLogger.hasAuditPermission.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AuditLogScreen />);

      expect(screen.getByText('Loading audit logs...')).toBeTruthy();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      mockAuditLogger.hasAuditPermission.mockResolvedValue(true);
      mockAuditLogger.getLogs.mockResolvedValue({
        data: mockAuditLogs,
        count: 3,
      });
    });

    it('should handle export success', async () => {
      mockAuditLogger.exportLogs.mockResolvedValue({
        data: JSON.stringify(mockAuditLogs, null, 2),
      });

      render(<AuditLogScreen />);

      await waitFor(() => {
        const exportButton = screen.getByText('📤 Export');
        fireEvent.press(exportButton);
      });

      // Simulate selecting JSON format
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const exportAlert = alertCalls.find(call => call[0] === 'Export Audit Logs');
      if (exportAlert) {
        const jsonOption = exportAlert[2].find((option: any) => option.text === 'JSON');
        if (jsonOption && jsonOption.onPress) {
          jsonOption.onPress();
        }
      }

      await waitFor(() => {
        expect(mockAuditLogger.exportLogs).toHaveBeenCalledWith({}, 'json');
      });
    });

    it('should handle export errors', async () => {
      mockAuditLogger.exportLogs.mockResolvedValue({
        error: 'Export failed',
      });

      render(<AuditLogScreen />);

      await waitFor(() => {
        const exportButton = screen.getByText('📤 Export');
        fireEvent.press(exportButton);
      });

      // Simulate selecting JSON format
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const exportAlert = alertCalls.find(call => call[0] === 'Export Audit Logs');
      if (exportAlert) {
        const jsonOption = exportAlert[2].find((option: any) => option.text === 'JSON');
        if (jsonOption && jsonOption.onPress) {
          jsonOption.onPress();
        }
      }

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Export Error', 'Export failed');
      });
    });
  });
});