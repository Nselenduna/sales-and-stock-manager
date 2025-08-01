-- Database Security Improvement Migration (Simplified)
-- This script improves database security by setting search_path = '' and fully qualifying table references
-- Run this SQL in your Supabase SQL editor

-- ============================================================================
-- SECURITY IMPROVEMENT: CORE FUNCTION SEARCH PATH FIXES
-- ============================================================================

-- 1. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Fix get_customers_from_sales function
CREATE OR REPLACE FUNCTION public.get_customers_from_sales()
RETURNS TABLE(
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_spent DECIMAL(10,2),
  total_orders BIGINT,
  last_order_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    SUM(s.total) as total_spent,
    COUNT(*) as total_orders,
    MAX(s.created_at) as last_order_date
  FROM public.sales s
  WHERE s.customer_name IS NOT NULL AND s.customer_name != 'Walk-in Customer'
  GROUP BY s.customer_name, s.customer_email, s.customer_phone
  ORDER BY total_spent DESC;
END;
$$;

-- 3. Fix get_sales_metrics function
CREATE OR REPLACE FUNCTION public.get_sales_metrics(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  total_revenue DECIMAL(10,2),
  total_sales BIGINT,
  average_order_value DECIMAL(10,2),
  top_product TEXT,
  top_product_revenue DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total), 0) as total_revenue,
    COUNT(*) as total_sales,
    COALESCE(AVG(s.total), 0) as average_order_value,
    (SELECT item->>'name' 
     FROM public.sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     GROUP BY item->>'name'
     ORDER BY SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
     DESC LIMIT 1) as top_product,
    (SELECT SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
     FROM public.sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     AND item->>'name' = (
       SELECT item->>'name' 
       FROM public.sales s3, jsonb_array_elements(s3.items) as item
       WHERE s3.created_at >= start_date
       GROUP BY item->>'name'
       ORDER BY SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
       DESC LIMIT 1
     )) as top_product_revenue
  FROM public.sales s
  WHERE s.created_at >= start_date;
END;
$$;

-- 4. Fix get_inventory_turnover function
CREATE OR REPLACE FUNCTION public.get_inventory_turnover(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  product_name TEXT,
  total_sold BIGINT,
  average_daily_sales DECIMAL(10,2),
  days_since_last_sale BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    item->>'name' as product_name,
    SUM((item->>'quantity')::int) as total_sold,
    AVG((item->>'quantity')::int) as average_daily_sales,
    EXTRACT(DAY FROM NOW() - MAX(s.created_at)) as days_since_last_sale
  FROM public.sales s, jsonb_array_elements(s.items) as item
  WHERE s.created_at >= start_date
  GROUP BY item->>'name'
  ORDER BY total_sold DESC;
END;
$$;

-- ============================================================================
-- ADDITIONAL SECURITY IMPROVEMENTS (OPTIONAL FUNCTIONS)
-- ============================================================================

-- 5. Create a secure get_sales_summary function (for future use)
CREATE OR REPLACE FUNCTION public.get_sales_summary(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  product_name TEXT,
  total_quantity BIGINT,
  total_revenue DECIMAL(10,2),
  avg_price DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    item->>'name' as product_name,
    SUM((item->>'quantity')::int) as total_quantity,
    SUM((item->>'quantity')::int * (item->>'unit_price')::decimal) as total_revenue,
    AVG((item->>'unit_price')::decimal) as avg_price
  FROM public.sales s, jsonb_array_elements(s.items) as item
  WHERE s.created_at >= start_date
  GROUP BY item->>'name'
  ORDER BY total_revenue DESC;
END;
$$;

-- ============================================================================
-- VERIFICATION AND LOGGING
-- ============================================================================

-- Display completion message
SELECT 'Database security improvements completed successfully!' as status;

-- Show which functions were updated
SELECT 
  'Updated function: ' || proname as function_updated
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname IN (
  'update_updated_at_column',
  'get_customers_from_sales',
  'get_sales_metrics',
  'get_inventory_turnover',
  'get_sales_summary'
); 