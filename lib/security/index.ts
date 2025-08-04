/**
 * Security Module Index
 * 
 * Centralized exports for all security-related utilities and components.
 */

// Rate Limiter
export {
  rateLimiter,
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkPasswordResetRateLimit,
  checkApiCallRateLimit,
  formatRateLimitMessage,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
  type AttemptRecord,
} from './rateLimiter';

// Security Manager
export {
  securityManager,
  isSecureEnvironment,
  generateDeviceFingerprint,
  DEFAULT_SECURITY_CONFIG,
  type SecurityConfig,
  type SecurityEvent,
} from './securityManager';

// HTTPS Enforcer
export {
  httpsEnforcer,
  isHttpsUrl,
  getSecurityHeaders,
  validateEnvironmentSecurity,
  initializeSecurity,
  DEFAULT_SECURITY_HEADERS,
  type SecurityHeadersConfig,
} from './httpsEnforcer';

// Security utilities and constants
export const SECURITY_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  SESSION_TIMEOUT_DEFAULT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CONCURRENT_SESSIONS: 3,
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
} as const;

// Security validation functions
export function validateSecurityConfig(config: Partial<SecurityConfig>): string[] {
  const errors: string[] = [];
  
  if (config.sessionTimeout !== undefined) {
    if (config.sessionTimeout < 5 * 60 * 1000) { // 5 minutes minimum
      errors.push('Session timeout must be at least 5 minutes');
    }
    if (config.sessionTimeout > 7 * 24 * 60 * 60 * 1000) { // 7 days maximum
      errors.push('Session timeout cannot exceed 7 days');
    }
  }
  
  if (config.maxConcurrentSessions !== undefined) {
    if (config.maxConcurrentSessions < 1) {
      errors.push('Must allow at least 1 concurrent session');
    }
    if (config.maxConcurrentSessions > 10) {
      errors.push('Cannot exceed 10 concurrent sessions');
    }
  }
  
  return errors;
}

// Security helper functions
export function formatSecurityEventType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getSecurityLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    low: '#059669',     // green
    medium: '#eab308',  // yellow
    high: '#ea580c',    // orange
    critical: '#dc2626', // red
  };
  return colors[level];
}

export function calculateSecurityScore(events: SecurityEvent[]): {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
} {
  const recentEvents = events.filter(
    event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
  );
  
  const failedLogins = recentEvents.filter(e => e.type === 'failed_login').length;
  const rateLimits = recentEvents.filter(e => e.type === 'rate_limit').length;
  const suspiciousActivity = recentEvents.filter(e => e.type === 'suspicious_activity').length;
  
  let score = 100; // Start with perfect score
  const recommendations: string[] = [];
  
  // Deduct points for security issues
  score -= failedLogins * 2;
  score -= rateLimits * 3;
  score -= suspiciousActivity * 10;
  
  // Add recommendations based on issues
  if (failedLogins > 5) {
    recommendations.push('Consider implementing stronger authentication measures');
  }
  if (rateLimits > 3) {
    recommendations.push('Review rate limiting configuration');
  }
  if (suspiciousActivity > 0) {
    recommendations.push('Investigate suspicious activity immediately');
  }
  
  // Determine security level
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 90) level = 'low';
  else if (score >= 70) level = 'medium';
  else if (score >= 50) level = 'high';
  else level = 'critical';
  
  return {
    score: Math.max(0, score),
    level,
    recommendations,
  };
}