import { RateLimiter } from '../lib/security/rateLimiting';
import { PasswordSecurity } from '../lib/security/passwordSecurity';
import { HttpsEnforcement } from '../lib/security/httpsEnforcement';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

// Mock window for HTTPS enforcement tests
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    hostname: 'app.your-domain.com',
    href: 'http://app.your-domain.com/test',
  },
  writable: true,
});

describe('Security Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RateLimiter', () => {
    const testEmail = 'test@example.com';

    it('should allow login when no previous attempts', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const isAllowed = await RateLimiter.isLoginAllowed(testEmail);
      expect(isAllowed).toBe(true);
    });

    it('should block login after max failed attempts', async () => {
      const failedAttempts = Array(5).fill({
        timestamp: Date.now(),
        success: false,
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(failedAttempts));
      
      const isAllowed = await RateLimiter.isLoginAllowed(testEmail);
      expect(isAllowed).toBe(false);
    });

    it('should record login attempts', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      await RateLimiter.recordLoginAttempt(testEmail, true);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `loginAttempts:${testEmail}`,
        expect.stringContaining('true')
      );
    });

    it('should allow login after lockout period expires', async () => {
      const oldFailedAttempts = Array(5).fill({
        timestamp: Date.now() - (20 * 60 * 1000), // 20 minutes ago
        success: false,
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(oldFailedAttempts));
      
      const isAllowed = await RateLimiter.isLoginAllowed(testEmail);
      expect(isAllowed).toBe(true);
    });
  });

  describe('PasswordSecurity', () => {
    it('should validate password strength correctly', () => {
      const weakPassword = 'password123';
      const strongPassword = 'StrongP@ssw0rd123!';

      const weakResult = PasswordSecurity.validatePassword(weakPassword);
      expect(weakResult.isValid).toBe(false);
      expect(weakResult.errors).toContain('Password must be at least 12 characters long');
      expect(weakResult.errors).toContain('Password must contain at least one uppercase letter');
      expect(weakResult.errors).toContain('Password must contain at least one special character');

      const strongResult = PasswordSecurity.validatePassword(strongPassword);
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.errors).toHaveLength(0);
    });

    it('should handle password history', async () => {
      const userId = 'user123';
      const passwordHash = 'hash123';

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await PasswordSecurity.addToPasswordHistory(userId, passwordHash);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `passwordHistory:${userId}`,
        expect.stringContaining(passwordHash)
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([
        { hash: passwordHash, timestamp: Date.now() }
      ]));

      const isUsed = await PasswordSecurity.isPasswordPreviouslyUsed(userId, passwordHash);
      expect(isUsed).toBe(true);
    });

    it('should detect expired passwords', async () => {
      const userId = 'user123';
      const expiredPasswordHistory = [
        { hash: 'old-hash', timestamp: Date.now() - (100 * 24 * 60 * 60 * 1000) } // 100 days ago
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredPasswordHistory));
      
      const isExpired = await PasswordSecurity.isPasswordExpired(userId);
      expect(isExpired).toBe(true);
    });
  });

  describe('HttpsEnforcement', () => {
    it('should require HTTPS in production web environment', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(HttpsEnforcement.isHttpsRequired()).toBe(true);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not require HTTPS in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      expect(HttpsEnforcement.isHttpsRequired()).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should validate allowed hosts', () => {
      const validHost = 'app.your-domain.com';
      const invalidHost = 'malicious-site.com';

      expect(HttpsEnforcement.validateHost(validHost)).toBe(true);
      expect(HttpsEnforcement.validateHost(invalidHost)).toBe(false);
    });

    it('should validate wildcard hosts', () => {
      const validSubdomain = 'api.your-domain.com';
      const invalidDomain = 'your-domain.com.evil.com';

      expect(HttpsEnforcement.validateHost(validSubdomain)).toBe(true);
      expect(HttpsEnforcement.validateHost(invalidDomain)).toBe(false);
    });
  });
});