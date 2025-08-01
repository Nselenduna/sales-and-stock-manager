# 🛡️ Input Sanitization Module

## Overview

The Input Sanitization Module provides comprehensive utilities for sanitizing user input to prevent XSS attacks, SQL injection, and other security vulnerabilities. It's designed to be used across all forms, search inputs, and authentication screens in the Sales and Stocks Manager application.

## Features

- **XSS Prevention**: Removes script tags, event handlers, and dangerous URLs
- **SQL Injection Detection**: Identifies and blocks common SQL injection patterns
- **Input Validation**: Type-specific validation for emails, passwords, SKUs, etc.
- **Whitespace Handling**: Configurable trimming and normalization
- **Length Limits**: Enforce maximum input lengths
- **Batch Processing**: Sanitize multiple inputs at once
- **Type Safety**: Full TypeScript support with proper typing

## Quick Start

### Basic Usage

```typescript
import { sanitizeInput } from '../lib/sanitize';

// Basic sanitization
const result = sanitizeInput(userInput);
if (result.isValid) {
  // Use result.value safely
  console.log('Sanitized input:', result.value);
} else {
  // Handle validation errors
  console.log('Errors:', result.errors);
}
```

### Field-Specific Sanitization

```typescript
import { 
  sanitizeEmail, 
  sanitizePassword, 
  sanitizeProductName,
  sanitizeSKU 
} from '../lib/sanitize';

// Email validation
const emailResult = sanitizeEmail('user@example.com');
if (emailResult.isValid) {
  // Email is valid and sanitized
}

// Password validation
const passwordResult = sanitizePassword('SecurePass123!');
if (passwordResult.isValid) {
  // Password meets requirements
}

// Product name sanitization
const nameResult = sanitizeProductName('  Product Name  ');
// Result: 'Product Name' (trimmed and sanitized)

// SKU validation
const skuResult = sanitizeSKU('SKU-123');
if (skuResult.isValid) {
  // SKU format is valid
}
```

## API Reference

### Core Functions

#### `sanitizeInput(input, options?)`

Main sanitization function with configurable options.

**Parameters:**
- `input`: `string | null | undefined` - The input to sanitize
- `options`: `SanitizeOptions` - Optional configuration

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizeInput('<script>alert("xss")</script>Hello World');
// Result: { value: 'Hello World', isValid: true, errors: [] }
```

#### `sanitizeEmail(email)`

Email-specific sanitization with format validation.

**Parameters:**
- `email`: `string | null | undefined` - Email address to validate

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizeEmail('user@example.com');
// Result: { value: 'user@example.com', isValid: true, errors: [] }
```

#### `sanitizePassword(password)`

Password-specific sanitization with length validation.

**Parameters:**
- `password`: `string | null | undefined` - Password to validate

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizePassword('SecurePass123!');
// Result: { value: 'SecurePass123!', isValid: true, errors: [] }
```

#### `sanitizeProductName(name)`

Product name sanitization with length limits.

**Parameters:**
- `name`: `string | null | undefined` - Product name to sanitize

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizeProductName('  Product Name  ');
// Result: { value: 'Product Name', isValid: true, errors: [] }
```

#### `sanitizeSKU(sku)`

SKU validation with format checking.

**Parameters:**
- `sku`: `string | null | undefined` - SKU to validate

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizeSKU('SKU-123');
// Result: { value: 'SKU-123', isValid: true, errors: [] }
```

#### `sanitizeNumeric(input, options?)`

Numeric input sanitization with bounds checking.

**Parameters:**
- `input`: `string | number | null | undefined` - Numeric input
- `options`: Object with `min`, `max`, `allowDecimals`, `allowNegative`

**Returns:** `SanitizeResult`

**Example:**
```typescript
const result = sanitizeNumeric('19.99', { min: 0, max: 1000 });
// Result: { value: '19.99', isValid: true, errors: [] }
```

### Batch Processing

#### `sanitizeBatch(inputs, fieldConfig)`

Sanitize multiple inputs with field-specific configurations.

**Parameters:**
- `inputs`: `Record<string, any>` - Object containing input values
- `fieldConfig`: `Record<string, SanitizeOptions>` - Configuration per field

**Returns:** `Record<string, SanitizeResult>`

**Example:**
```typescript
const inputs = {
  name: '  Product Name  ',
  email: 'user@example.com',
  sku: 'SKU-123',
  price: '19.99'
};

