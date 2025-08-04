export interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  imageUrl?: string;
  unit_price: number;      // NEW: Price per unit of the product
  description?: string;    // NEW: Product description/notes
  category?: string;       // NEW: Product category/group
  createdAt: string;
  updatedAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  user_id: string;
  user_email?: string;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export type AuditActionType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'ROLE_CHANGE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'STOCK_ADJUSTMENT'
  | 'SALE_CREATE'
  | 'RECEIPT_GENERATE'
  | 'PERMISSION_DENIED'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'EXPORT_AUDIT_LOGS';

export type AuditEntityType = 
  | 'USER'
  | 'PRODUCT'
  | 'SALE'
  | 'RECEIPT'
  | 'ROLE'
  | 'SYSTEM';

export interface AuditLogFilters {
  user_id?: string;
  action_type?: AuditActionType;
  entity_type?: AuditEntityType;
  start_date?: string;
  end_date?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditLogExport {
  format: 'json' | 'csv';
  filters: AuditLogFilters;
  filename?: string;
}