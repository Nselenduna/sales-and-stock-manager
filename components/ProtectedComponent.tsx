/**
 * Role-Based Access Control Components
 * Components for protecting UI elements and routes based on user permissions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../lib/permissions';

interface ProtectedComponentProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

/**
 * Wrapper component that conditionally renders children based on user permissions
 */
export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallback = null,
  showFallback = false,
}) => {
  const { userRole } = useAuthStore();

  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = hasPermission(userRole, requiredPermission);
  } else if (requiredPermissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(userRole, requiredPermissions)
      : hasAnyPermission(userRole, requiredPermissions);
  } else {
    // No permissions specified, allow access
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showFallback && fallback) {
    return <>{fallback}</>;
  }

  if (showFallback) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubtext}>
          You don't have permission to access this feature
        </Text>
      </View>
    );
  }

  return null;
};

interface ProtectedScreenProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  navigation?: {
    goBack: () => void;
  };
  onAccessDenied?: () => void;
}

/**
 * Screen wrapper that protects entire screens based on permissions
 */
export const ProtectedScreen: React.FC<ProtectedScreenProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  navigation,
  onAccessDenied,
}) => {
  const { userRole } = useAuthStore();

  React.useEffect(() => {
    let hasAccess = false;

    if (requiredPermission) {
      hasAccess = hasPermission(userRole, requiredPermission);
    } else if (requiredPermissions.length > 0) {
      hasAccess = requireAll 
        ? hasAllPermissions(userRole, requiredPermissions)
        : hasAnyPermission(userRole, requiredPermissions);
    } else {
      hasAccess = true;
    }

    if (!hasAccess) {
      if (onAccessDenied) {
        onAccessDenied();
      } else if (navigation) {
        navigation.goBack();
      }
    }
  }, [userRole, requiredPermission, requiredPermissions, requireAll, navigation, onAccessDenied]);

  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = hasPermission(userRole, requiredPermission);
  } else if (requiredPermissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(userRole, requiredPermissions)
      : hasAnyPermission(userRole, requiredPermissions);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return (
      <View style={styles.screenAccessDeniedContainer}>
        <Text style={styles.screenAccessDeniedTitle}>Access Denied</Text>
        <Text style={styles.screenAccessDeniedText}>
          You don't have permission to access this screen
        </Text>
        <Text style={styles.screenAccessDeniedSubtext}>
          Contact your administrator if you believe this is an error
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

interface RoleBasedNavigationProps {
  userRole: string | null;
  adminComponent?: React.ReactNode;
  managerComponent?: React.ReactNode;
  cashierComponent?: React.ReactNode;
  defaultComponent?: React.ReactNode;
}

/**
 * Component that renders different content based on user role
 */
export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  userRole,
  adminComponent,
  managerComponent,
  cashierComponent,
  defaultComponent,
}) => {
  switch (userRole) {
    case 'admin':
      return <>{adminComponent || defaultComponent}</>;
    case 'manager':
      return <>{managerComponent || defaultComponent}</>;
    case 'cashier':
      return <>{cashierComponent || defaultComponent}</>;
    default:
      return <>{defaultComponent}</>;
  }
};

const styles = StyleSheet.create({
  accessDeniedContainer: {
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
  },
  screenAccessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  screenAccessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  screenAccessDeniedText: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  screenAccessDeniedSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});