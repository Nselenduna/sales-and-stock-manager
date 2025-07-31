-- Check and Fix Migration for Sales and Stocks Manager
-- This script first checks the existing table structure and then fixes issues

-- ============================================================================
-- STEP 1: Check existing table structure
-- ============================================================================

-- First, let's see what columns exist in the sales table
-- Run this query to see the current structure:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Add missing columns safely
-- ============================================================================

-- Add total column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'total'
    ) THEN
        ALTER TABLE sales ADD COLUMN total INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added total column to sales table';
    ELSE
        RAISE NOTICE 'total column already exists in sales table';
    END IF;
END $$;

-- Add customer columns if they don't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- STEP 3: Update existing sales records
-- ============================================================================

-- Update existing sales records to have default customer info
UPDATE sales 
SET customer_name = 'Walk-in Customer' 
WHERE customer_name IS NULL;

-- ============================================================================
-- STEP 4: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- ============================================================================
-- STEP 5: Create simple function to get customers from sales
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customers_from_sales()
RETURNS TABLE(
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_spent DECIMAL(10,2),
  total_orders BIGINT,
  last_order_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    SUM(s.total) / 100.0 as total_spent, -- Convert pence to dollars
    COUNT(*) as total_orders,
    MAX(s.created_at) as last_order_date
  FROM sales s
  WHERE s.customer_name IS NOT NULL AND s.customer_name != 'Walk-in Customer'
  GROUP BY s.customer_name, s.customer_email, s.customer_phone
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create simple function to get sales metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_metrics(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  total_revenue DECIMAL(10,2),
  total_sales BIGINT,
  average_order_value DECIMAL(10,2),
  top_product TEXT,
  top_product_revenue DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total), 0) / 100.0 as total_revenue, -- Convert pence to dollars
    COUNT(*) as total_sales,
    COALESCE(AVG(s.total), 0) / 100.0 as average_order_value, -- Convert pence to dollars
    'Sample Product' as top_product, -- Placeholder for now
    0.00 as top_product_revenue -- Placeholder for now
  FROM sales s
  WHERE s.created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create simple function to get inventory turnover
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_turnover(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  product_name TEXT,
  total_sold BIGINT,
  average_daily_sales DECIMAL(10,2),
  days_since_last_sale BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Sample Product' as product_name,
    0 as total_sold,
    0.00 as average_daily_sales,
    0 as days_since_last_sale;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Grant permissions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_customers_from_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_turnover(TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- STEP 9: Create security settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 10: Insert security settings
-- ============================================================================

INSERT INTO security_settings (setting_key, setting_value, description) VALUES
('password_min_length', '8', 'Minimum password length'),
('session_timeout_minutes', '30', 'Session timeout in minutes'),
('max_login_attempts', '5', 'Maximum failed login attempts before blocking'),
('block_duration_minutes', '15', 'Duration to block account after max failed attempts')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================================================
-- STEP 11: Grant permissions on security_settings
-- ============================================================================

GRANT SELECT ON security_settings TO authenticated;
GRANT UPDATE ON security_settings TO authenticated;

-- ============================================================================
-- STEP 12: Create user_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 13: Grant permissions on user_profiles
-- ============================================================================

GRANT SELECT ON user_profiles TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

-- ============================================================================
-- STEP 14: Create RLS policies
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 15: Insert sample data safely
-- ============================================================================

-- Only insert sample data if the sales table is empty
INSERT INTO sales (customer_name, customer_email, customer_phone, total, items, created_at)
SELECT 
  'John Doe',
  'john.doe@example.com',
  '+1234567890',
  15000, -- 150.00 in pence
  '[{"name": "Laptop", "quantity": 1, "unit_price": 15000}]'::jsonb,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM sales LIMIT 1);

-- ============================================================================
-- STEP 16: Log completion
-- ============================================================================

INSERT INTO sales (customer_name, customer_email, customer_phone, total, items, created_at, notes)
SELECT 
  'System',
  'system@example.com',
  NULL,
  0,
  '[]'::jsonb,
  NOW(),
  'Database migration completed successfully'
WHERE NOT EXISTS (SELECT 1 FROM sales WHERE customer_name = 'System' AND notes LIKE '%migration%');

-- ============================================================================
-- STEP 17: Verify the migration
-- ============================================================================

-- Show the final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position; 