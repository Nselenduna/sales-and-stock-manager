/**
 * Rate Limiter for Authentication and Sensitive Operations
 * 
 * Implements client-side rate limiting to prevent brute force attacks
 * and excessive API calls to sensitive endpoints.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockExpiresAt?: number;
}

export interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockExpiresAt?: number;
}

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 30 * 60 * 1000, // 30 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  apiCall: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
} as const;

class RateLimiter {
  private storagePrefix = 'rateLimit_';

  /**
   * Get storage key for a specific identifier and endpoint
   */
  private getStorageKey(identifier: string, endpoint: string): string {
    return `${this.storagePrefix}${endpoint}_${identifier}`;
  }

  /**
   * Get attempt record from storage
   */
  private async getAttemptRecord(identifier: string, endpoint: string): Promise<AttemptRecord | null> {
    try {
      const key = this.getStorageKey(identifier, endpoint);
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      
      return JSON.parse(stored) as AttemptRecord;
    } catch (error) {
      console.error('Error reading rate limit record:', error);
      return null;
    }
  }

  /**
   * Save attempt record to storage
   */
  private async saveAttemptRecord(
    identifier: string, 
    endpoint: string, 
    record: AttemptRecord
  ): Promise<void> {
    try {
      const key = this.getStorageKey(identifier, endpoint);
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.error('Error saving rate limit record:', error);
    }
  }

  /**
   * Clear attempt record from storage
   */
  private async clearAttemptRecord(identifier: string, endpoint: string): Promise<void> {
    try {
      const key = this.getStorageKey(identifier, endpoint);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing rate limit record:', error);
    }
  }

  /**
   * Check if an attempt is allowed and update the attempt record
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const record = await this.getAttemptRecord(identifier, endpoint);

    // If no record exists, this is the first attempt
    if (!record) {
      const newRecord: AttemptRecord = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      };
      await this.saveAttemptRecord(identifier, endpoint, newRecord);
      
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    // Check if currently blocked
    if (record.blocked && record.blockExpiresAt && now < record.blockExpiresAt) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockExpiresAt,
        blocked: true,
        blockExpiresAt: record.blockExpiresAt,
      };
    }

    // Check if the time window has expired
    const windowExpired = now - record.firstAttempt > config.windowMs;
    
    if (windowExpired || (record.blocked && record.blockExpiresAt && now >= record.blockExpiresAt)) {
      // Reset the window
      const newRecord: AttemptRecord = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      };
      await this.saveAttemptRecord(identifier, endpoint, newRecord);
      
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    // Within the time window - increment count
    const newCount = record.count + 1;
    
    if (newCount > config.maxAttempts) {
      // Block the user
      const blockExpiresAt = now + config.blockDurationMs;
      const blockedRecord: AttemptRecord = {
        ...record,
        count: newCount,
        lastAttempt: now,
        blocked: true,
        blockExpiresAt,
      };
      await this.saveAttemptRecord(identifier, endpoint, blockedRecord);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockExpiresAt,
        blocked: true,
        blockExpiresAt,
      };
    }

    // Update the record
    const updatedRecord: AttemptRecord = {
      ...record,
      count: newCount,
      lastAttempt: now,
    };
    await this.saveAttemptRecord(identifier, endpoint, updatedRecord);
    
    return {
      allowed: true,
      remaining: config.maxAttempts - newCount,
      resetTime: record.firstAttempt + config.windowMs,
      blocked: false,
    };
  }

  /**
   * Reset rate limit for a specific identifier and endpoint
   */
  async resetRateLimit(identifier: string, endpoint: string): Promise<void> {
    await this.clearAttemptRecord(identifier, endpoint);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const record = await this.getAttemptRecord(identifier, endpoint);

    if (!record) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    // Check if currently blocked
    if (record.blocked && record.blockExpiresAt && now < record.blockExpiresAt) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockExpiresAt,
        blocked: true,
        blockExpiresAt: record.blockExpiresAt,
      };
    }

    // Check if the time window has expired
    const windowExpired = now - record.firstAttempt > config.windowMs;
    
    if (windowExpired || (record.blocked && record.blockExpiresAt && now >= record.blockExpiresAt)) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    const remaining = Math.max(0, config.maxAttempts - record.count);
    return {
      allowed: remaining > 0,
      remaining,
      resetTime: record.firstAttempt + config.windowMs,
      blocked: false,
    };
  }

  /**
   * Clear all rate limit records (for debugging/admin purposes)
   */
  async clearAllRateLimits(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      await AsyncStorage.multiRemove(rateLimitKeys);
    } catch (error) {
      console.error('Error clearing all rate limits:', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Utility functions for common use cases
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(identifier, 'login', RATE_LIMIT_CONFIGS.login);
}

export async function checkRegisterRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(identifier, 'register', RATE_LIMIT_CONFIGS.register);
}

export async function checkPasswordResetRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(identifier, 'passwordReset', RATE_LIMIT_CONFIGS.passwordReset);
}

export async function checkApiCallRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit(identifier, 'apiCall', RATE_LIMIT_CONFIGS.apiCall);
}

/**
 * Format rate limit error message for user display
 */
export function formatRateLimitMessage(result: RateLimitResult, action: string = 'action'): string {
  if (!result.blocked) {
    return `Too many attempts. Please try again later. (${result.remaining} attempts remaining)`;
  }

  if (result.blockExpiresAt) {
    const minutes = Math.ceil((result.blockExpiresAt - Date.now()) / 60000);
    return `Too many ${action} attempts. Please try again in ${minutes} minute(s).`;
  }

  return `Too many ${action} attempts. Please try again later.`;
}