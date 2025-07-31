# Sales Module: Transaction Flow

## Overview

The Sales Transaction Flow module provides a complete point-of-sale (POS) system integrated with the existing inventory management system. It enables staff to process sales transactions with barcode scanning, cart management, and offline-capable checkout functionality.

## Business Value

- **Revenue Generation**: Complete the inventory-to-sales cycle
- **Operational Efficiency**: Streamlined checkout process with barcode scanning
- **Offline Reliability**: Sales continue working without internet connection
- **Data Integrity**: Automatic inventory updates and transaction tracking
- **User Experience**: Intuitive interface for quick sales processing

## Technical Architecture

### Core Components

1. **SalesScreen** (`screens/sales/SalesScreen.tsx`)
   - Main sales interface with cart management
   - Product search and barcode scanning integration
   - Checkout process with confirmation dialogs

2. **useSales Hook** (`hooks/useSales.ts`)
   - Cart state management
   - Transaction processing and sync queue integration
   - Offline/online state handling

3. **SalesHistoryScreen** (`screens/sales/SalesHistoryScreen.tsx`)
   - Transaction history viewing
   - Filtering by status (queued/synced/failed)
   - CSV export functionality

### Data Flow

```
[User Action] → [Cart Update] → [Checkout] → [Sync Queue] → [Supabase]
     ↓              ↓             ↓            ↓            ↓
[Local Storage] → [Validation] → [Transaction] → [Offline Queue] → [Database]
```

## Supabase Schema

### Sales Table

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  items JSONB NOT NULL, -- Array of transaction items
  total INTEGER NOT NULL, -- Total in pence
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_status ON sales(status);
```

### Transaction Items Structure

```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 1000,
      "total_price": 2000,
      "product_name": "Product Name"
    }
  ]
}
```

## API & Hooks

### useSales Hook

```typescript
interface UseSalesReturn {
  cart: CartItem[];
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  checkout: () => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  isProcessing: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  retrySync: () => Promise<void>;
}
```

### Key Methods

- **addToCart()**: Adds product to cart, handles quantity updates
- **checkout()**: Processes transaction, updates inventory, queues for sync
- **retrySync()**: Manually retry failed sync operations

## UI Wireframe

```
┌─────────────────────────────────────┐
│ Sales                    [📷] [🕒] │
├─────────────────────────────────────┤
│ [Search Products...]                │
├─────────────────────────────────────┤
│ Products                            │
│ ┌─────────────────────────────────┐ │
│ │ Product A - £10.00 [+ Add]      │ │
│ │ Product B - £15.00 [+ Add]      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Cart                                │
│ ┌─────────────────────────────────┐ │
│ │ Product A (2) [+][-][🗑️] £20.00 │ │
│ │ Product B (1) [+][-][🗑️] £15.00 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Total: £35.00                       │
│ [Checkout]                          │
└─────────────────────────────────────┘
```

## Offline Capabilities

### Sync Queue Integration

- Transactions are queued locally when offline
- Automatic sync on reconnection
- Conflict resolution with existing SyncQueueManager
- Retry logic with exponential backoff

### Local Storage

- Cart persistence across app sessions
- Transaction history for offline viewing
- Graceful degradation when Supabase unavailable

## Error Handling

### Conflict Resolution Strategy

1. **Network Failures**: Queue transaction locally, retry on reconnection
2. **Inventory Conflicts**: Check stock levels before checkout
3. **Duplicate Transactions**: UUID-based deduplication
4. **Sync Failures**: Manual retry option with user feedback

### Retry Policy

- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retry attempts
- User notification of sync status
- Manual retry button for failed operations

## Test Plan

### Unit Tests

1. **Cart Operations**
   - Add/remove items
   - Quantity updates
   - Total calculations
   - Cart persistence

2. **Offline Queue Logic**
   - Transaction queuing
   - Sync retry mechanism
   - Conflict resolution

3. **Sync Hook**
   - Network state detection
   - Queue processing
   - Error handling

### Integration Tests

1. **Complete Checkout Flow**
   - Product search → add to cart → checkout
   - Barcode scanning integration
   - Inventory updates

2. **Offline → Online Transition**
   - Create transaction offline
   - Reconnect and verify sync
   - Check inventory consistency

### E2E Tests

1. **Sales Process**
   - Scan barcode → add items → checkout
   - Verify transaction in history
   - Check inventory reduction

2. **Error Scenarios**
   - Network failure during checkout
   - Invalid barcode scan
   - Out of stock products

## Accessibility Features

### Screen Reader Support

- All buttons have `accessibilityLabel` props
- Cart items announce quantity and price
- Status messages for sync operations
- Clear navigation hierarchy

### Visual Design

- High contrast colors for alerts
- Large touch targets (44pt minimum)
- Clear visual feedback for actions
- Consistent color scheme with app theme

## Performance Considerations

### Optimization Strategies

1. **Debounced Search**: 300ms delay to reduce API calls
2. **Lazy Loading**: Product images loaded on demand
3. **Virtualized Lists**: Efficient rendering of large product lists
4. **Local Caching**: Product data cached for offline use

### Memory Management

- Cart data persisted to AsyncStorage
- Transaction history pagination
- Image optimization for product photos
- Cleanup of completed sync operations

## Security & Compliance

### Data Protection

- No sensitive customer data stored
- Transaction IDs are UUIDs (not sequential)
- Local data encrypted in AsyncStorage
- Supabase RLS policies enforced

### Audit Trail

- All transactions logged with timestamps
- User actions tracked for debugging
- Sync status visible to users
- Export functionality for compliance

## Future Enhancements

### Planned Features

1. **Receipt Printing**: Thermal printer integration
2. **Payment Integration**: Card reader support
3. **Customer Management**: Customer profiles and loyalty
4. **Discount System**: Promotional codes and sales
5. **Multi-location**: Support for multiple stores

### Technical Improvements

1. **Real-time Updates**: WebSocket integration for live inventory
2. **Advanced Analytics**: Sales trends and reporting
3. **Bulk Operations**: Import/export of product catalogs
4. **API Rate Limiting**: Optimized Supabase usage

## Migration Guide

### Database Setup

```sql
-- Create sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_status ON sales(status);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sales" ON sales
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert sales" ON sales
  FOR INSERT WITH CHECK (auth.uid() = created_by);
