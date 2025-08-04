# Security Configuration Guide

This guide provides detailed instructions for configuring and managing security features in the Sales and Stock Manager application.

## Quick Start

### 1. Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
# Required - Supabase Configuration (use HTTPS URLs)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional - Security Configuration
EXPO_PUBLIC_SECURITY_ENFORCE_HTTPS=true
EXPO_PUBLIC_SECURITY_SESSION_TIMEOUT=86400000
EXPO_PUBLIC_SECURITY_MAX_SESSIONS=3
```

### 2. Initialize Security in Your App

Security is automatically initialized in `App.tsx`. You can customize the configuration:

```typescript
import { initializeAppSecurity } from './lib/security/securityInit';

await initializeAppSecurity({
  enableRateLimit: true,
  enableSecurityLogging: true,
  enforceHttps: !__DEV__,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  enforceStrongPasswords: true,
});
```

## Security Features Configuration

### Rate Limiting

Configure rate limits for different endpoints:

```typescript
import { RATE_LIMIT_CONFIGS } from './lib/security';

// Current default configuration:
const rateLimits = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,      // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,      // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 30 * 60 * 1000,      // 30 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  apiCall: {
    maxAttempts: 100,
    windowMs: 60 * 1000,           // 1 minute
    blockDurationMs: 5 * 60 * 1000,  // 5 minutes
  },
};
```

### Security Manager Configuration

```typescript
import { securityManager } from './lib/security';

await securityManager.updateConfig({
  sessionTimeout: 24 * 60 * 60 * 1000,    // 24 hours
  maxConcurrentSessions: 3,
  enforceStrongPasswords: true,
  logSecurityEvents: true,
  enableBiometric: false, // Future enhancement
});
```

### Password Policy Configuration

```typescript
// Password requirements are enforced automatically
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};
```

## Security Settings Screen

Access the security settings through the app navigation:

1. Navigate to Security Settings
2. View security overview with metrics
3. Configure security parameters
4. Monitor security events
5. Review rate limiting status

### Features Available:

- **Security Events Monitoring**: View real-time security events
- **Configuration Management**: Adjust security parameters
- **Rate Limit Display**: Current rate limiting configuration
- **Security Overview**: Quick security status summary

## Security Event Types

The system logs the following security events:

| Event Type | Description | Severity |
|-----------|-------------|----------|
| `login` | Successful user login | Info |
| `logout` | User logout | Info |
| `failed_login` | Failed login attempt | Warning |
| `password_change` | Password changed | Info |
| `rate_limit` | Rate limit exceeded | Warning |
| `suspicious_activity` | Suspicious behavior detected | Critical |

## HTTPS and Transport Security

### Development Environment

```typescript
// HTTPS enforcement is disabled in development
const securityConfig = {
  enforceHttps: !__DEV__, // false in development
};
```

### Production Environment

```typescript
// HTTPS is enforced in production
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

## Input Sanitization

All user inputs are automatically sanitized using the comprehensive sanitization system:

```typescript
import { sanitizeEmail, sanitizePassword, sanitizeInput } from './lib/sanitize';

// Email sanitization
const emailResult = sanitizeEmail(userEmail);
if (!emailResult.isValid) {
  console.log('Errors:', emailResult.errors);
}

// Password sanitization
const passwordResult = sanitizePassword(userPassword);
if (!passwordResult.isValid) {
  console.log('Errors:', passwordResult.errors);
}

// General input sanitization
const inputResult = sanitizeInput(userInput, {
  maxLength: 100,
  escapeHtml: true,
  removeScripts: true,
});
```

## Security Monitoring and Alerts

### Real-time Monitoring

```typescript
import { securityManager } from './lib/security';

// Get recent security events
const events = securityManager.getSecurityEvents(50);

// Check for suspicious activity
const isSuspicious = await securityManager.checkSuspiciousActivity(userId);

// Generate security report
const report = securityManager.generateSecurityReport();
```

### Security Alerts

The system automatically detects and logs:

- Multiple failed login attempts
- Rate limit violations
- Suspicious activity patterns
- Session anomalies
- Invalid input attempts

## Troubleshooting

### Common Security Issues

1. **Rate Limit Exceeded**
   - Wait for the block duration to expire
   - Check rate limit configuration
   - Clear rate limits if necessary (admin only)

2. **Session Timeout**
   - Increase session timeout in configuration
   - Check for automatic session refresh
   - Verify network connectivity

3. **HTTPS Errors**
   - Ensure all URLs use HTTPS in production
   - Check environment variable configuration
   - Validate Supabase URL format

4. **Input Validation Errors**
   - Review input sanitization rules
   - Check for special characters in inputs
   - Verify data format requirements

### Debug Commands

```typescript
// Clear all rate limits (development only)
await rateLimiter.clearAllRateLimits();

// Clear security events
await securityManager.clearSecurityEvents();

// Reset security configuration
await securityManager.updateConfig(DEFAULT_SECURITY_CONFIG);

// Validate environment security
const validation = validateEnvironmentSecurity();
console.log('Security validation:', validation);
```

## Security Testing

Run the security test suite:

```bash
# Run all security tests
npm test __tests__/security.test.ts

# Run specific security test categories
npm test -- --testNamePattern="Rate Limiter"
npm test -- --testNamePattern="Security Manager"
npm test -- --testNamePattern="Input Sanitization"
```

## Security Best Practices

### For Developers

1. **Always use the provided security utilities**
2. **Validate inputs on both client and server**
3. **Keep security configurations updated**
4. **Regular security audits and testing**
5. **Monitor security events regularly**

### For Production Deployment

1. **Use HTTPS for all external communications**
2. **Configure appropriate rate limits**
3. **Enable security event logging**
4. **Set strong password requirements**
5. **Monitor for suspicious activity**

### For Maintenance

1. **Regular security configuration reviews**
2. **Update security policies as needed**
3. **Clean up old security events periodically**
4. **Test security features after updates**
5. **Document security changes**

## Integration with Existing Features

The security system integrates seamlessly with:

- **Authentication System**: Enhanced with rate limiting and monitoring
- **User Management**: Password policy enforcement
- **Data Storage**: Secure session handling
- **API Communications**: Rate limiting and security headers
- **UI Components**: Security settings and monitoring screens

## Future Enhancements

Planned security improvements:

- **Biometric Authentication**: Fingerprint/Face ID support
- **Advanced Threat Detection**: ML-based pattern recognition
- **Hardware Security**: Secure Enclave integration
- **Zero-Trust Architecture**: Enhanced verification layers
- **Audit Logging**: Comprehensive security audit trails