-- Complete Database Schema Migration
-- This script combines all schema changes from previous phases and adds new security features

-- ============================================================================
-- PHASE 4B: SALES & ANALYTICS SCHEMA FIXES
-- ============================================================================

-- 1. Add missing columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- 3. Update existing sales records
UPDATE sales 
SET customer_name = 'Walk-in Customer' 
WHERE customer_name IS NULL;

-- 4. Create sales_analytics view
CREATE OR REPLACE VIEW sales_analytics AS
SELECT 
  s.id,
  s.customer_name,
  s.customer_email,
  s.customer_phone,
  s.payment_method,
  s.total,
  s.created_at,
  s.notes,
  jsonb_array_elements(s.items) as item
FROM sales s;

-- 5. Create function to get customers from sales
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
    SUM(s.total) as total_spent,
    COUNT(*) as total_orders,
    MAX(s.created_at) as last_order_date
  FROM sales s
  WHERE s.customer_name IS NOT NULL AND s.customer_name != 'Walk-in Customer'
  GROUP BY s.customer_name, s.customer_email, s.customer_phone
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get sales metrics
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
    COALESCE(SUM(s.total), 0) as total_revenue,
    COUNT(*) as total_sales,
    COALESCE(AVG(s.total), 0) as average_order_value,
    (SELECT item->>'name' 
     FROM sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     GROUP BY item->>'name'
     ORDER BY SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
     DESC LIMIT 1) as top_product,
    (SELECT SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
     FROM sales s2, jsonb_array_elements(s2.items) as item
     WHERE s2.created_at >= start_date
     AND item->>'name' = (
       SELECT item->>'name' 
       FROM sales s3, jsonb_array_elements(s3.items) as item
       WHERE s3.created_at >= start_date
       GROUP BY item->>'name'
       ORDER BY SUM((item->>'quantity')::int * (item->>'unit_price')::decimal)
       DESC LIMIT 1
     )) as top_product_revenue
  FROM sales s
  WHERE s.created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get inventory turnover
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
    item->>'name' as product_name,
    SUM((item->>'quantity')::int) as total_sold,
    ROUND(
      SUM((item->>'quantity')::int)::decimal / 
      GREATEST(EXTRACT(EPOCH FROM (NOW() - start_date)) / 86400, 1), 
      2
    ) as average_daily_sales,
    EXTRACT(EPOCH FROM (NOW() - MAX(s.created_at))) / 86400 as days_since_last_sale
  FROM sales s, jsonb_array_elements(s.items) as item
  WHERE s.created_at >= start_date
  GROUP BY item->>'name'
  ORDER BY total_sold DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 5A: USER MANAGEMENT SCHEMA
-- ============================================================================

-- 8. Create user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  department TEXT,
  position TEXT,
  hire_date DATE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create user_activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sales', 'inventory', 'users', 'reports', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create role_permissions table for role-based access control
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- ============================================================================
-- PHASE 5B: ADVANCED SECURITY FEATURES
-- ============================================================================

-- 12. Create security_settings table
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create failed_login_attempts table for security monitoring
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  first_attempt TIMESTAMPTZ DEFAULT NOW(),
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ
);

-- 15. Create two_factor_auth table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL,
  backup_codes TEXT[],
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert default permissions
INSERT INTO permissions (id, name, description, category) VALUES
-- Sales permissions
('sales_view', 'View Sales', 'View sales records and history', 'sales'),
('sales_create', 'Create Sales', 'Create new sales transactions', 'sales'),
('sales_edit', 'Edit Sales', 'Modify existing sales records', 'sales'),
('sales_delete', 'Delete Sales', 'Delete sales records', 'sales'),
('sales_refund', 'Process Refunds', 'Process customer refunds', 'sales'),

-- Inventory permissions
('inventory_view', 'View Inventory', 'View product inventory', 'inventory'),
('inventory_create', 'Add Products', 'Add new products to inventory', 'inventory'),
('inventory_edit', 'Edit Products', 'Modify product information', 'inventory'),
('inventory_delete', 'Delete Products', 'Remove products from inventory', 'inventory'),
('inventory_adjust', 'Adjust Stock', 'Adjust product quantities', 'inventory'),

-- User management permissions
('users_view', 'View Users', 'View user list and profiles', 'users'),
('users_create', 'Create Users', 'Create new user accounts', 'users'),
('users_edit', 'Edit Users', 'Modify user information and roles', 'users'),
('users_delete', 'Delete Users', 'Remove user accounts', 'users'),
('users_permissions', 'Manage Permissions', 'Manage user permissions and roles', 'users'),

-- Reports permissions
('reports_view', 'View Reports', 'Access to view reports and analytics', 'reports'),
('reports_export', 'Export Reports', 'Export reports to various formats', 'reports'),
('reports_create', 'Create Reports', 'Create custom reports', 'reports'),

