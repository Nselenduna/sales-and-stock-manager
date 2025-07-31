-- User Management Database Migration
-- This script sets up the database schema for advanced user management features

-- 1. Create user_profiles table to extend auth.users
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

-- 2. Create user_activity_logs table for audit trail
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

-- 3. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sales', 'inventory', 'users', 'reports', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create role_permissions table for role-based access control
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- 5. Insert default permissions
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

-- 6. Insert default role permissions
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

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_severity ON user_activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 8. Create functions for user management

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

-- 9. Set up Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

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

-- 10. Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant permissions to authenticated users
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_activity_logs TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- Grant additional permissions to admins (handled by RLS policies)
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_activity_logs TO authenticated;
GRANT ALL ON role_permissions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_permissions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, INET, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 12. Insert sample activity logs
INSERT INTO user_activity_logs (user_email, user_name, action, details, severity) VALUES
('admin@example.com', 'Admin User', 'LOGIN', 'User logged in successfully', 'info'),
('manager@example.com', 'Manager User', 'SALE_CREATED', 'Created new sale #SALE-001 for $150.00', 'info'),
('admin@example.com', 'Admin User', 'USER_CREATED', 'Created new user: staff@example.com', 'info'),
('staff@example.com', 'Staff User', 'INVENTORY_UPDATE', 'Updated product quantity for "Laptop" from 10 to 8', 'warning'),
('manager@example.com', 'Manager User', 'LOGIN_FAILED', 'Failed login attempt with incorrect password', 'warning'),
('admin@example.com', 'Admin User', 'SYSTEM_BACKUP', 'Automated system backup completed successfully', 'info'),
('unknown@example.com', 'Unknown User', 'UNAUTHORIZED_ACCESS', 'Attempted to access admin panel without permission', 'error'),
('admin@example.com', 'Admin User', 'DATA_EXPORT', 'Exported sales report for Q1 2024', 'info');

-- 13. Create a view for user management dashboard
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

-- Grant access to the view
GRANT SELECT ON user_management_dashboard TO authenticated;

COMMENT ON TABLE user_profiles IS 'Extended user profiles with role and department information';
COMMENT ON TABLE user_activity_logs IS 'Audit trail for user activities and system events';
COMMENT ON TABLE permissions IS 'Available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Role-based permission assignments';
COMMENT ON VIEW user_management_dashboard IS 'Dashboard view for user management with activity statistics'; 