```

### Environment Variables

```bash
# Add to .env
EXPO_PUBLIC_SALES_ENABLED=true
EXPO_PUBLIC_SYNC_RETRY_ATTEMPTS=5
EXPO_PUBLIC_SYNC_RETRY_DELAY=1000
```

## Troubleshooting

### Common Issues

1. **Sync Failures**
   - Check network connectivity
   - Verify Supabase credentials
   - Review sync queue status

2. **Cart Not Persisting**
   - Check AsyncStorage permissions
   - Verify storage quota
   - Clear app data if corrupted

3. **Barcode Scanning Issues**
   - Ensure camera permissions
   - Check barcode format validation
   - Verify product exists in database

### Debug Information

- Sync status displayed in UI
- Transaction logs in console
- Network state monitoring
- Error boundaries for crash prevention

## QA Checklist

### Functionality Testing

- [ ] Add products to cart
- [ ] Update quantities
- [ ] Remove items from cart
- [ ] Clear entire cart
- [ ] Process checkout
- [ ] Barcode scanning
- [ ] Offline functionality
- [ ] Sync on reconnection

### Accessibility Testing

- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] High contrast mode
- [ ] Touch target sizes
- [ ] Voice control support

### Performance Testing

- [ ] Large product catalogs
- [ ] Multiple concurrent transactions
- [ ] Memory usage monitoring
- [ ] Battery consumption
- [ ] Network efficiency

### Security Testing

- [ ] Data encryption
- [ ] Authentication checks
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection 