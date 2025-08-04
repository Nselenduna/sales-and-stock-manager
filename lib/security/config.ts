export const SECURITY_CONFIG = {
  login: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    attemptsResetTime: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true,
    expiryDays: 90,
    preventReuse: 5, // number of previous passwords to check
  },
  session: {
    duration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    renewalThreshold: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
  },
  https: {
    enforceInProduction: true,
    allowedHosts: ['*.your-domain.com'],
  },
};
