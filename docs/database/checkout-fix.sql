-- Checkout Database Fix Script
-- This script fixes the database issues preventing checkout from working

-- ============================================================================
-- STEP 1: Fix Sales Table Schema
-- ============================================================================

-- First, let's check what columns exist in the sales table
DO $$ 
BEGIN
    RAISE NOTICE 'Checking sales table structure...';
END $$;

-- Add missing columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure the items column exists and is JSONB
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'items'
    ) THEN
        ALTER TABLE sales ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added items JSONB column to sales table';
    END IF;
END $$;

-- Ensure total column exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0;

-- Ensure status column exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued';

-- Ensure store_id column exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID;

-- Ensure updated_at column exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 2: Create System Settings Table
-- ============================================================================

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean')),
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_settings
CREATE POLICY "Users can view system settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update system settings" ON system_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default system settings
INSERT INTO system_settings (key, value, type, category, description) VALUES
('company_name', 'My Business', 'string', 'general', 'Company name displayed throughout the application'),
('timezone', 'UTC', 'string', 'general', 'Default timezone for the application'),
('currency', 'USD', 'string', 'general', 'Default currency for transactions'),
('tax_rate', '0.08', 'number', 'sales', 'Default tax rate for sales (as decimal)'),
('auto_calculate_tax', 'true', 'boolean', 'sales', 'Automatically calculate tax on sales'),
('require_customer_info', 'false', 'boolean', 'sales', 'Require customer information for all sales'),
('low_stock_threshold', '5', 'number', 'inventory', 'Default low stock threshold for products'),
('auto_restock_alerts', 'true', 'boolean', 'inventory', 'Automatically send restock alerts')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Create Trigger Function for Updated At
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for sales (if not exists)
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Create Function to Update Product Quantities on Sale
-- ============================================================================

-- Create function to update product quantities when a sale is completed
CREATE OR REPLACE FUNCTION update_product_quantity_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
BEGIN
  -- Loop through each item in the sale and update product quantities
  FOR item_record IN 
    SELECT 
      (item->>'product_id')::UUID as product_id,
      (item->>'quantity')::INTEGER as quantity
    FROM jsonb_array_elements(NEW.items) as item
  LOOP
    -- Update product quantity
    UPDATE products 
    SET quantity = GREATEST(0, quantity - item_record.quantity),
        updated_at = NOW()
    WHERE id = item_record.product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating product quantities
DROP TRIGGER IF EXISTS trigger_update_product_quantity ON sales;
CREATE TRIGGER trigger_update_product_quantity
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity_on_sale();

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant permissions on sales table
GRANT SELECT, INSERT, UPDATE ON sales TO authenticated;

-- Grant permissions on system_settings table
GRANT SELECT, UPDATE ON system_settings TO authenticated;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

-- Check if all required columns exist
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col_name TEXT;
BEGIN
  -- Check sales table columns
  FOR col_name IN SELECT unnest(ARRAY['items', 'total', 'status', 'customer_name', 'customer_email', 'customer_phone', 'payment_method', 'notes', 'updated_at'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sales' AND column_name = col_name
    ) THEN
      missing_columns := array_append(missing_columns, 'sales.' || col_name);
    END IF;
  END LOOP;
  
  -- Check system_settings table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    missing_columns := array_append(missing_columns, 'system_settings table');
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE 'Missing columns/tables: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'All required columns and tables exist!';
  END IF;
END $$;

-- Test inserting a sample sale
DO $$
DECLARE
  test_sale_id UUID;
BEGIN
  INSERT INTO sales (items, total, status, customer_name, payment_method) VALUES
  ('[{"product_id": "00000000-0000-0000-0000-000000000001", "quantity": 1, "unit_price": 1000, "total_price": 1000, "product_name": "Test Product"}]'::jsonb,
  1000,
  'queued',
  'Test Customer',
  'cash')
  RETURNING id INTO test_sale_id;
  
  RAISE NOTICE 'Test sale inserted with ID: %', test_sale_id;
  
  -- Clean up test data
  DELETE FROM sales WHERE id = test_sale_id;
  
  RAISE NOTICE 'Checkout database fix completed successfully!';
END $$; 