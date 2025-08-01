-- Fix Sales Table Schema Conflict
-- This script ensures we have the correct modern sales table schema

-- ============================================================================
-- STEP 1: Check current table structure
-- ============================================================================

-- First, let's see what columns exist in the sales table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Drop old columns if they exist (from old schema)
-- ============================================================================

-- Remove old schema columns if they exist
DO $$ 
BEGIN
    -- Drop old columns that conflict with new schema
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'quantity_sold'
    ) THEN
        ALTER TABLE sales DROP COLUMN quantity_sold;
        RAISE NOTICE 'Dropped quantity_sold column from sales table';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE sales DROP COLUMN product_id;
        RAISE NOTICE 'Dropped product_id column from sales table';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'sale_price'
    ) THEN
        ALTER TABLE sales DROP COLUMN sale_price;
        RAISE NOTICE 'Dropped sale_price column from sales table';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'sold_by'
    ) THEN
        ALTER TABLE sales DROP COLUMN sold_by;
        RAISE NOTICE 'Dropped sold_by column from sales table';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'sync_status'
    ) THEN
        ALTER TABLE sales DROP COLUMN sync_status;
        RAISE NOTICE 'Dropped sync_status column from sales table';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure new schema columns exist
-- ============================================================================

-- Add new schema columns if they don't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS store_id UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 4: Update status constraint
-- ============================================================================

-- Update status constraint to include 'completed'
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check 
CHECK (status IN ('queued', 'synced', 'failed', 'completed'));

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Users can create sales" ON sales;
DROP POLICY IF EXISTS "Users can update sales" ON sales;

-- Create new policies
CREATE POLICY "Users can view sales" ON sales
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update sales" ON sales
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 7: Create trigger for updated_at
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: Verify the final structure
-- ============================================================================

-- Show the final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 9: Test insert
-- ============================================================================

-- Test that we can insert a sample record
INSERT INTO sales (
  id, 
  items, 
  total, 
  status, 
  customer_name, 
  payment_method,
  created_at
) VALUES (
  gen_random_uuid(),
  '[{"product_id": "test-123", "product_name": "Test Product", "quantity": 1, "unit_price": 1000, "total_price": 1000}]'::jsonb,
  1000,
  'completed',
  'Test Customer',
  'cash',
  NOW()
) ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM sales WHERE customer_name = 'Test Customer';

DO $$
BEGIN
  RAISE NOTICE 'Sales table schema migration completed successfully!';
END $$; 