-- System permissions
('system_settings', 'System Settings', 'Access to system configuration', 'system'),
('system_backup', 'System Backup', 'Perform system backups', 'system'),
('system_logs', 'View Logs', 'Access system and activity logs', 'system')
ON CONFLICT (id) DO NOTHING;

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id, granted) VALUES
-- Admin permissions (all permissions granted)
('admin', 'sales_view', true),
('admin', 'sales_create', true),
('admin', 'sales_edit', true),
('admin', 'sales_delete', true),
('admin', 'sales_refund', true),
('admin', 'inventory_view', true),
('admin', 'inventory_create', true),
('admin', 'inventory_edit', true),
('admin', 'inventory_delete', true),
('admin', 'inventory_adjust', true),
('admin', 'users_view', true),
('admin', 'users_create', true),
('admin', 'users_edit', true),
('admin', 'users_delete', true),
('admin', 'users_permissions', true),
('admin', 'reports_view', true),
('admin', 'reports_export', true),
('admin', 'reports_create', true),
('admin', 'system_settings', true),
('admin', 'system_backup', true),
('admin', 'system_logs', true),

-- Manager permissions
('manager', 'sales_view', true),
('manager', 'sales_create', true),
('manager', 'sales_edit', true),
('manager', 'sales_refund', true),
('manager', 'inventory_view', true),
('manager', 'inventory_create', true),
('manager', 'inventory_edit', true),
('manager', 'inventory_adjust', true),
('manager', 'users_view', true),
('manager', 'reports_view', true),
('manager', 'reports_export', true),
('manager', 'system_logs', true),

-- Staff permissions
('staff', 'sales_view', true),
('staff', 'sales_create', true),
('staff', 'inventory_view', true),
('staff', 'inventory_adjust', true),
('staff', 'reports_view', true),

-- Viewer permissions
('viewer', 'sales_view', true),
('viewer', 'inventory_view', true),
('viewer', 'reports_view', true)
ON CONFLICT (role, permission_id) DO UPDATE SET granted = EXCLUDED.granted;

-- Insert default security settings
INSERT INTO security_settings (setting_key, setting_value, description) VALUES
('password_min_length', '8', 'Minimum password length'),
('password_require_uppercase', 'true', 'Require uppercase letters in passwords'),
('password_require_lowercase', 'true', 'Require lowercase letters in passwords'),
('password_require_numbers', 'true', 'Require numbers in passwords'),
('password_require_special', 'true', 'Require special characters in passwords'),
('session_timeout_minutes', '30', 'Session timeout in minutes'),
('max_login_attempts', '5', 'Maximum failed login attempts before blocking'),
('block_duration_minutes', '15', 'Duration to block account after max failed attempts'),
('require_2fa_admin', 'true', 'Require 2FA for admin accounts'),
('require_2fa_manager', 'false', 'Require 2FA for manager accounts'),
('api_rate_limit_requests', '100', 'API rate limit requests per minute'),
('api_rate_limit_window', '60', 'API rate limit window in seconds')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Insert sample activity logs
INSERT INTO user_activity_logs (user_email, user_name, action, details, severity) VALUES
('admin@example.com', 'Admin User', 'LOGIN', 'User logged in successfully', 'info'),
('manager@example.com', 'Manager User', 'SALE_CREATED', 'Created new sale #SALE-001 for $150.00', 'info'),
('admin@example.com', 'Admin User', 'USER_CREATED', 'Created new user: staff@example.com', 'info'),
('staff@example.com', 'Staff User', 'INVENTORY_UPDATE', 'Updated product quantity for "Laptop" from 10 to 8', 'warning'),
('manager@example.com', 'Manager User', 'LOGIN_FAILED', 'Failed login attempt with incorrect password', 'warning'),
('admin@example.com', 'Admin User', 'SYSTEM_BACKUP', 'Automated system backup completed successfully', 'info'),
('unknown@example.com', 'Unknown User', 'UNAUTHORIZED_ACCESS', 'Attempted to access admin panel without permission', 'error'),
('admin@example.com', 'Admin User', 'DATA_EXPORT', 'Exported sales report for Q1 2024', 'info');

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_severity ON user_activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);

