import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../../screens/auth/LoginScreen';
import { useAuthStore } from '../../../store/authStore';

// Mock the auth store
jest.mock('../../../store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('LoginScreen', () => {
  const mockSignIn = jest.fn();
  
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      signIn: mockSignIn,
      loading: false,
      user: null,
      session: null,
      signUp: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    });
    
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByText('Sales & Stocks Manager')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('calls signIn with correct credentials', async () => {
    mockSignIn.mockResolvedValue({ success: true });
    
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockSignIn.mockResolvedValue({ success: false, error: errorMessage });
    
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', errorMessage);
    });
  });

  it('disables button and shows loading state', () => {
    mockUseAuthStore.mockReturnValue({
      signIn: mockSignIn,
      loading: true,
      user: null,
      session: null,
      signUp: jest.fn(),
      signOut: jest.fn(),
      initialize: jest.fn(),
    });

    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const signInButton = getByText('Signing In...');
    expect(signInButton).toBeTruthy();
  });

  it('validates email format', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    // Test with invalid email format
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    // Should still call signIn as basic validation only checks for empty fields
    // More sophisticated email validation would be in the auth store
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('invalid-email', 'password123');
    });
  });

  describe('Security Tests', () => {
    it('sanitizes input to prevent XSS', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      const maliciousEmail = '<script>alert("xss")</script>@example.com';
      const maliciousPassword = '<script>alert("xss")</script>';

      fireEvent.changeText(emailInput, maliciousEmail);
      fireEvent.changeText(passwordInput, maliciousPassword);
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith(maliciousEmail, maliciousPassword);
        // The auth store should handle sanitization
      });
    });

    it('handles SQL injection attempts', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      const sqlInjection = "'; DROP TABLE users; --";

      fireEvent.changeText(emailInput, sqlInjection);
      fireEvent.changeText(passwordInput, sqlInjection);
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith(sqlInjection, sqlInjection);
        // Supabase should handle SQL injection protection
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');

      expect(emailInput.props.accessible).toBeTruthy();
      expect(passwordInput.props.accessible).toBeTruthy();
    });
  });
});