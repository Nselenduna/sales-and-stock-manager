-- Fix Analytics Functions Type Mismatches
-- This script fixes the database function return type issues

-- ============================================================================
-- CLEANUP: Drop existing functions that conflict
-- ============================================================================

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS get_inventory_turnover(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_sales_metrics(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_customers_from_sales();
DROP FUNCTION IF EXISTS get_user_permissions(TEXT);

-- Drop old trigger function that references non-existent columns
DROP FUNCTION IF EXISTS update_product_quantity_on_sale();

-- ============================================================================
-- FIX 1: Update get_sales_metrics function to return correct types
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_metrics(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  total_revenue NUMERIC(10,2),
  total_sales BIGINT,
  average_order_value NUMERIC(10,2),
  top_product TEXT,
  top_product_revenue NUMERIC(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total), 0) / 100.0 as total_revenue, -- Convert pence to dollars
    COALESCE(COUNT(*), 0) as total_sales,
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(s.total), 0) / COUNT(*) / 100.0
      ELSE 0 
    END as average_order_value,
    COALESCE(
      (SELECT item->>'product_name' 
       FROM sales s2, jsonb_array_elements(s2.items) as item
       WHERE s2.created_at >= start_date
       GROUP BY item->>'product_name'
       ORDER BY SUM((item->>'total_price')::integer) DESC
       LIMIT 1), 
      'No products'
    ) as top_product,
    COALESCE(
      (SELECT SUM((item->>'total_price')::integer) / 100.0
       FROM sales s3, jsonb_array_elements(s3.items) as item
       WHERE s3.created_at >= start_date
       GROUP BY item->>'product_name'
       ORDER BY SUM((item->>'total_price')::integer) DESC
       LIMIT 1),
      0
    ) as top_product_revenue
  FROM sales s
  WHERE s.created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 2: Update get_customers_from_sales function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customers_from_sales()
RETURNS TABLE(
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_spent NUMERIC(10,2),
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
-- FIX 3: Create get_inventory_turnover function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_turnover(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  product_name TEXT,
  sku TEXT,
  current_stock INTEGER,
  units_sold INTEGER,
  turnover_rate NUMERIC(5,2),
  days_of_inventory INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name as product_name,
    p.sku,
    p.quantity as current_stock,
    COALESCE(sales_data.units_sold, 0) as units_sold,
    CASE 
      WHEN p.quantity > 0 THEN 
        COALESCE(sales_data.units_sold, 0)::NUMERIC / p.quantity
      ELSE 0 
    END as turnover_rate,
    CASE 
      WHEN COALESCE(sales_data.units_sold, 0) > 0 THEN 
        (p.quantity * 30) / sales_data.units_sold
      ELSE 999 
    END as days_of_inventory
  FROM products p
  LEFT JOIN (
    SELECT 
      (item->>'product_id')::UUID as product_id,
      SUM((item->>'quantity')::integer) as units_sold
    FROM sales s, jsonb_array_elements(s.items) as item
    WHERE s.created_at >= start_date
    GROUP BY (item->>'product_id')::UUID
  ) sales_data ON p.id = sales_data.product_id
  ORDER BY turnover_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 4: Create get_user_permissions function (if needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions(user_role TEXT)
RETURNS TABLE(
  permission_id TEXT,
  permission_name TEXT,
  permission_description TEXT,
  category TEXT,
  granted BOOLEAN
) AS $$
BEGIN
  -- Return basic permissions based on role
  RETURN QUERY
  SELECT 
    'view_inventory' as permission_id,
    'View Inventory' as permission_name,
    'View product inventory and stock levels' as permission_description,
    'inventory' as category,
    CASE WHEN user_role IN ('admin', 'staff', 'viewer') THEN true ELSE false END as granted
  UNION ALL
  SELECT 
    'edit_inventory' as permission_id,
    'Edit Inventory' as permission_name,
    'Add, edit, and delete products' as permission_description,
    'inventory' as category,
    CASE WHEN user_role IN ('admin', 'staff') THEN true ELSE false END as granted
  UNION ALL
  SELECT 
    'view_sales' as permission_id,
    'View Sales' as permission_name,
    'View sales history and reports' as permission_description,
    'sales' as category,
    CASE WHEN user_role IN ('admin', 'staff', 'viewer') THEN true ELSE false END as granted
  UNION ALL
  SELECT 
    'create_sales' as permission_id,
    'Create Sales' as permission_name,
    'Create new sales transactions' as permission_description,
    'sales' as category,
    CASE WHEN user_role IN ('admin', 'staff') THEN true ELSE false END as granted
  UNION ALL
  SELECT 
    'view_analytics' as permission_id,
    'View Analytics' as permission_name,
    'View analytics and reports' as permission_description,
    'analytics' as category,
    CASE WHEN user_role IN ('admin', 'staff', 'viewer') THEN true ELSE false END as granted
  UNION ALL
  SELECT 
    'manage_users' as permission_id,
    'Manage Users' as permission_name,
    'Manage user accounts and permissions' as permission_description,
    'admin' as category,
    CASE WHEN user_role = 'admin' THEN true ELSE false END as granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 5: Create new trigger function for updating product quantities
-- ============================================================================

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

-- Create trigger for updating product quantities when a sale is completed
DROP TRIGGER IF EXISTS trigger_update_product_quantity ON sales;
CREATE TRIGGER trigger_update_product_quantity
  AFTER INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_product_quantity_on_sale();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the functions
SELECT 'get_sales_metrics' as function_name, 
       (SELECT COUNT(*) FROM get_sales_metrics()) as result_count
UNION ALL
SELECT 'get_customers_from_sales' as function_name,
       (SELECT COUNT(*) FROM get_customers_from_sales()) as result_count
UNION ALL
SELECT 'get_inventory_turnover' as function_name,
       (SELECT COUNT(*) FROM get_inventory_turnover()) as result_count
UNION ALL
SELECT 'get_user_permissions' as function_name,
       (SELECT COUNT(*) FROM get_user_permissions('staff')) as result_count;

DO $$
BEGIN
  RAISE NOTICE 'Analytics functions fixed successfully!';
END $$; 