const fieldConfig = {
  name: { maxLength: 50 },
  email: { maxLength: 100 },
  sku: { maxLength: 20 },
  price: { maxLength: 10 }
};

const results = sanitizeBatch(inputs, fieldConfig);
```

#### `isBatchValid(results)`

Check if all results in a batch are valid.

**Parameters:**
- `results`: `Record<string, SanitizeResult>` - Batch sanitization results

**Returns:** `boolean`

**Example:**
```typescript
const isValid = isBatchValid(results);
if (isValid) {
  // All inputs are valid
}
```

#### `getBatchErrors(results)`

Extract all errors from batch results.

**Parameters:**
- `results`: `Record<string, SanitizeResult>` - Batch sanitization results

**Returns:** `Record<string, string[]>`

**Example:**
```typescript
const errors = getBatchErrors(results);
// Returns: { email: ['Invalid email format'], sku: ['Invalid SKU format'] }
```

## Configuration Options

### SanitizeOptions Interface

```typescript
interface SanitizeOptions {
  trim?: boolean;                    // Trim whitespace (default: true)
  escapeHtml?: boolean;              // Escape HTML entities (default: true)
  removeScripts?: boolean;           // Remove script content (default: true)
  maxLength?: number;                // Maximum input length
  allowEmpty?: boolean;              // Allow empty inputs (default: false)
  normalizeWhitespace?: boolean;     // Normalize whitespace (default: true)
}
```

### Default Options

```typescript
const DEFAULT_OPTIONS: SanitizeOptions = {
  trim: true,
  escapeHtml: true,
  removeScripts: true,
  maxLength: 1000,
  allowEmpty: false,
  normalizeWhitespace: true,
};
```

## Security Features

### XSS Prevention

The module removes or escapes:
- `<script>` tags and their content
- Event handlers (`onclick`, `onerror`, etc.)
- `javascript:` URLs
- `data:` URLs (potential XSS vectors)
- `vbscript:` URLs
- CSS `expression()` functions
- `eval()` function calls

### SQL Injection Detection

Detects common SQL injection patterns:
- SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, etc.)
- Boolean injection patterns (`OR 1=1`, `AND 1=1`)
- Multiple SQL statements

### Command Injection Detection

Identifies command injection attempts:
- Shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`, etc.)
- Common system commands (`cat`, `ls`, `pwd`, etc.)

### Input Validation

- **Email**: RFC 5321 compliant format validation
- **Password**: Minimum length requirements
- **SKU**: Alphanumeric with hyphens and underscores only
- **Numeric**: Configurable bounds and decimal handling

## Integration Examples

### Form Validation

```typescript
import { sanitizeBatch, isBatchValid, getBatchErrors } from '../lib/sanitize';

const validateProductForm = (formData: any) => {
  const fieldConfig = {
    name: { maxLength: 100, allowEmpty: false },
    sku: { maxLength: 50, allowEmpty: false },
    description: { maxLength: 500, allowEmpty: true },
    price: { maxLength: 20, allowEmpty: false }
  };

  const results = sanitizeBatch(formData, fieldConfig);
  
  if (isBatchValid(results)) {
    // All inputs are valid, proceed with submission
    const sanitizedData = Object.fromEntries(
      Object.entries(results).map(([key, result]) => [key, result.value])
    );
    return { isValid: true, data: sanitizedData };
  } else {
    // Handle validation errors
    const errors = getBatchErrors(results);
    return { isValid: false, errors };
  }
};
```

### Search Input Sanitization

```typescript
import { sanitizeSearchQuery } from '../lib/sanitize';

const handleSearch = (query: string) => {
  const result = sanitizeSearchQuery(query);
  
  if (result.isValid) {
    // Perform search with sanitized query
    performSearch(result.value);
  } else {
    // Show error message
    showError('Invalid search query');
  }
};
```

### Authentication Input Validation

