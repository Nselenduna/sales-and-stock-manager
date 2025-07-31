-- Database Migration to Fix Sales Table Schema Issues
-- Run this SQL in your Supabase SQL editor

-- Add missing columns to sales table for analytics compatibility
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index on customer_name for customer management
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);

-- Create index on payment_method for analytics
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- Update existing sales records to have default customer info
UPDATE sales 
SET customer_name = 'Walk-in Customer'
WHERE customer_name IS NULL;

-- Create a view for easier analytics queries
CREATE OR REPLACE VIEW sales_analytics AS
SELECT 
  s.id,
  s.customer_name,
  s.customer_email,
  s.customer_phone,
  s.payment_method,
  s.total,
  s.status,
  s.created_at,
  s.updated_at,
  s.items,
  -- Extract individual items for easier querying
  jsonb_array_elements(s.items) as item
FROM sales s;

-- Create a function to get customer data from sales
CREATE OR REPLACE FUNCTION get_customers_from_sales()
RETURNS TABLE (
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_spent BIGINT,
  total_orders BIGINT,
  last_order_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    SUM(s.total) as total_spent,
    COUNT(*) as total_orders,
    MAX(s.created_at) as last_order_date
  FROM sales s
  WHERE s.customer_name IS NOT NULL
  GROUP BY s.customer_name, s.customer_email, s.customer_phone
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get sales metrics
CREATE OR REPLACE FUNCTION get_sales_metrics(start_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  total_revenue BIGINT,
  total_sales BIGINT,
  average_order_value NUMERIC,
  top_product_name TEXT,
  top_product_quantity BIGINT,
  top_product_revenue BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH product_sales AS (
    SELECT 
      (item->>'product_name') as product_name,
      SUM((item->>'quantity')::INTEGER) as quantity,
      SUM((item->>'total_price')::INTEGER) as revenue
    FROM sales s,
         jsonb_array_elements(s.items) as item
    WHERE (start_date IS NULL OR s.created_at >= start_date)
    GROUP BY (item->>'product_name')
    ORDER BY quantity DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(SUM(s.total), 0) as total_revenue,
    COALESCE(COUNT(*), 0) as total_sales,
    COALESCE(AVG(s.total), 0) as average_order_value,
    ps.product_name as top_product_name,
    COALESCE(ps.quantity, 0) as top_product_quantity,
    COALESCE(ps.revenue, 0) as top_product_revenue
  FROM sales s
  LEFT JOIN product_sales ps ON true
  WHERE (start_date IS NULL OR s.created_at >= start_date);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get inventory turnover data
CREATE OR REPLACE FUNCTION get_inventory_turnover(start_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  quantity_sold BIGINT,
  days_with_sales BIGINT,
  average_daily_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'product_id') as product_id,
    (item->>'product_name') as product_name,
    SUM((item->>'quantity')::INTEGER) as quantity_sold,
    COUNT(DISTINCT DATE(s.created_at)) as days_with_sales,
    CASE 
      WHEN COUNT(DISTINCT DATE(s.created_at)) > 0 
      THEN SUM((item->>'quantity')::INTEGER)::NUMERIC / COUNT(DISTINCT DATE(s.created_at))
      ELSE 0 
    END as average_daily_sales
  FROM sales s,
       jsonb_array_elements(s.items) as item
  WHERE (start_date IS NULL OR s.created_at >= start_date)
  GROUP BY (item->>'product_id'), (item->>'product_name')
  ORDER BY quantity_sold DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_customers_from_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_turnover(TIMESTAMPTZ) TO authenticated;

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view sales" ON sales;
CREATE POLICY "Users can view sales" ON sales
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create sales" ON sales;
CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update sales" ON sales;
CREATE POLICY "Users can update sales" ON sales
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert some sample data with customer information
INSERT INTO sales (id, customer_name, customer_email, customer_phone, items, total, status, created_at) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440006',
    'John Doe',
    'john.doe@email.com',
    '+1234567890',
    '[
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440002",
        "quantity": 1,
        "unit_price": 500,
        "total_price": 500,
        "product_name": "Sample Product 1"
      }
    ]'::jsonb,
    500,
    'synced',
    NOW() - INTERVAL '3 hours'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440007',
    'Jane Smith',
    'jane.smith@email.com',
    '+0987654321',
    '[
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440003",
        "quantity": 2,
        "unit_price": 750,
        "total_price": 1500,
        "product_name": "Sample Product 2"
      }
    ]'::jsonb,
    1500,
    'synced',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING; 