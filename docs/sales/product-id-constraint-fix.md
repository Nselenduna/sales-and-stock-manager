# Product ID Constraint Fix

## Problem Description

The application is encountering a database constraint error when trying to insert sales data:

```
ERROR: 23502: null value in column "product_id" of relation "sales" violates not-null constraint
DETAIL: Failing row contains (c7d10a11-4685-4a75-a905-3531b9f8024d, null, null, null, null, synced, 2025-07-29 19:33:29.874347+00, 2025-07-31 19:33:29.874347+00, queued, 15000, [{"name": "Laptop", "quantity": 1, "unit_price": 15000}], null, John Doe, john.doe@example.com, +1234567890, null, null).
```

## Root Cause

The database schema has a **mismatch** between the expected structure and the actual table:

1. **Expected Schema**: Uses `items` JSONB column to store multiple products per sale
2. **Actual Schema**: Has both `product_id` (NOT NULL) AND `items` JSONB columns
3. **Data Structure**: The application is inserting data with `items` JSON but the old `product_id` column still exists with a NOT NULL constraint

## Solution

### Step 1: Run the Database Fix Script

Execute the SQL script `docs/database/fix-product-id-constraint.sql` in your Supabase SQL Editor:

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the entire content of `docs/database/fix-product-id-constraint.sql`
4. Click **Run** to execute the fix

### What the Fix Does

1. **Removes the old `product_id` column** - This column is no longer needed since we use the `items` JSONB column
2. **Ensures `items` column exists** - Makes sure the JSONB column is properly configured
3. **Adds missing columns** - Customer info, payment method, notes, etc.
4. **Cleans up existing data** - Updates any problematic records

### Expected Database Schema After Fix

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Stores multiple products per sale
  total INTEGER NOT NULL DEFAULT 0,          -- Total amount in pence
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payment_method TEXT,
  notes TEXT
);
```

### Data Structure

The `items` column stores JSON data like this:
```json
[
  {
    "product_id": "uuid-here",
    "name": "Laptop",
    "quantity": 1,
    "unit_price": 15000,
    "total_price": 15000
  },
  {
    "product_id": "another-uuid",
    "name": "Mouse",
    "quantity": 2,
    "unit_price": 2500,
    "total_price": 5000
  }
]
```

## Verification

After running the fix, verify:

1. **No more constraint errors** when creating sales
2. **Sales data inserts successfully** with the new structure
3. **Analytics functions work** (if you've also run the analytics migration)

## Alternative: Quick Fix

If you want a quick fix without removing the column, you can make `product_id` nullable:

```sql
ALTER TABLE sales ALTER COLUMN product_id DROP NOT NULL;
```

However, the recommended approach is to remove the column entirely since the new schema uses the `items` JSONB column.

## Next Steps

1. **Run the fix script** in Supabase
2. **Test sales creation** to ensure no more constraint errors
3. **Continue with Phase 3B** development

The application code is already correct - the issue was purely a database schema mismatch. 