```typescript
import { sanitizeEmail, sanitizePassword } from '../lib/sanitize';

const validateLoginForm = (email: string, password: string) => {
  const emailResult = sanitizeEmail(email);
  const passwordResult = sanitizePassword(password);
  
  if (emailResult.isValid && passwordResult.isValid) {
    // Proceed with authentication
    return { isValid: true, email: emailResult.value, password: passwordResult.value };
  } else {
    // Collect all errors
    const errors = [
      ...emailResult.errors,
      ...passwordResult.errors
    ];
    return { isValid: false, errors };
  }
};
```

## Error Handling

### Common Error Types

1. **Empty Input**: `'Input cannot be empty'`
2. **Length Exceeded**: `'Input exceeds maximum length of X characters'`
3. **Invalid Format**: `'Invalid email format'`, `'Invalid SKU format'`
4. **Security Threats**: 
   - `'Input contains potentially dangerous SQL patterns'`
   - `'Input contains potentially dangerous XSS patterns'`
   - `'Input contains potentially dangerous command patterns'`

### Error Response Structure

```typescript
interface SanitizeResult {
  value: string;           // Sanitized input value
  isValid: boolean;        // Whether input passed validation
  errors: string[];        // Array of error messages
  originalLength: number;  // Original input length
  sanitizedLength: number; // Sanitized input length
}
```

## Best Practices

### 1. Always Sanitize User Input

```typescript
// ❌ Don't use raw user input
const rawInput = userInput;

// ✅ Always sanitize
const sanitizedInput = sanitizeInput(userInput);
if (sanitizedInput.isValid) {
  // Use sanitizedInput.value
}
```

### 2. Use Field-Specific Functions

```typescript
// ❌ Generic sanitization for specific fields
const email = sanitizeInput(userEmail);

// ✅ Use field-specific functions
const email = sanitizeEmail(userEmail);
```

### 3. Handle Errors Gracefully

```typescript
const result = sanitizeInput(userInput);
if (!result.isValid) {
  // Show user-friendly error messages
  const errorMessage = result.errors.join(', ');
  showError(errorMessage);
  return;
}
```

### 4. Batch Process Form Data

```typescript
// ❌ Sanitize fields individually
const nameResult = sanitizeProductName(formData.name);
const skuResult = sanitizeSKU(formData.sku);
// ... more fields

// ✅ Use batch processing
const results = sanitizeBatch(formData, fieldConfig);
if (isBatchValid(results)) {
  // All fields are valid
}
```

### 5. Log Security Threats

```typescript
const result = sanitizeInput(userInput);
if (!result.isValid && result.errors.some(e => e.includes('dangerous'))) {
  // Log security threat for monitoring
  logSecurityThreat({
    input: userInput,
    errors: result.errors,
    timestamp: new Date(),
    userId: currentUser.id
  });
}
```

## Testing

The module includes comprehensive tests covering:
- Basic functionality
- Security features
- Field-specific validation
- Edge cases
- Error handling

Run tests with:
```bash
npm test -- __tests__/lib/sanitize.test.ts
```

## Performance Considerations

- **Efficient Regex**: Uses optimized regular expressions for pattern matching
- **Early Exit**: Stops processing when security threats are detected
- **Minimal Allocations**: Reuses objects where possible
- **Batch Processing**: Efficient handling of multiple inputs

## Security Notes

1. **Defense in Depth**: This module is one layer of security - always validate on the server side
2. **Regular Updates**: Keep the module updated with latest security patterns
3. **Monitoring**: Log and monitor security threats for analysis
4. **Input Limits**: Always set appropriate length limits for your use case

## Migration Guide

### From Manual Validation

**Before:**
```typescript
const validateInput = (input: string) => {
  if (!input.trim()) return 'Input is required';
  if (input.length > 100) return 'Input too long';
  return null;
};
```

**After:**
```typescript
import { sanitizeInput } from '../lib/sanitize';

const result = sanitizeInput(input, { maxLength: 100 });
if (!result.isValid) {
  return result.errors[0];
}
return result.value;
```

### From Basic Sanitization

**Before:**
```typescript
const sanitizeInput = (input: string) => {
  return input.trim().replace(/<script>/g, '');
};
```

**After:**
```typescript
import { sanitizeInput } from '../lib/sanitize';

const result = sanitizeInput(input);
return result.value; // Much more comprehensive sanitization
```

---

**Note**: This module is designed to work with React Native and provides comprehensive security for mobile applications. Always test thoroughly in your specific use case and consider additional server-side validation for critical operations. 