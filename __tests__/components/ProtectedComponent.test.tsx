/**
 * Protected Component Tests
 * Tests for role-based access control components
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProtectedComponent, ProtectedScreen } from '../../components/ProtectedComponent';

// Mock auth store
const mockAuthStore = {
  userRole: 'admin'
};

jest.mock('../../store/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

describe('ProtectedComponent', () => {
  test('should render children when user has required permission', () => {
    mockAuthStore.userRole = 'admin';
    
    render(
      <ProtectedComponent requiredPermission="sales:view">
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.getByTestId('protected-content')).toBeTruthy();
  });

  test('should not render children when user lacks permission', () => {
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedComponent requiredPermission="users:assign_roles">
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('should render fallback when showFallback is true and access denied', () => {
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedComponent 
        requiredPermission="users:assign_roles" 
        showFallback={true}
        fallback={<div testID="fallback-content">Access Denied</div>}
      >
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.getByTestId('fallback-content')).toBeTruthy();
  });

  test('should work with multiple permissions (ANY)', () => {
    mockAuthStore.userRole = 'manager';
    
    render(
      <ProtectedComponent 
        requiredPermissions={['sales:view', 'inventory:view']}
        requireAll={false}
      >
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.getByTestId('protected-content')).toBeTruthy();
  });

  test('should work with multiple permissions (ALL)', () => {
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedComponent 
        requiredPermissions={['sales:view', 'inventory:edit']}
        requireAll={true}
      >
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  test('should allow access when no permissions specified', () => {
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedComponent>
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.getByTestId('protected-content')).toBeTruthy();
  });

  test('should handle null user role', () => {
    mockAuthStore.userRole = null;
    
    render(
      <ProtectedComponent requiredPermission="sales:view">
        <div testID="protected-content">Protected Content</div>
      </ProtectedComponent>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
  });
});

describe('ProtectedScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    mockNavigation.goBack.mockClear();
  });

  test('should render children when user has permission', () => {
    mockAuthStore.userRole = 'admin';
    
    render(
      <ProtectedScreen 
        requiredPermission="users:view"
        navigation={mockNavigation}
      >
        <div testID="screen-content">Screen Content</div>
      </ProtectedScreen>
    );

    expect(screen.getByTestId('screen-content')).toBeTruthy();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  test('should show access denied when user lacks permission', () => {
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedScreen 
        requiredPermission="users:view"
        navigation={mockNavigation}
      >
        <div testID="screen-content">Screen Content</div>
      </ProtectedScreen>
    );

    expect(screen.queryByTestId('screen-content')).toBeNull();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  test('should call onAccessDenied when provided', () => {
    const onAccessDenied = jest.fn();
    mockAuthStore.userRole = 'cashier';
    
    render(
      <ProtectedScreen 
        requiredPermission="users:view"
        onAccessDenied={onAccessDenied}
      >
        <div testID="screen-content">Screen Content</div>
      </ProtectedScreen>
    );

    expect(onAccessDenied).toHaveBeenCalled();
  });
});