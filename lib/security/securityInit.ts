/**
 * Security Initialization Module
 * 
 * Initializes all security features when the app starts.
 * This should be imported and called early in the app lifecycle.
 */

import { securityManager, initializeSecurity } from './security';
import { Alert } from 'react-native';

export interface SecurityInitConfig {
  enableRateLimit: boolean;
  enableSecurityLogging: boolean;
  enforceHttps: boolean;
  sessionTimeout: number;
  enforceStrongPasswords: boolean;
  autoInitialize: boolean;
}

const DEFAULT_INIT_CONFIG: SecurityInitConfig = {
  enableRateLimit: true,
  enableSecurityLogging: true,
  enforceHttps: !__DEV__, // Only enforce HTTPS in production
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  enforceStrongPasswords: true,
  autoInitialize: true,
};

class SecurityInitializer {
  private initialized = false;
  private config: SecurityInitConfig;

  constructor(config: Partial<SecurityInitConfig> = {}) {
    this.config = { ...DEFAULT_INIT_CONFIG, ...config };
  }

  /**
   * Initialize all security features
   */
  async initialize(): Promise<{ success: boolean; errors: string[] }> {
    if (this.initialized) {
      return { success: true, errors: [] };
    }

    const errors: string[] = [];

    try {
      console.log('🔐 Initializing security features...');

      // 1. Initialize HTTPS enforcement
      if (this.config.enforceHttps) {
        await initializeSecurity();
        console.log('✅ HTTPS enforcement initialized');
      }

      // 2. Initialize security manager
      await securityManager.init({
        sessionTimeout: this.config.sessionTimeout,
        enforceStrongPasswords: this.config.enforceStrongPasswords,
        logSecurityEvents: this.config.enableSecurityLogging,
        maxConcurrentSessions: 3,
        enableBiometric: false, // Future enhancement
      });
      console.log('✅ Security manager initialized');

      // 3. Validate environment security
      const envValidation = await this.validateEnvironment();
      if (!envValidation.isSecure) {
        errors.push(...envValidation.issues);
        console.warn('⚠️ Environment security issues:', envValidation.issues);
      }

      // 4. Log successful initialization
      await securityManager.logSecurityEvent({
        type: 'login',
        timestamp: Date.now(),
        details: 'Security system initialized',
      });

      this.initialized = true;
      console.log('🔐 Security initialization complete');

      return { success: true, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Security initialization failed: ${errorMessage}`);
      console.error('❌ Security initialization failed:', error);
      
      return { success: false, errors };
    }
  }

  /**
   * Validate environment for security issues
   */
  private async validateEnvironment(): Promise<{ isSecure: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check required environment variables
    const requiredVars = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check Supabase URL security
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      if (!supabaseUrl.startsWith('https://') && !__DEV__) {
        issues.push('Supabase URL should use HTTPS in production');
      }
      if (supabaseUrl.includes('localhost') && !__DEV__) {
        issues.push('Production app should not use localhost URLs');
      }
    }

    return {
      isSecure: issues.length === 0,
      issues,
    };
  }

  /**
   * Show security status to user if there are issues
   */
  async showSecurityStatus(): Promise<void> {
    const result = await this.initialize();
    
    if (!result.success || result.errors.length > 0) {
      // Only show to developers, not end users
      if (__DEV__) {
        Alert.alert(
          'Security Notice',
          `Security initialization completed with warnings:\n\n${result.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    }
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset initialization (for testing)
   */
  reset(): void {
    this.initialized = false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityInitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityInitConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const securityInitializer = new SecurityInitializer();

/**
 * Initialize security features - call this early in your app
 */
export async function initializeAppSecurity(config?: Partial<SecurityInitConfig>): Promise<void> {
  if (config) {
    securityInitializer.updateConfig(config);
  }
  
  await securityInitializer.initialize();
}

/**
 * Show security status to developers
 */
export async function showSecurityStatus(): Promise<void> {
  await securityInitializer.showSecurityStatus();
}

/**
 * Quick security check for critical issues
 */
export function quickSecurityCheck(): {
  hasCriticalIssues: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check environment variables
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
    issues.push('Supabase URL not configured');
    recommendations.push('Set EXPO_PUBLIC_SUPABASE_URL in your environment');
  }

  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push('Supabase anonymous key not configured');
    recommendations.push('Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment');
  }

  // Check production security
  if (!__DEV__) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      issues.push('Insecure Supabase URL in production');
      recommendations.push('Use HTTPS URLs for all external services in production');
    }
  }

  return {
    hasCriticalIssues: issues.length > 0,
    issues,
    recommendations,
  };
}

// Auto-initialize if configured to do so
if (DEFAULT_INIT_CONFIG.autoInitialize && !__DEV__) {
  // Only auto-initialize in production to avoid issues during development
  initializeAppSecurity().catch(error => {
    console.error('Auto-initialization failed:', error);
  });
}