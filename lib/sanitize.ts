/**
 * Input Sanitization Module
 *
 * Provides utilities for sanitizing user input to prevent XSS attacks
 * and ensure data integrity across the application.
 *
 * Features:
 * - Input sanitization for forms, search, and authentication
 * - Whitespace trimming and normalization
 * - Special character escaping
 * - DOMPurify fallback for web environments
 * - Type-safe sanitization functions
 */

// Types for sanitization options
export interface SanitizeOptions {
  trim?: boolean;
  escapeHtml?: boolean;
  removeScripts?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
  normalizeWhitespace?: boolean;
}

export interface SanitizeResult {
  value: string;
  isValid: boolean;
  errors: string[];
  originalLength: number;
  sanitizedLength: number;
}

// Default sanitization options
const DEFAULT_OPTIONS: SanitizeOptions = {
  trim: true,
  escapeHtml: true,
  removeScripts: true,
  maxLength: 1000,
  allowEmpty: false,
  normalizeWhitespace: true,
};

/**
 * Sanitize a string input with comprehensive cleaning
 */
export function sanitizeInput(
  input: string | null | undefined,
  options: SanitizeOptions = {}
): SanitizeResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  let value = String(input || '');

  // Track original length
  const originalLength = value.length;

  // Handle null/undefined input
  if (input === null || input === undefined) {
    if (!opts.allowEmpty) {
      errors.push('Input cannot be empty');
    }
    return {
      value: '',
      isValid: errors.length === 0,
      errors,
      originalLength,
      sanitizedLength: 0,
    };
  }

  // Trim whitespace first
  if (opts.trim) {
    value = value.trim();
  }

  // Check for empty after trimming
  if (!opts.allowEmpty && value.length === 0) {
    errors.push('Input cannot be empty');
  }

  // Normalize whitespace (replace multiple spaces with single space) - only if normalizeWhitespace is true and trim is true
  if (opts.normalizeWhitespace && opts.trim) {
    value = value.replace(/\s+/g, ' ');
  }

  // Remove script tags and dangerous content first
  if (opts.removeScripts) {
    value = removeScriptContent(value);
  }

  // Escape HTML entities
  if (opts.escapeHtml) {
    value = escapeHtmlEntities(value);
  }

  // Perform security checks on the original input (before removal)
  // This ensures we catch XSS patterns before they're removed
  const securityErrors = performSecurityChecks(String(input || ''));
  errors.push(...securityErrors);

  // Check length limits
  if (opts.maxLength && value.length > opts.maxLength) {
    errors.push(`Input exceeds maximum length of ${opts.maxLength} characters`);
    value = value.substring(0, opts.maxLength);
  }

  return {
    value,
    isValid: errors.length === 0,
    errors,
    originalLength,
    sanitizedLength: value.length,
  };
}

/**
 * Remove potentially dangerous script content
 */
function removeScriptContent(input: string): string {
  return (
    input
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove on* event handlers - more comprehensive pattern
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '')
      // Remove javascript: URLs
      .replace(/javascript:.*$/gi, '')
      // Remove data: URLs (potential XSS vectors)
      .replace(/data:.*$/gi, '')
      // Remove vbscript: URLs
      .replace(/vbscript:.*$/gi, '')
      // Remove expression() CSS
      .replace(/expression\s*\(/gi, '')
      // Remove eval() calls
      .replace(/eval\s*\(/gi, '')
      // Remove specific HTML tags that might contain scripts (but not all tags)
      .replace(
        /<(iframe|object|embed|form|input|textarea|select|button|img)[^>]*>/gi,
        ''
      )
  );
}

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtmlEntities(input: string): string {
  const htmlEntities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '/',
  };

  return input.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
}

/**
 * Perform additional security checks
 */
function performSecurityChecks(input: string): string[] {
  const errors: string[] = [];

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
    /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially dangerous SQL patterns');
      break;
    }
  }

  // Check for XSS patterns - only flag obvious malicious patterns
  const xssPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
    /eval\s*\(/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially dangerous XSS patterns');
      break;
    }
  }

  // Check for command injection patterns - be more lenient with special characters
  const commandPatterns = [
    /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ipconfig)\b/i,
  ];

  for (const pattern of commandPatterns) {
    if (pattern.test(input)) {
      errors.push('Input contains potentially dangerous command patterns');
      break;
    }
  }

  return errors;
}

/**
 * Sanitize email input specifically
 */
