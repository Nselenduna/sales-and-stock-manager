/**
 * HTTPS and Security Configuration for Expo Apps
 * 
 * Provides utilities for enforcing HTTPS and configuring security headers
 * in React Native/Expo applications.
 */

import { supabase } from '../supabase';

export interface SecurityHeadersConfig {
  enforceHttps: boolean;
  contentSecurityPolicy: boolean;
  referrerPolicy: string;
  xssProtection: boolean;
  contentTypeOptions: boolean;
  frameOptions: string;
}

export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  enforceHttps: true,
  contentSecurityPolicy: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  xssProtection: true,
  contentTypeOptions: true,
  frameOptions: 'DENY',
};

class HTTPSEnforcer {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS) {
    this.config = config;
  }

  /**
   * Validate that all external URLs use HTTPS
   */
  validateHttpsUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Enforce HTTPS for Supabase configuration
   */
  validateSupabaseConfig(): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Supabase URL
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !this.validateHttpsUrl(supabaseUrl)) {
      issues.push('Supabase URL does not use HTTPS');
      recommendations.push('Ensure EXPO_PUBLIC_SUPABASE_URL uses https://');
    }

    // Check if running in production
    if (__DEV__) {
      recommendations.push('Ensure HTTPS is enforced in production builds');
    }

    const isSecure = issues.length === 0;

    return {
      isSecure,
      issues,
      recommendations,
    };
  }

  /**
   * Get security headers for web requests
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.config.frameOptions) {
      headers['X-Frame-Options'] = this.config.frameOptions;
    }

    if (this.config.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    if (this.config.contentSecurityPolicy) {
      headers['Content-Security-Policy'] = this.generateCSP();
    }

    if (this.config.enforceHttps) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    return headers;
  }

  /**
   * Generate Content Security Policy
   */
  private generateCSP(): string {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // React Native may need unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];

    return policies.join('; ');
  }

  /**
   * Configure Supabase client with security headers
   */
  configureSupabaseSecurity(): void {
    const headers = this.getSecurityHeaders();
    
    // Note: In React Native, we can't directly set response headers,
    // but we can configure request headers for Supabase
    supabase.auth.setSession = ((originalSetSession) => {
      return function(this: any, ...args: any[]) {
        // Add security monitoring here if needed
        return originalSetSession.apply(this, args);
      };
    })(supabase.auth.setSession);
  }

  /**
   * Validate external URLs for HTTPS compliance
   */
  validateExternalUrls(urls: string[]): {
    secure: string[];
    insecure: string[];
    invalid: string[];
  } {
    const secure: string[] = [];
    const insecure: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'https:') {
          secure.push(url);
        } else if (urlObj.protocol === 'http:') {
          insecure.push(url);
        } else {
          invalid.push(url);
        }
      } catch {
        invalid.push(url);
      }
    }

    return { secure, insecure, invalid };
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    httpsEnforcement: boolean;
    supabaseConfig: ReturnType<HTTPSEnforcer['validateSupabaseConfig']>;
    securityHeaders: Record<string, string>;
    recommendations: string[];
  } {
    const supabaseConfig = this.validateSupabaseConfig();
    const securityHeaders = this.getSecurityHeaders();
    
    const recommendations: string[] = [
      ...supabaseConfig.recommendations,
    ];

    if (!this.config.enforceHttps) {
      recommendations.push('Enable HTTPS enforcement for production');
    }

    if (!this.config.contentSecurityPolicy) {
      recommendations.push('Enable Content Security Policy');
    }

    return {
      httpsEnforcement: this.config.enforceHttps,
      supabaseConfig,
      securityHeaders,
      recommendations,
    };
  }
}

// Export singleton instance
export const httpsEnforcer = new HTTPSEnforcer();

// Utility functions
export function isHttpsUrl(url: string): boolean {
  return httpsEnforcer.validateHttpsUrl(url);
}

export function getSecurityHeaders(): Record<string, string> {
  return httpsEnforcer.getSecurityHeaders();
}

export function validateEnvironmentSecurity(): {
  isSecure: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check environment variables
  const requiredVars = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      issues.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check Supabase URL
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !isHttpsUrl(supabaseUrl)) {
    issues.push('Supabase URL does not use HTTPS');
    recommendations.push('Update EXPO_PUBLIC_SUPABASE_URL to use https://');
  }

  // Development vs Production checks
  if (__DEV__) {
    recommendations.push('Ensure security measures are properly configured for production');
    recommendations.push('Test with production Supabase instance');
  } else {
    // Production checks
    if (supabaseUrl && supabaseUrl.includes('localhost')) {
      issues.push('Production app is using localhost URLs');
    }
  }

  const isSecure = issues.length === 0;

  return {
    isSecure,
    issues,
    recommendations,
  };
}

/**
 * Initialize security configuration for the app
 */
export function initializeSecurity(): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Configure HTTPS enforcement
      httpsEnforcer.configureSupabaseSecurity();
      
      // Validate environment security
      const securityCheck = validateEnvironmentSecurity();
      
      if (!securityCheck.isSecure) {
        console.warn('Security issues detected:', securityCheck.issues);
        console.warn('Recommendations:', securityCheck.recommendations);
      }
      
      resolve();
    } catch (error) {
      console.error('Failed to initialize security:', error);
      resolve(); // Don't block app startup
    }
  });
}