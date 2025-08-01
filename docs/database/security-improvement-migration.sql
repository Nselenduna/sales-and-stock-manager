-- Database Security Improvement Migration
-- This script improves database security by setting search_path = '' and fully qualifying table references
-- Run this SQL in your Supabase SQL editor

-- ============================================================================
-- SECURITY IMPROVEMENT: FUNCTION SEARCH PATH FIXES
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

-- 5. Fix get_user_permissions function (only if permissions tables exist)
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_role TEXT)
RETURNS TABLE(
  permission_id TEXT,
  permission_name TEXT,
  permission_description TEXT,
  category TEXT,
  granted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only execute if permissions table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
    RETURN QUERY
    SELECT 
      p.id as permission_id,
      p.name as permission_name,
      p.description as permission_description,
      p.category,
      COALESCE(rp.granted, false) as granted
    FROM public.permissions p
    LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id AND rp.role = user_role
    ORDER BY p.category, p.name;
  END IF;
END;
$$;

-- 6. Fix log_user_activity function (only if user_activity_logs table exists)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT,
  p_action TEXT,
  p_details TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only execute if user_activity_logs table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
    INSERT INTO public.user_activity_logs (
      user_id,
      user_email,
      user_name,
      action,
      details,
      ip_address,
      user_agent,
      severity,
      metadata
    ) VALUES (
      p_user_id,
      p_user_email,
      p_user_name,
      p_action,
      p_details,
      p_ip_address,
      p_user_agent,
      p_severity,
      p_metadata
    );
  END IF;
END;
$$;

-- 7. Fix get_user_activity_summary function (only if user_activity_logs table exists)
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  action_count BIGINT,
  last_activity TIMESTAMPTZ,
  most_common_action TEXT,
  severity_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only execute if user_activity_logs table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
    RETURN QUERY
    SELECT 
      ual.user_id,
      ual.user_email,
      ual.user_name,
      COUNT(*) as action_count,
      MAX(ual.created_at) as last_activity,
      (SELECT action 
       FROM public.user_activity_logs ual2 
       WHERE ual2.user_id = ual.user_id 
       AND ual2.created_at BETWEEN start_date AND end_date
       GROUP BY action 
       ORDER BY COUNT(*) DESC 
       LIMIT 1) as most_common_action,
      jsonb_object_agg(ual.severity, COUNT(*)) as severity_distribution
    FROM public.user_activity_logs ual
    WHERE ual.created_at BETWEEN start_date AND end_date
    GROUP BY ual.user_id, ual.user_email, ual.user_name
    ORDER BY action_count DESC;
  END IF;
END;
$$;

-- 8. Fix is_user_blocked function (only if security tables exist)
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  max_attempts INTEGER;
  block_duration_minutes INTEGER;
  failed_attempts_count INTEGER;
BEGIN
  -- Only execute if security tables exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_settings') THEN
    -- Get security settings
    SELECT 
      (setting_value::integer) INTO max_attempts
    FROM public.security_settings 
    WHERE setting_key = 'max_failed_attempts';
    
    SELECT 
      (setting_value::integer) INTO block_duration_minutes
    FROM public.security_settings 
    WHERE setting_key = 'block_duration_minutes';
    
    -- Count recent failed attempts
    SELECT COUNT(*) INTO failed_attempts_count
    FROM public.failed_login_attempts
    WHERE email = p_email
    AND created_at > NOW() - (block_duration_minutes || ' minutes')::INTERVAL;
    
    -- Also check IP-based blocking if IP is provided
    IF p_ip_address IS NOT NULL THEN
      SELECT COUNT(*) INTO failed_attempts_count
      FROM public.failed_login_attempts
      WHERE (email = p_email OR ip_address = p_ip_address)
      AND created_at > NOW() - (block_duration_minutes || ' minutes')::INTERVAL;
    END IF;
    
    RETURN failed_attempts_count >= max_attempts;
  ELSE
    -- If security tables don't exist, return false (not blocked)
    RETURN false;
  END IF;
END;
$$;

-- 9. Fix record_failed_login function (only if failed_login_attempts table exists)
CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only execute if failed_login_attempts table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'failed_login_attempts') THEN
    INSERT INTO public.failed_login_attempts (
      email,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      p_email,
      p_ip_address,
      p_user_agent,
      NOW()
    );
  END IF;
END;
$$;

-- ============================================================================
-- ADDITIONAL SECURITY IMPROVEMENTS
-- ============================================================================

-- 10. Create a secure handle_new_user function (if needed for future use)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only execute if user_profiles table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.user_profiles (id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 11. Create a secure get_sales_summary function (if needed for future use)
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

-- 12. Create a secure update_product_quantity_on_sale function (if needed for future use)
CREATE OR REPLACE FUNCTION public.update_product_quantity_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item_record JSONB;
  product_id UUID;
  quantity_sold INTEGER;
BEGIN
  -- This function would update product quantities when a sale is made
  -- Implementation depends on your products table structure
  FOR item_record IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Extract product_id and quantity from the sale item
    product_id := (item_record->>'product_id')::UUID;
    quantity_sold := (item_record->>'quantity')::INTEGER;
    
    -- Update product quantity (assuming you have a products table)
    -- UPDATE public.products SET quantity = quantity - quantity_sold WHERE id = product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 13. Create a secure get_low_stock_products function (if needed for future use)
CREATE OR REPLACE FUNCTION public.get_low_stock_products(threshold INTEGER DEFAULT 10)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  current_quantity INTEGER,
  reorder_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- This function would return products with low stock
  -- Implementation depends on your products table structure
  -- RETURN QUERY
  -- SELECT p.id, p.name, p.quantity, p.reorder_level
  -- FROM public.products p
  -- WHERE p.quantity <= threshold
  -- ORDER BY p.quantity ASC;
  
  -- Placeholder return for now
  RETURN;
END;
$$;

-- 14. Create a secure update_products_updated_at function (if needed for future use)
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION AND LOGGING
-- ============================================================================

-- Log the security improvement completion (only if user_activity_logs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
    INSERT INTO public.user_activity_logs (user_email, user_name, action, details, severity) VALUES
    ('system@example.com', 'System', 'SECURITY_IMPROVEMENT', 'Database functions updated with search_path security fixes', 'info');
  END IF;
END $$;

-- Display completion message
SELECT 'Database security improvements completed successfully!' as status; 