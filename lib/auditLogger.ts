import { supabase } from './supabase';
import { AuditLog, AuditActionType, AuditEntityType, AuditLogFilters } from './types';

export interface LogAuditParams {
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description: string;
  success?: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
}

class AuditLogger {
  /**
   * Log an audit event to the database
   */
  async logEvent(params: LogAuditParams): Promise<void> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Failed to get user for audit log:', userError);
        return;
      }

      const auditEntry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: user?.id || 'anonymous',
        user_email: user?.email || undefined,
        action_type: params.action_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        old_values: params.old_values,
        new_values: params.new_values,
        description: params.description,
        ip_address: params.ip_address,
        user_agent: params.user_agent,
        success: params.success ?? true,
        error_message: params.error_message,
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to insert audit log:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<{ data: AuditLog[]; count: number; error?: string }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters.success !== undefined) {
        query = query.eq('success', filters.success);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { data: [], count: 0, error: error.message };
      }

      return { data: data || [], count: count || 0 };
    } catch (error: any) {
      return { data: [], count: 0, error: error.message };
    }
  }

  /**
   * Check if current user has permission to view audit logs
   */
  async hasAuditPermission(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: roleData } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', user.id)
        .single();

      return roleData?.role_type === 'admin';
    } catch (error) {
      console.error('Error checking audit permission:', error);
      return false;
    }
  }

  /**
   * Export audit logs to JSON or CSV format
   */
  async exportLogs(filters: AuditLogFilters = {}, format: 'json' | 'csv' = 'json'): Promise<{ data?: string; error?: string }> {
    try {
      // Check permission
      const hasPermission = await this.hasAuditPermission();
      if (!hasPermission) {
        await this.logEvent({
          action_type: 'PERMISSION_DENIED',
          entity_type: 'SYSTEM',
          description: 'Attempted to export audit logs without admin permission',
          success: false,
          error_message: 'Insufficient permissions'
        });
        return { error: 'Insufficient permissions to export audit logs' };
      }

      // Get all logs (no pagination for export)
      const { data: logs, error } = await this.getLogs({
        ...filters,
        limit: 10000, // Large limit for export
        offset: 0
      });

      if (error) {
        return { error };
      }

      // Log the export action
      await this.logEvent({
        action_type: 'EXPORT_AUDIT_LOGS',
        entity_type: 'SYSTEM',
        description: `Exported ${logs.length} audit logs in ${format} format`,
        success: true
      });

      if (format === 'csv') {
        const csvData = this.convertToCSV(logs);
        return { data: csvData };
      } else {
        return { data: JSON.stringify(logs, null, 2) };
      }
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID', 'User ID', 'User Email', 'Action Type', 'Entity Type', 'Entity ID',
      'Description', 'Success', 'Error Message', 'Created At'
    ];

    const rows = logs.map(log => [
      log.id,
      log.user_id,
      log.user_email || '',
      log.action_type,
      log.entity_type,
      log.entity_id || '',
      log.description,
      log.success,
      log.error_message || '',
      log.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Convenience methods for common audit actions
  async logLogin(email: string, success: boolean, error_message?: string): Promise<void> {
    await this.logEvent({
      action_type: success ? 'LOGIN' : 'LOGIN_FAILED',
      entity_type: 'USER',
      description: `User ${success ? 'logged in' : 'failed to log in'}: ${email}`,
      success,
      error_message
    });
  }

  async logLogout(email: string): Promise<void> {
    await this.logEvent({
      action_type: 'LOGOUT',
      entity_type: 'USER',
      description: `User logged out: ${email}`,
      success: true
    });
  }

  async logRoleChange(userId: string, oldRole: string, newRole: string): Promise<void> {
    await this.logEvent({
      action_type: 'ROLE_CHANGE',
      entity_type: 'ROLE',
      entity_id: userId,
      old_values: { role_type: oldRole },
      new_values: { role_type: newRole },
      description: `User role changed from ${oldRole} to ${newRole}`,
      success: true
    });
  }

  async logStockAdjustment(productId: string, oldQuantity: number, newQuantity: number, reason: string): Promise<void> {
    await this.logEvent({
      action_type: 'STOCK_ADJUSTMENT',
      entity_type: 'PRODUCT',
      entity_id: productId,
      old_values: { quantity: oldQuantity },
      new_values: { quantity: newQuantity },
      description: `Stock adjusted: ${reason}. Quantity changed from ${oldQuantity} to ${newQuantity}`,
      success: true
    });
  }

  async logReceiptGeneration(saleId: string, receiptData: any): Promise<void> {
    await this.logEvent({
      action_type: 'RECEIPT_GENERATE',
      entity_type: 'RECEIPT',
      entity_id: saleId,
      new_values: { receipt_data: receiptData },
      description: `Receipt generated for sale ${saleId}`,
      success: true
    });
  }

  async logPermissionDenied(action: string, resource: string): Promise<void> {
    await this.logEvent({
      action_type: 'PERMISSION_DENIED',
      entity_type: 'SYSTEM',
      description: `Permission denied: ${action} on ${resource}`,
      success: false,
      error_message: 'Insufficient permissions'
    });
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
export default auditLogger;