# Sales and Stock Manager API Documentation

This document describes the data structures, interfaces, and API patterns used in the Sales and Stock Manager application.

## Table of Contents

- [Core Data Types](#core-data-types)
- [Database Interfaces](#database-interfaces)
- [Error Handling](#error-handling)
- [Conflict Resolution](#conflict-resolution)
- [Export Utilities](#export-utilities)
- [API Patterns](#api-patterns)

## Core Data Types

### Product Interface

The `Product` interface represents a product in the inventory system.

```typescript
interface Product {
  id: string;                    // Unique identifier
  name: string;                  // Product name
  sku: string;                   // Stock Keeping Unit
  barcode?: string;              // Product barcode (optional)
  quantity: number;              // Current stock quantity
  low_stock_threshold: number;   // Alert threshold for low stock
  location?: string;             // Storage location (optional)
  unit_price?: number;           // Price per unit in pence (optional)
  description?: string;          // Product description (optional)
  category?: string;             // Product category (optional)
  image_url?: string;            // URL to product image (optional)
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

#### New Fields Added

- **unit_price**: Monetary value stored in pence for precision
- **description**: Detailed product description for better inventory management
- **category**: Product categorization for filtering and organization

### Sales Transaction Interface

```typescript
interface SalesTransaction {
  id: string;                    // Unique transaction identifier
  store_id?: string;             // Store identifier (optional)
  items: SalesTransactionItem[]; // Array of transaction items
  total: number;                 // Total amount in pence
  status: 'queued' | 'synced' | 'failed' | 'completed';
  customer_name?: string;        // Customer name (optional)
  customer_email?: string;       // Customer email (optional)
  customer_phone?: string;       // Customer phone (optional)
  payment_method?: string;       // Payment method (optional)
  notes?: string;                // Transaction notes (optional)
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

### Sales Transaction Item Interface

```typescript
interface SalesTransactionItem {
  product_id: string;            // Reference to Product.id
  quantity: number;              // Quantity sold
  unit_price: number;            // Price per unit in pence
  total_price: number;           // Total price for this item in pence
  product_name?: string;         // Denormalized product name for offline display
}
```

## Database Interfaces

### User Management

```typescript
interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  user_id: string;
  role_type: 'admin' | 'staff' | 'viewer';
  created_at: string;
  updated_at: string;
}

interface UserWithRole extends User {
  role: Role;
}
```

### Cart Management

```typescript
interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}
```

### Low Stock Alerts

```typescript
interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  low_stock_threshold: number;
  location?: string;
}
```

### Sales Analytics

```typescript
interface SalesSummary {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
}
```

## Error Handling

### Error Types

```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  SYNC = 'SYNC',
  UNKNOWN = 'UNKNOWN',
}
```

### Error Interfaces

```typescript
interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: ErrorContext;
  recoverable?: boolean;
  retryable?: boolean;
}
```

### Error Handler Usage

```typescript
import { handleError, createNetworkError } from '../lib/errorHandler';

// Handle generic errors
try {
  await someAsyncOperation();
} catch (error) {
  handleError(error, {
    component: 'InventoryScreen',
    action: 'loadProducts'
  });
}

// Create specific error types
const networkError = createNetworkError(
  'Failed to sync with server',
  { component: 'SyncManager' }
);
```

## Conflict Resolution

### Conflict Types

```typescript
enum ConflictType {
  DATA_MODIFIED = 'DATA_MODIFIED',
  DATA_DELETED = 'DATA_DELETED',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
}
```

### Resolution Strategies

```typescript
enum ResolutionStrategy {
  USE_LOCAL = 'USE_LOCAL',
  USE_REMOTE = 'USE_REMOTE',
  MERGE = 'MERGE',
  MANUAL = 'MANUAL',
}
```

### Conflict Resolution Usage

```typescript
import { detectConflict, resolveProductConflict } from '../lib/conflictResolver';

// Detect conflicts between local and remote data
const conflict = detectConflict(localProduct, remoteProduct, baseProduct);

if (conflict) {
  // Resolve product conflicts with business logic
  const resolution = resolveProductConflict(conflict, ResolutionStrategy.MERGE);
  
  // Apply resolved data
  const resolvedProduct = resolution.resolvedData;
}
```

## Export Utilities

### Export Options

```typescript
interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'readable';
  currencyFormat?: 'pence' | 'formatted';
  delimiter?: string;
  encoding?: FileSystem.EncodingType;
}
```

### Export Functions

```typescript
import { exportProducts, exportSalesTransactions } from '../lib/exporter';

// Export products to CSV
const result = await exportProducts(products, {
  filename: 'inventory_export.csv',
  dateFormat: 'readable',
  currencyFormat: 'formatted'
});

// Export sales transactions
const salesResult = await exportSalesTransactions(transactions, {
  filename: 'sales_export.csv',
  includeHeaders: true
});
```

## API Patterns

### Supabase Integration

The application uses Supabase for backend services with the following patterns:

```typescript
// Query products
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .order('name', { ascending: true });

// Insert new product
const { data, error } = await supabase
  .from('products')
  .insert([productData])
  .select()
  .single();

// Update product
const { data, error } = await supabase
  .from('products')
  .update(updateData)
  .eq('id', productId)
  .select()
  .single();
```

### Offline Support

The application supports offline functionality with:

1. **Local Storage**: Using AsyncStorage for caching data
2. **Sync Queue**: Managing offline changes for later synchronization
3. **Conflict Resolution**: Handling data conflicts when reconnecting

### Pagination

For large datasets, use pagination:

```typescript
const pageSize = 20;
const pageIndex = 0;

const { data, error } = await supabase
  .from('products')
  .select('*')
  .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
```

### Real-time Updates

Subscribe to real-time changes:

```typescript
const subscription = supabase
  .channel('products')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe();
```

## Security Considerations

### Row Level Security (RLS)

All tables should have RLS policies enabled:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can modify products" ON products
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));
```

### Input Validation

Always validate input data:

```typescript
// Validate product data
if (!formData.name.trim()) {
  throw createValidationError('Product name is required');
}

if (formData.quantity < 0) {
  throw createValidationError('Quantity cannot be negative');
}
```

### Error Message Sanitization

Ensure error messages don't expose sensitive information:

```typescript
// Good: Generic user-friendly message
"Failed to save product. Please try again."

// Bad: Exposes system details
"SQL Error: duplicate key value violates unique constraint 'products_sku_key'"
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2024-01-XX | Added unit_price, description, category to Product interface |
| 1.0.0 | 2024-01-XX | Initial API documentation |