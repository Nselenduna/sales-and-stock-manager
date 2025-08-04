# Audit Logging System

The Sales and Stock Manager application includes a comprehensive audit logging system that tracks all critical system activities for security, compliance, and operational monitoring.

## Overview

The audit logging system automatically captures and stores information about:
- User authentication events (logins, logouts, failed attempts)
- Role and permission changes
- Inventory operations (stock adjustments, product modifications)
- Sales transactions and receipt generation
- Administrative actions
- Security events and permission denials

## Features

### Automatic Logging
- **Authentication Events**: Login success/failure, logout events
- **Authorization Events**: Role changes, permission denials
- **Business Operations**: Stock adjustments, sales transactions, receipt generation
- **Administrative Actions**: User management, system configuration changes

### Admin Dashboard Integration
- Dedicated Audit Logs screen accessible from Admin Dashboard
- Real-time log viewing with filtering and search capabilities
- Export functionality for compliance reporting

### Security and Compliance
- Tamper-proof logging (write-only database operations)
- Comprehensive audit trail for regulatory compliance
- Role-based access control (admin-only access)

## Database Schema

The audit logs are stored in the `audit_logs` table with the following structure:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
```

## Usage Examples

### Basic Logging

```typescript
import { auditLogger } from '../lib/auditLogger';

// Log a successful login
await auditLogger.logLogin('user@example.com', true);

// Log a failed login
await auditLogger.logLogin('user@example.com', false, 'Invalid password');

// Log a stock adjustment
await auditLogger.logStockAdjustment(
  'product-123',
  10, // old quantity
  15, // new quantity
  'Restocking from supplier'
);

// Log a role change
await auditLogger.logRoleChange('user-456', 'staff', 'admin');

// Log receipt generation
await auditLogger.logReceiptGeneration('sale-789', {
  format: 'pdf',
  total: 29.99,
  customer: 'John Doe'
});

// Log permission denied
await auditLogger.logPermissionDenied('DELETE', 'products');
```

### Custom Event Logging

```typescript
// Log a custom event
await auditLogger.logEvent({
  action_type: 'PRODUCT_UPDATE',
  entity_type: 'PRODUCT',
  entity_id: 'product-123',
  old_values: { name: 'Old Product Name', price: 19.99 },
  new_values: { name: 'New Product Name', price: 24.99 },
  description: 'Product information updated',
  success: true
});
```

### Retrieving Logs

```typescript
// Get recent logs
const { data: logs, count } = await auditLogger.getLogs();

// Get logs with filters
const { data: filteredLogs } = await auditLogger.getLogs({
  action_type: 'LOGIN',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  success: true,
  limit: 100,
  offset: 0
});
```

### Exporting Logs

```typescript
// Export logs as JSON
const { data: jsonData, error } = await auditLogger.exportLogs(
  { start_date: '2024-01-01' },
  'json'
);

// Export logs as CSV
const { data: csvData, error } = await auditLogger.exportLogs(
  { action_type: 'LOGIN' },
  'csv'
);
```

## Action Types

The system supports the following action types:

- **LOGIN**: Successful user login
- **LOGOUT**: User logout
- **LOGIN_FAILED**: Failed login attempt
- **ROLE_CHANGE**: User role modification
- **PRODUCT_CREATE**: New product creation
- **PRODUCT_UPDATE**: Product information update
- **PRODUCT_DELETE**: Product deletion
- **STOCK_ADJUSTMENT**: Inventory quantity change
- **SALE_CREATE**: New sales transaction
- **RECEIPT_GENERATE**: Receipt generation
- **PERMISSION_DENIED**: Access denied events
- **USER_CREATE**: New user account creation
- **USER_UPDATE**: User account modification
- **USER_DELETE**: User account deletion
- **EXPORT_AUDIT_LOGS**: Audit log export

## Entity Types

- **USER**: User-related operations
- **PRODUCT**: Product and inventory operations
- **SALE**: Sales transactions
- **RECEIPT**: Receipt operations
- **ROLE**: Role and permission changes
- **SYSTEM**: System-wide operations

## Admin Interface

### Accessing Audit Logs
1. Login as an admin user
2. Navigate to Admin Dashboard
3. Click on "Audit Logs" card
4. View, filter, and export logs as needed

### Filtering Options
- **User ID**: Filter by specific user
- **Action Type**: Filter by operation type
- **Entity Type**: Filter by affected entity
- **Date Range**: Filter by time period
- **Success Status**: Filter by success/failure

### Export Options
- **JSON Format**: Structured data for programmatic processing
- **CSV Format**: Tabular data for spreadsheet analysis

## Security Considerations

### Access Control
- Only admin users can view audit logs
- Audit log access attempts are themselves logged
- No modification or deletion of audit logs is permitted

### Data Protection
- Sensitive data is not logged in plain text
- Personal information is minimized in log entries
- IP addresses and user agents are optionally captured

### Compliance
- All logs include timestamps for chronological ordering
- Immutable audit trail for regulatory requirements
- Export capabilities for compliance reporting

## Integration Points

### Authentication Store
The `authStore.ts` automatically logs:
- Login attempts (success/failure)
- Logout events
- Role changes

### Receipt Generator
The `receiptGenerator.ts` automatically logs:
- Receipt generation events
- Format and metadata information

### Inventory Operations
Stock adjustments and product modifications trigger automatic logging with:
- Old and new values
- Change descriptions
- User attribution

## Performance Considerations

### Database Optimization
- Indexed columns for fast querying
- Batch operations for high-volume logging
- Async logging to avoid blocking operations

### Retention Policy
Consider implementing a retention policy for audit logs:
- Archive old logs to cold storage
- Implement automatic cleanup after retention period
- Compress historical data

## Testing

The audit logging system includes comprehensive tests:

```bash
# Run audit logger tests
npm test -- __tests__/lib/auditLogger.test.ts

# Run audit log screen tests
npm test -- __tests__/screens/AuditLogScreen.test.tsx
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check database permissions and network connectivity
2. **Export failing**: Verify admin permissions and file system access
3. **Performance issues**: Check database indexes and query filters

### Debug Logging

Enable debug logging for troubleshooting:

```typescript
// Add to environment variables
EXPO_PUBLIC_DEBUG_AUDIT_LOGS=true
```

### Database Queries

Check audit log entries directly:

```sql
-- Recent audit logs
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 50;

-- Failed operations
SELECT * FROM audit_logs 
WHERE success = false 
ORDER BY created_at DESC;

-- User activity
SELECT * FROM audit_logs 
WHERE user_id = 'specific-user-id' 
ORDER BY created_at DESC;
```

## Future Enhancements

- Real-time log monitoring dashboard
- Automated alert system for suspicious activities
- Machine learning-based anomaly detection
- Advanced analytics and reporting
- Integration with external SIEM systems