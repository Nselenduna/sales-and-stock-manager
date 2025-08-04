# Supabase Implementation Guide

This document explains how the Sales and Stock Manager app interacts with Supabase and how the API documentation maps to actual implementation.

## Database Schema

The application uses the following Supabase tables:

### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  location TEXT,
  unit_price DECIMAL(10,2),
  description TEXT,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sales Table
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  items JSONB NOT NULL,
  total INTEGER NOT NULL, -- stored in pence/cents
  status TEXT NOT NULL DEFAULT 'completed',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'staff', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## Row Level Security (RLS)

The application uses Supabase's Row Level Security for authorization:

### Products Table Policies
```sql
-- Allow read access for authenticated users
CREATE POLICY "authenticated_read_products" ON products FOR SELECT 
TO authenticated USING (true);

-- Allow admin and staff to insert products
CREATE POLICY "admin_staff_insert_products" ON products FOR INSERT 
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('admin', 'staff')
  )
);

-- Allow admin and staff to update products
CREATE POLICY "admin_staff_update_products" ON products FOR UPDATE 
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('admin', 'staff')
  )
);

-- Allow only admin to delete products
CREATE POLICY "admin_delete_products" ON products FOR DELETE 
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'admin'
  )
);
```

### Sales Table Policies
```sql
-- Allow read access for authenticated users
CREATE POLICY "authenticated_read_sales" ON sales FOR SELECT 
TO authenticated USING (true);

-- Allow admin and staff to insert sales
CREATE POLICY "admin_staff_insert_sales" ON sales FOR INSERT 
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('admin', 'staff')
  )
);
```

### Roles Table Policies
```sql
-- Allow users to read their own role
CREATE POLICY "users_read_own_role" ON roles FOR SELECT 
TO authenticated USING (user_id = auth.uid());

-- Allow admin to read all roles
CREATE POLICY "admin_read_all_roles" ON roles FOR SELECT 
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'admin'
  )
);

-- Allow admin to manage roles
CREATE POLICY "admin_manage_roles" ON roles FOR ALL 
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles 
    WHERE user_id = auth.uid() 
    AND role_type = 'admin'
  )
);
```

## API Implementation Mapping

### Authentication Operations

#### Sign In (`/auth/v1/token`)
**Implementation**: `store/authStore.ts` - `signIn` method
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

#### Sign Up (`/auth/v1/signup`)
**Implementation**: `store/authStore.ts` - `signUp` method
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
```

### Product Operations

#### List Products (`GET /rest/v1/products`)
**Implementation**: `screens/sales/SalesScreen.tsx` - `loadProducts` function
```typescript
const { data, error } = await supabase
  .from('products')
  .select('*')
  .or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`)
  .gt('quantity', 0)
  .order('name')
  .limit(20);
```

#### Create Product (`POST /rest/v1/products`)
**Implementation**: `screens/inventory/InventoryFormScreen.tsx`
```typescript
const { data, error } = await supabase
  .from('products')
  .insert([productData])
  .select()
  .single();
```

#### Update Product (`PATCH /rest/v1/products/{id}`)
**Implementation**: `screens/inventory/InventoryFormScreen.tsx`
```typescript
const { data, error } = await supabase
  .from('products')
  .update(productData)
  .eq('id', productId)
  .select()
  .single();
```

### Sales Operations

#### Create Sale (`POST /rest/v1/sales`)
**Implementation**: `hooks/useSales.ts` - `checkout` method
```typescript
const { error } = await supabase
  .from('sales')
  .insert([transactionData]);
```

#### List Sales (`GET /rest/v1/sales`)
**Implementation**: `screens/sales/SalesHistoryScreen.tsx`
```typescript
const { data, error } = await supabase
  .from('sales')
  .select('*')
  .order('created_at', { ascending: false });
```

### Low Stock Products

#### Get Low Stock (`GET /rest/v1/low-stock`)
**Implementation**: `screens/StockAlertScreen.tsx`
```typescript
const { data, error } = await supabase
  .from('products')
  .select('id, name, sku, quantity, low_stock_threshold, location')
  .lt('quantity', 'low_stock_threshold')
  .order('quantity', { ascending: true });
```

## Error Handling

The application implements comprehensive error handling:

### Client-Side Error Handling
```typescript
try {
  const { data, error } = await supabase
    .from('products')
    .insert([productData]);
    
  if (error) throw error;
  
  // Success handling
} catch (error) {
  console.error('Operation failed:', error);
  // User-friendly error message
  Alert.alert('Error', 'Failed to save product');
}
```

### Common Error Patterns
1. **Network errors**: Handled with offline queue system
2. **Permission errors**: Caught and displayed with appropriate messaging
3. **Validation errors**: Form validation before API calls
4. **Conflict errors**: Resolved through sync conflict resolution

## Offline Support Implementation

The application implements offline support through:

### Sync Queue Manager (`lib/SyncQueueManager.ts`)
```typescript
export class SyncQueueManager {
  async addToQueue(operation: string, data: any) {
    // Add operation to local SQLite queue
  }
  
  async processQueue() {
    // Process queued operations when online
  }
}
```

### Offline Detection
```typescript
import NetInfo from '@react-native-community/netinfo';

const networkState = await NetInfo.fetch();
const isOnline = networkState.isConnected && networkState.isInternetReachable;
```

## Security Considerations

1. **JWT Token Management**: Tokens are stored securely using AsyncStorage
2. **Input Sanitization**: All user inputs are sanitized before database operations
3. **Role-Based Access**: Enforced at both client and database level
4. **Image Upload**: Secure file upload with validation
5. **SQL Injection Prevention**: Using Supabase's query builders prevents SQL injection

## Performance Optimizations

1. **Virtualized Lists**: Using FlashList for large datasets
2. **Debounced Search**: 300ms delay for search operations
3. **Lazy Loading**: Images loaded on demand
4. **Caching**: Local caching for frequently accessed data
5. **Pagination**: Limit queries to prevent large data transfers

## Development Setup

1. **Supabase Configuration**: Set up environment variables for Supabase URL and keys
2. **Database Migration**: Apply SQL schema and RLS policies
3. **Authentication**: Configure Supabase Auth settings
4. **Storage**: Set up Supabase Storage for image uploads
5. **Local Development**: Use Supabase CLI for local development environment