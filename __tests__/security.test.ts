/**
 * Security Features Test Suite
 * 
 * Tests for rate limiting, security manager, and authentication security.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { rateLimiter, checkLoginRateLimit, formatRateLimitMessage } from '../../lib/security/rateLimiter';
import { securityManager } from '../../lib/security/securityManager';
import { sanitizeEmail, sanitizePassword, sanitizeInput } from '../../lib/sanitize';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('checkRateLimit', () => {
    it('should allow first attempt', async () => {
      const result = await rateLimiter.checkRateLimit('test@example.com', 'login', {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.blocked).toBe(false);
    });

    it('should block after max attempts', async () => {
      // Mock existing record with max attempts
      const existingRecord = {
        count: 5,
        firstAttempt: Date.now() - 60000, // 1 minute ago
        lastAttempt: Date.now() - 30000,   // 30 seconds ago
        blocked: false,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingRecord));

      const result = await rateLimiter.checkRateLimit('test@example.com', 'login', {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000,
      });

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockExpiresAt).toBeDefined();
    });

    it('should reset after window expires', async () => {
      // Mock existing record outside window
      const existingRecord = {
        count: 3,
        firstAttempt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
        lastAttempt: Date.now() - 18 * 60 * 1000,  // 18 minutes ago
        blocked: false,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingRecord));

      const result = await rateLimiter.checkRateLimit('test@example.com', 'login', {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.blocked).toBe(false);
    });
  });

  describe('helper functions', () => {
    it('should format rate limit messages correctly', () => {
      const blockedResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30 * 60 * 1000,
        blocked: true,
        blockExpiresAt: Date.now() + 30 * 60 * 1000,
      };

      const message = formatRateLimitMessage(blockedResult, 'login');
      expect(message).toContain('login attempts');
      expect(message).toContain('minute');
    });

    it('should handle login rate limiting', async () => {
      const result = await checkLoginRateLimit('test@example.com');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });
  });
});

describe('Security Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const result = securityManager.validatePasswordStrength('StrongP@ssw0rd123');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.requirements.length).toBe(true);
      expect(result.requirements.uppercase).toBe(true);
      expect(result.requirements.lowercase).toBe(true);
      expect(result.requirements.numbers).toBe(true);
      expect(result.requirements.symbols).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result = securityManager.validatePasswordStrength('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide helpful suggestions', () => {
      const result = securityManager.validatePasswordStrength('password');
      
      expect(result.suggestions).toContain('Include uppercase letters');
      expect(result.suggestions).toContain('Include numbers');
      expect(result.suggestions).toContain('Include special characters');
    });
  });

  describe('security events', () => {
    it('should log security events', async () => {
      await securityManager.logSecurityEvent({
        type: 'login',
        timestamp: Date.now(),
        userId: 'test-user-id',
        email: 'test@example.com',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should detect suspicious activity', async () => {
      // Mock security events with many failed logins
      const events = Array.from({ length: 15 }, (_, i) => ({
        type: 'failed_login' as const,
        timestamp: Date.now() - i * 60000, // Spread over time
        userId: 'test-user-id',
        email: 'test@example.com',
      }));

      securityManager['securityEvents'] = events;

      const isSuspicious = await securityManager.checkSuspiciousActivity('test-user-id');
      expect(isSuspicious).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should update security configuration', async () => {
      const newConfig = {
        sessionTimeout: 60 * 60 * 1000, // 1 hour
        enforceStrongPasswords: false,
      };

      await securityManager.updateConfig(newConfig);
      
      const config = securityManager.getConfig();
      expect(config.sessionTimeout).toBe(60 * 60 * 1000);
      expect(config.enforceStrongPasswords).toBe(false);
    });

    it('should generate security reports', () => {
      const report = securityManager.generateSecurityReport();
      
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('eventsSummary');
      expect(report).toHaveProperty('recentEvents');
      expect(report.eventsSummary).toHaveProperty('total');
      expect(report.eventsSummary).toHaveProperty('byType');
    });
  });
});

describe('Input Sanitization Security', () => {
  describe('email sanitization', () => {
    it('should accept valid emails', () => {
      const result = sanitizeEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      const result = sanitizeEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should handle malicious email inputs', () => {
      const result = sanitizeEmail('user@example.com<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('password sanitization', () => {
    it('should accept valid passwords', () => {
      const result = sanitizePassword('ValidPassword123!');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('ValidPassword123!');
    });

    it('should reject short passwords', () => {
      const result = sanitizePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should remove dangerous content from passwords', () => {
      const result = sanitizePassword('password<script>alert("xss")</script>123');
      expect(result.value).not.toContain('<script>');
      expect(result.value).not.toContain('alert');
    });
  });

  describe('general input sanitization', () => {
    it('should escape HTML entities', () => {
      const result = sanitizeInput('<div>Hello & "World"</div>');
      expect(result.value).toBe('&lt;div&gt;Hello &amp; &quot;World&quot;&lt;/div&gt;');
    });

    it('should remove script tags', () => {
      const result = sanitizeInput('Hello <script>alert("xss")</script> World');
      expect(result.value).not.toContain('<script>');
      expect(result.value).not.toContain('alert');
    });

    it('should detect SQL injection patterns', () => {
      const result = sanitizeInput("'; DROP TABLE users; --");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input contains potentially dangerous SQL patterns');
    });

    it('should handle long inputs', () => {
      const longInput = 'a'.repeat(2000);
      const result = sanitizeInput(longInput, { maxLength: 1000 });
      expect(result.value.length).toBe(1000);
      expect(result.errors).toContain('Input exceeds maximum length of 1000 characters');
    });
  });
});

describe('Security Integration', () => {
  it('should work together for login process', async () => {
    // Test complete login security flow
    const email = 'test@example.com';
    const password = 'SecurePassword123!';

    // 1. Sanitize inputs
    const emailResult = sanitizeEmail(email);
    const passwordResult = sanitizePassword(password);

    expect(emailResult.isValid).toBe(true);
    expect(passwordResult.isValid).toBe(true);

    // 2. Check rate limits
    const rateLimitResult = await checkLoginRateLimit(email);
    expect(rateLimitResult.allowed).toBe(true);

    // 3. Validate password strength
    const strengthResult = securityManager.validatePasswordStrength(password);
    expect(strengthResult.isValid).toBe(true);
  });

  it('should block suspicious login attempts', async () => {
    const email = 'attacker@example.com';

    // Simulate multiple failed attempts
    for (let i = 0; i < 6; i++) {
      await rateLimiter.checkRateLimit(email, 'login', {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000,
      });
    }

    // Next attempt should be blocked
    const result = await checkLoginRateLimit(email);
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
  });
});