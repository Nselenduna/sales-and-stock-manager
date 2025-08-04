/**
 * Security Headers and Configuration Utilities
 * 
 * Provides security-related configurations and utilities for the mobile app,
 * including Supabase security enhancements and session management.
 */

import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecurityConfig {
  sessionTimeout: number; // in milliseconds
  maxConcurrentSessions: number;
  enforceStrongPasswords: boolean;
  logSecurityEvents: boolean;
  enableBiometric: boolean;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'rate_limit' | 'suspicious_activity';
  timestamp: number;
  userId?: string;
  email?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentSessions: 3,
  enforceStrongPasswords: true,
  logSecurityEvents: true,
  enableBiometric: false,
};

class SecurityManager {
  private config: SecurityConfig = DEFAULT_SECURITY_CONFIG;
  private securityEvents: SecurityEvent[] = [];
  private sessionCheckInterval?: NodeJS.Timeout;

  /**
   * Initialize security manager with configuration
   */
  async init(config?: Partial<SecurityConfig>): Promise<void> {
    if (config) {
      this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    }

    // Load stored security events
    await this.loadSecurityEvents();

    // Start session monitoring
    this.startSessionMonitoring();

    // Configure Supabase security
    await this.configureSupabaseSecurity();
  }

  /**
   * Configure Supabase client with enhanced security settings
   */
  private async configureSupabaseSecurity(): Promise<void> {
    // Set up auth state change listener for security monitoring
    supabase.auth.onAuthStateChange(async (event, session) => {
      await this.handleAuthStateChange(event, session);
    });
  }

  /**
   * Handle authentication state changes for security logging
   */
  private async handleAuthStateChange(event: string, session: any): Promise<void> {
    const securityEvent: SecurityEvent = {
      type: event === 'SIGNED_IN' ? 'login' : 'logout',
      timestamp: Date.now(),
      userId: session?.user?.id,
      email: session?.user?.email,
    };

    await this.logSecurityEvent(securityEvent);

    if (event === 'SIGNED_IN') {
      // Update last login time
      await this.updateLastLoginTime();
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.config.logSecurityEvents) return;

    this.securityEvents.push(event);

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }

    // Store events locally
    await this.saveSecurityEvents();

    // Log critical events to console for debugging
    if (['failed_login', 'rate_limit', 'suspicious_activity'].includes(event.type)) {
      console.warn('Security Event:', event);
    }
  }

  /**
   * Save security events to local storage
   */
  private async saveSecurityEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('securityEvents', JSON.stringify(this.securityEvents));
    } catch (error) {
      console.error('Failed to save security events:', error);
    }
  }

  /**
   * Load security events from local storage
   */
  private async loadSecurityEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('securityEvents');
      if (stored) {
        this.securityEvents = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
      this.securityEvents = [];
    }
  }

  /**
   * Get recent security events
   */
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit).reverse();
  }

  /**
   * Clear security events
   */
  async clearSecurityEvents(): Promise<void> {
    this.securityEvents = [];
    await AsyncStorage.removeItem('securityEvents');
  }

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    // Check session validity every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      await this.validateSession();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = undefined;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      // Check session timeout
      const lastLoginTime = await this.getLastLoginTime();
      if (lastLoginTime && Date.now() - lastLoginTime > this.config.sessionTimeout) {
        await this.forceLogout('Session timeout');
        return false;
      }

      // Refresh session if it's close to expiring
      const expiresAt = new Date(session.expires_at! * 1000).getTime();
      const timeToExpiry = expiresAt - Date.now();
      
      if (timeToExpiry < 5 * 60 * 1000) { // 5 minutes
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Failed to refresh session:', error);
          await this.forceLogout('Session refresh failed');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Force logout with reason
   */
  async forceLogout(reason: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'logout',
      timestamp: Date.now(),
      details: `Forced logout: ${reason}`,
    });

    await supabase.auth.signOut();
  }

  /**
   * Update last login time
   */
  private async updateLastLoginTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('lastLoginTime', Date.now().toString());
    } catch (error) {
      console.error('Failed to update last login time:', error);
    }
  }

  /**
   * Get last login time
   */
  private async getLastLoginTime(): Promise<number | null> {
    try {
      const stored = await AsyncStorage.getItem('lastLoginTime');
      return stored ? parseInt(stored) : null;
    } catch (error) {
      console.error('Failed to get last login time:', error);
      return null;
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      symbols: boolean;
    };
    suggestions: string[];
  } {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    const suggestions: string[] = [];

    if (!requirements.length) suggestions.push('Use at least 8 characters');
    if (!requirements.uppercase) suggestions.push('Include uppercase letters');
    if (!requirements.lowercase) suggestions.push('Include lowercase letters');
    if (!requirements.numbers) suggestions.push('Include numbers');
    if (!requirements.symbols) suggestions.push('Include special characters');

    const isValid = this.config.enforceStrongPasswords ? score >= 4 : score >= 2;

    return {
      isValid,
      score,
      requirements,
      suggestions,
    };
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(userId: string): Promise<boolean> {
    const recentEvents = this.securityEvents.filter(
      event => event.userId === userId && Date.now() - event.timestamp < 60 * 60 * 1000 // Last hour
    );

    const failedLogins = recentEvents.filter(event => event.type === 'failed_login').length;
    const rateLimitEvents = recentEvents.filter(event => event.type === 'rate_limit').length;

    // Flag as suspicious if there are many failed attempts or rate limit hits
    const isSuspicious = failedLogins > 10 || rateLimitEvents > 5;

    if (isSuspicious) {
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        timestamp: Date.now(),
        userId,
        details: `Failed logins: ${failedLogins}, Rate limits: ${rateLimitEvents}`,
      });
    }

    return isSuspicious;
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to storage
    try {
      await AsyncStorage.setItem('securityConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save security config:', error);
    }

    // Restart session monitoring if timeout changed
    if (newConfig.sessionTimeout) {
      this.stopSessionMonitoring();
      this.startSessionMonitoring();
    }
  }

  /**
   * Load security configuration from storage
   */
  async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('securityConfig');
      if (stored) {
        const loadedConfig = JSON.parse(stored);
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...loadedConfig };
      }
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
  }

  /**
   * Export security report
   */
  generateSecurityReport(): {
    config: SecurityConfig;
    eventsSummary: {
      total: number;
      byType: Record<string, number>;
      lastWeek: number;
    };
    recentEvents: SecurityEvent[];
  } {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEvents = this.securityEvents.filter(event => event.timestamp > weekAgo);
    
    const byType: Record<string, number> = {};
    this.securityEvents.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
    });

    return {
      config: this.config,
      eventsSummary: {
        total: this.securityEvents.length,
        byType,
        lastWeek: recentEvents.length,
      },
      recentEvents: this.getSecurityEvents(20),
    };
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Utility functions
export function isSecureEnvironment(): boolean {
  // In React Native, check if running in production
  return !__DEV__;
}

export function generateDeviceFingerprint(): string {
  // Simple device fingerprinting for React Native
  // In a real app, you might want to use a proper device ID library
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `mobile_${timestamp}_${random}`;
}