-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_role TEXT)
RETURNS TABLE(permission_id TEXT, granted BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT rp.permission_id, rp.granted
  FROM role_permissions rp
  WHERE rp.role = user_role AND rp.granted = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT,
  p_action TEXT,
  p_details TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (
    user_id, user_email, user_name, action, details, 
    ip_address, user_agent, severity, metadata
  ) VALUES (
    p_user_id, p_user_email, p_user_name, p_action, p_details,
    p_ip_address, p_user_agent, p_severity, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_activities BIGINT,
  error_count BIGINT,
  warning_count BIGINT,
  login_count BIGINT,
  most_active_user TEXT,
  most_common_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_activities,
    COUNT(*) FILTER (WHERE severity = 'error' OR severity = 'critical') as error_count,
    COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE action = 'LOGIN') as login_count,
    (SELECT user_name FROM user_activity_logs 
     WHERE created_at BETWEEN p_start_date AND p_end_date
     GROUP BY user_name 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as most_active_user,
    (SELECT action FROM user_activity_logs 
     WHERE created_at BETWEEN p_start_date AND p_end_date
     GROUP BY action 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as most_common_action
  FROM user_activity_logs
  WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  blocked_until TIMESTAMPTZ;
BEGIN
  SELECT f.blocked_until INTO blocked_until
  FROM failed_login_attempts f
  WHERE f.email = p_email AND f.is_blocked = true
  LIMIT 1;
  
  IF blocked_until IS NOT NULL AND blocked_until > NOW() THEN
    RETURN true;
  END IF;
  
  -- Check IP-based blocking
  IF p_ip_address IS NOT NULL THEN
    SELECT f.blocked_until INTO blocked_until
    FROM failed_login_attempts f
    WHERE f.ip_address = p_ip_address AND f.is_blocked = true
    LIMIT 1;
    
    IF blocked_until IS NOT NULL AND blocked_until > NOW() THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  max_attempts INTEGER;
  block_duration INTEGER;
BEGIN
  -- Get security settings
  SELECT (setting_value::integer) INTO max_attempts
  FROM security_settings
  WHERE setting_key = 'max_login_attempts';
  
  SELECT (setting_value::integer) INTO block_duration
  FROM security_settings
  WHERE setting_key = 'block_duration_minutes';
  
  -- Insert or update failed login attempt
  INSERT INTO failed_login_attempts (email, ip_address, user_agent, attempt_count)
  VALUES (p_email, p_ip_address, p_user_agent, 1)
  ON CONFLICT (email) DO UPDATE SET
    attempt_count = failed_login_attempts.attempt_count + 1,
    last_attempt = NOW(),
    is_blocked = CASE 
      WHEN failed_login_attempts.attempt_count + 1 >= COALESCE(max_attempts, 5) 
      THEN true 
      ELSE false 
    END,
    blocked_until = CASE 
      WHEN failed_login_attempts.attempt_count + 1 >= COALESCE(max_attempts, 5) 
      THEN NOW() + (COALESCE(block_duration, 15) || ' minutes')::interval
      ELSE NULL 
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SET UP ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "Users can view sales" ON sales
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own sales" ON sales
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view their own activity" ON user_activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for permissions (read-only for authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for role_permissions
CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_sessions
CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for failed_login_attempts (admin only)
CREATE POLICY "Admins can view failed login attempts" ON failed_login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for two_factor_auth
CREATE POLICY "Users can manage their own 2FA" ON two_factor_auth
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant basic permissions to authenticated users
GRANT SELECT ON sales TO authenticated;
GRANT INSERT ON sales TO authenticated;
GRANT UPDATE ON sales TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_activity_logs TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;
GRANT SELECT ON failed_login_attempts TO authenticated;
GRANT SELECT ON two_factor_auth TO authenticated;

-- Grant additional permissions to admins (handled by RLS policies)
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_activity_logs TO authenticated;
GRANT ALL ON role_permissions TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON failed_login_attempts TO authenticated;
GRANT ALL ON two_factor_auth TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_customers_from_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_turnover(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, INET, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login(TEXT, INET, TEXT) TO authenticated;

-- ============================================================================
-- CREATE VIEWS
-- ============================================================================

-- Create user management dashboard view
CREATE OR REPLACE VIEW user_management_dashboard AS
SELECT 
  up.id,
  up.full_name,
  au.email,
  up.role,
  up.is_active,
  up.department,
  up.position,
  up.hire_date,
  up.last_login,
  up.created_at,
  COUNT(ual.id) as activity_count,
  MAX(ual.created_at) as last_activity
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
LEFT JOIN user_activity_logs ual ON up.id = ual.user_id
GROUP BY up.id, up.full_name, au.email, up.role, up.is_active, 
         up.department, up.position, up.hire_date, up.last_login, up.created_at;

-- Create security dashboard view
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE role = 'manager') as manager_users,
  COUNT(*) FILTER (WHERE role = 'staff') as staff_users,
  COUNT(*) FILTER (WHERE role = 'viewer') as viewer_users,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '24 hours') as users_active_24h,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as users_active_7d
FROM user_profiles;

-- Grant access to views
GRANT SELECT ON user_management_dashboard TO authenticated;
GRANT SELECT ON security_dashboard TO authenticated;
GRANT SELECT ON sales_analytics TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE sales IS 'Sales transactions with customer information and payment details';
COMMENT ON TABLE user_profiles IS 'Extended user profiles with role and department information';
COMMENT ON TABLE user_activity_logs IS 'Audit trail for user activities and system events';
COMMENT ON TABLE permissions IS 'Available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Role-based permission assignments';
COMMENT ON TABLE user_sessions IS 'User session management for security';
COMMENT ON TABLE failed_login_attempts IS 'Failed login attempt tracking for security';
COMMENT ON TABLE two_factor_auth IS 'Two-factor authentication settings';
COMMENT ON TABLE security_settings IS 'System-wide security configuration settings';

COMMENT ON VIEW user_management_dashboard IS 'Dashboard view for user management with activity statistics';
COMMENT ON VIEW security_dashboard IS 'Security overview dashboard with user statistics';
COMMENT ON VIEW sales_analytics IS 'Analytics view for sales data with customer information';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log the migration completion
INSERT INTO user_activity_logs (user_email, user_name, action, details, severity) VALUES
('system@example.com', 'System', 'DATABASE_MIGRATION', 'Complete schema migration applied successfully', 'info'); 