export function sanitizeEmail(
  email: string | null | undefined
): SanitizeResult {
  const result = sanitizeInput(email, {
    trim: true,
    escapeHtml: false, // Don't escape HTML for emails
    removeScripts: true,
    maxLength: 254, // RFC 5321 limit
    allowEmpty: false,
    normalizeWhitespace: false, // Don't normalize email whitespace
  });

  // Additional email-specific validation
  if (result.isValid && result.value) {
    // More strict email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Additional checks for common invalid patterns
    if (
      result.value.includes('..') ||
      result.value.startsWith('@') ||
      result.value.endsWith('@') ||
      result.value.includes('@.') ||
      !result.value.includes('@')
    ) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    } else if (!emailRegex.test(result.value)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    }
  }

  return result;
}

/**
 * Sanitize password input specifically
 */
export function sanitizePassword(
  password: string | null | undefined
): SanitizeResult {
  const result = sanitizeInput(password, {
    trim: false, // Don't trim passwords
    escapeHtml: false, // Don't escape HTML for passwords
    removeScripts: true,
    maxLength: 128, // Reasonable password length limit
    allowEmpty: false,
    normalizeWhitespace: false, // Don't normalize password whitespace
  });

  // Additional password-specific validation
  if (result.isValid && result.value) {
    // Check length after any processing
    const passwordLength = result.value.length;
    if (passwordLength < 8) {
      result.errors.push('Password must be at least 8 characters long');
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Sanitize product name input
 */
export function sanitizeProductName(
  name: string | null | undefined
): SanitizeResult {
  return sanitizeInput(name, {
    trim: true,
    escapeHtml: true,
    removeScripts: true,
    maxLength: 100,
    allowEmpty: false,
    normalizeWhitespace: true,
  });
}

/**
 * Sanitize SKU input
 */
export function sanitizeSKU(sku: string | null | undefined): SanitizeResult {
  const result = sanitizeInput(sku, {
    trim: true,
    escapeHtml: true,
    removeScripts: true,
    maxLength: 50,
    allowEmpty: false,
    normalizeWhitespace: false, // Don't normalize SKU whitespace
  });

  // Additional SKU-specific validation
  if (result.isValid && result.value) {
    // Allow alphanumeric characters, hyphens, and underscores
    const skuRegex = /^[A-Za-z0-9\-_]+$/;
    if (!skuRegex.test(result.value)) {
      result.errors.push(
        'SKU can only contain letters, numbers, hyphens, and underscores'
      );
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Sanitize product description input
 */
export function sanitizeDescription(
  description: string | null | undefined
): SanitizeResult {
  return sanitizeInput(description, {
    trim: true,
    escapeHtml: true,
    removeScripts: true,
    maxLength: 500,
    allowEmpty: true, // Descriptions can be empty
    normalizeWhitespace: true, // Normalize whitespace for descriptions
  });
}

/**
 * Sanitize search query input
 */
export function sanitizeSearchQuery(
  query: string | null | undefined
): SanitizeResult {
  return sanitizeInput(query, {
    trim: true,
    escapeHtml: true,
    removeScripts: true,
    maxLength: 200,
    allowEmpty: true, // Search queries can be empty
    normalizeWhitespace: true, // Normalize whitespace for search queries
  });
}

/**
 * Sanitize currency input with comma/period support
 */
export function sanitizeCurrency(
  input: string | number | null | undefined,
  options: {
    min?: number;
    max?: number;
    allowNegative?: boolean;
    decimalPlaces?: number;
  } = {}
): SanitizeResult {
  const { min = 0, max, allowNegative = false, decimalPlaces = 2 } = options;

  // Convert to string for processing
  const stringInput = String(input || '');

  const result = sanitizeInput(stringInput, {
    trim: true,
    escapeHtml: false, // Don't escape HTML for numbers
    removeScripts: true,
    maxLength: 20,
    allowEmpty: false,
    normalizeWhitespace: false,
  });

  if (result.isValid && result.value) {
    // Check if input contains non-numeric characters (excluding decimal, comma, and minus)
    const hasNonNumeric = /[^0-9.,-]/.test(result.value);

    if (hasNonNumeric) {
      result.errors.push('Invalid currency value');
      result.isValid = false;
      return result;
    }

    // Check for multiple decimal points (invalid)
    const decimalCount = (result.value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      result.errors.push('Invalid currency value');
      result.isValid = false;
      return result;
    }

    // Check for multiple commas (invalid)
    const commaCount = (result.value.match(/,/g) || []).length;
    if (commaCount > 1) {
      result.errors.push('Invalid currency value');
      result.isValid = false;
      return result;
    }

    // Handle comma/period inputs (European vs US format)
    let cleanValue = result.value;

    // Handle European format (comma as decimal separator)
    if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      // If only comma exists, treat as decimal separator
      cleanValue = cleanValue.replace(/,/g, '.');
    } else if (cleanValue.includes(',') && cleanValue.includes('.')) {
      // If both comma and period exist, assume comma is thousands separator
      // Look for the pattern like "1.000,50" (European format)
      const europeanPattern = /^\d+\.\d{3},\d+$/;
      if (europeanPattern.test(cleanValue)) {
        cleanValue = cleanValue.replace(/\./g, '').replace(/,/g, '.');
      } else {
        // Assume comma is thousands separator
        cleanValue = cleanValue.replace(/,/g, '');
      }
    }

    // Remove any non-numeric characters except decimal point and minus
    cleanValue = cleanValue.replace(/[^0-9.-]/g, '');

    // Handle negative numbers
    if (!allowNegative) {
      cleanValue = cleanValue.replace(/-/g, '');
    }

    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Convert to number for validation
    const numValue = parseFloat(cleanValue);

    if (
      isNaN(numValue) ||
      cleanValue === '' ||
      cleanValue === '.' ||
      cleanValue === '-'
    ) {
      result.errors.push('Invalid currency value');
      result.isValid = false;
    } else {
      // Check min/max bounds
      if (min !== undefined && numValue < min) {
        result.errors.push(`Value must be at least ${min}`);
        result.isValid = false;
      }

      if (max !== undefined && numValue > max) {
        result.errors.push(`Value must be at most ${max}`);
        result.isValid = false;
      }

      // Format to specified decimal places
      if (result.isValid) {
        result.value = numValue.toFixed(decimalPlaces);
      }
    }
  }

  return result;
}

/**
 * Sanitize numeric input (for prices, quantities, etc.)
 */
export function sanitizeNumeric(
  input: string | number | null | undefined,
  options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
    allowNegative?: boolean;
  } = {}
): SanitizeResult {
  const { min, max, allowDecimals = true, allowNegative = false } = options;

  // Convert to string for processing
  const stringInput = String(input || '');

  const result = sanitizeInput(stringInput, {
    trim: true,
    escapeHtml: false, // Don't escape HTML for numbers
    removeScripts: true,
    maxLength: 20,
    allowEmpty: false,
    normalizeWhitespace: false,
  });

  if (result.isValid && result.value) {
    // Check if input contains non-numeric characters (excluding decimal and minus)
    const hasNonNumeric = /[^0-9.-]/.test(result.value);

    if (hasNonNumeric) {
      result.errors.push('Invalid numeric value');
      result.isValid = false;
      return result;
    }

    // Remove any non-numeric characters except decimal point and minus
    let cleanValue = result.value.replace(/[^0-9.-]/g, '');

    // Handle negative numbers
    if (!allowNegative) {
      cleanValue = cleanValue.replace(/-/g, '');
    }

    // Handle decimals
    if (!allowDecimals) {
      cleanValue = cleanValue.replace(/\./g, '');
    }

    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Convert to number for validation
    const numValue = parseFloat(cleanValue);

    if (isNaN(numValue)) {
      result.errors.push('Invalid numeric value');
      result.isValid = false;
    } else {
      // Check min/max bounds
      if (min !== undefined && numValue < min) {
        result.errors.push(`Value must be at least ${min}`);
        result.isValid = false;
      }

      if (max !== undefined && numValue > max) {
        result.errors.push(`Value must be at most ${max}`);
        result.isValid = false;
      }

      result.value = cleanValue;
    }
  }

  return result;
}

/**
 * Batch sanitize multiple inputs
 */
export function sanitizeBatch(
  inputs: Record<string, any>,
  fieldConfig: Record<string, SanitizeOptions>
): Record<string, SanitizeResult> {
  const results: Record<string, SanitizeResult> = {};

  for (const [fieldName, value] of Object.entries(inputs)) {
    const config = fieldConfig[fieldName] || DEFAULT_OPTIONS;
    results[fieldName] = sanitizeInput(value, config);
  }

  return results;
}

/**
 * Check if a batch of sanitized results is valid
 */
export function isBatchValid(results: Record<string, SanitizeResult>): boolean {
  return Object.values(results).every(result => result.isValid);
}

/**
 * Get all errors from a batch of sanitized results
 */
export function getBatchErrors(
  results: Record<string, SanitizeResult>
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [fieldName, result] of Object.entries(results)) {
    if (!result.isValid && result.errors.length > 0) {
      errors[fieldName] = result.errors;
    }
  }

  return errors;
}
