-- Quick Fix Migration for Sales and Stocks Manager
-- This script fixes the immediate database issues

-- 1. Add missing columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update existing sales records
UPDATE sales 
SET customer_name = 'Walk-in Customer' 
WHERE customer_name IS NULL;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- 4. Create function to get customers from sales
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

-- 5. Create function to get sales metrics
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
    (SELECT (item->>'name')::text
     FROM sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     GROUP BY (item->>'name')::text
     ORDER BY SUM(((item->>'quantity')::int) * ((item->>'unit_price')::int))
     DESC LIMIT 1) as top_product,
    (SELECT SUM(((item->>'quantity')::int) * ((item->>'unit_price')::int)) / 100.0
     FROM sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     AND (item->>'name')::text = (
       SELECT (item->>'name')::text
       FROM sales s3, jsonb_array_elements(s3.items) as item
       WHERE s3.created_at >= start_date
       GROUP BY (item->>'name')::text
       ORDER BY SUM(((item->>'quantity')::int) * ((item->>'unit_price')::int))
       DESC LIMIT 1
     )) as top_product_revenue
  FROM sales s
  WHERE s.created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get inventory turnover
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
    (item->>'name')::text as product_name,
    SUM((item->>'quantity')::int) as total_sold,
    ROUND(
      SUM((item->>'quantity')::int)::decimal / 
      GREATEST(EXTRACT(EPOCH FROM (NOW() - start_date)) / 86400, 1), 
      2
    ) as average_daily_sales,
    EXTRACT(EPOCH FROM (NOW() - MAX(s.created_at))) / 86400 as days_since_last_sale
  FROM sales s, jsonb_array_elements(s.items) as item
  WHERE s.created_at >= start_date
  GROUP BY (item->>'name')::text
  ORDER BY total_sold DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_customers_from_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_turnover(TIMESTAMPTZ) TO authenticated;

-- 8. Create basic security settings table (simplified)
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Insert basic security settings
INSERT INTO security_settings (setting_key, setting_value, description) VALUES
('password_min_length', '8', 'Minimum password length'),
('session_timeout_minutes', '30', 'Session timeout in minutes'),
('max_login_attempts', '5', 'Maximum failed login attempts before blocking'),
('block_duration_minutes', '15', 'Duration to block account after max failed attempts')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 10. Grant permissions on security_settings
GRANT SELECT ON security_settings TO authenticated;
GRANT UPDATE ON security_settings TO authenticated;

-- 11. Create basic user_profiles table (simplified)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Grant permissions on user_profiles
GRANT SELECT ON user_profiles TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

-- 13. Create basic RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 14. Insert sample customer data if sales table is empty
INSERT INTO sales (customer_name, customer_email, customer_phone, total, items, created_at)
SELECT 
  'John Doe',
  'john.doe@example.com',
  '+1234567890',
  15000, -- 150.00 in pence
  '[{"name": "Laptop", "quantity": 1, "unit_price": 15000}]'::jsonb,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM sales LIMIT 1);

-- 15. Log the migration completion
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