-- Fix for product_id constraint issue in sales table
-- This script addresses the NOT NULL constraint violation by removing the old product_id column

-- ============================================================================
-- STEP 1: Check current table structure
-- ============================================================================

-- First, let's see what columns exist in the sales table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Remove the old product_id column
-- ============================================================================

DO $$ 
BEGIN
    -- Check if product_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'product_id'
    ) THEN
        -- Remove product_id column since we're using items JSONB
        ALTER TABLE sales DROP COLUMN product_id;
        RAISE NOTICE 'Removed product_id column from sales table - now using items JSONB column';
    ELSE
        RAISE NOTICE 'product_id column does not exist - table structure is already correct';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure items column exists and is properly configured
-- ============================================================================

-- Add items column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'items'
    ) THEN
        ALTER TABLE sales ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added items JSONB column to sales table';
    ELSE
        RAISE NOTICE 'items column already exists in sales table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add other required columns if missing
-- ============================================================================

-- Add customer columns if they don't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add total column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0;

-- Add status column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued';

-- Add store_id column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID;

-- Add updated_at column if it doesn't exist
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 5: Clean up any existing problematic records
-- ============================================================================

-- Only try to update items if the column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'items'
    ) THEN
        -- Update any existing records with null items to have proper JSON data
        UPDATE sales 
        SET items = jsonb_build_array(
            jsonb_build_object(
                'name', 'Unknown Product',
                'quantity', 1,
                'unit_price', total
            )
        )
        WHERE items IS NULL OR items = '[]'::jsonb;
        
        RAISE NOTICE 'Cleaned up existing sales records with proper items data';
    ELSE
        RAISE NOTICE 'items column does not exist yet - skipping cleanup';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Verify the fix
-- ============================================================================

-- Check the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 7: Test with a sample insert (commented out)
-- ============================================================================

-- Test insert to verify the constraint is fixed
-- (This will be commented out to avoid actual data insertion)
/*
INSERT INTO sales (
    id, 
    items, 
    total, 
    status, 
    created_at, 
    updated_at, 
    customer_name, 
    customer_email, 
    customer_phone
) VALUES (
    gen_random_uuid(),
    '[{"name": "Test Product", "quantity": 1, "unit_price": 1000}]'::jsonb,
    1000,
    'completed',
    NOW(),
    NOW(),
    'Test Customer',
    'test@example.com',
    '+1234567890'
);
*/

-- ============================================================================
-- STEP 8: Final confirmation
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Sales table product_id constraint issue has been resolved - now using items JSONB column';
END $$; 