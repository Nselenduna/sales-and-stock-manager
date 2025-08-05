/**
 * Sanitization Module Tests
 * 
 * Comprehensive test suite for input sanitization utilities
 * covering security, edge cases, and specific field validations.
 */

import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePassword,
  sanitizeProductName,
  sanitizeSKU,
  sanitizeDescription,
  sanitizeSearchQuery,
  sanitizeNumeric,
  sanitizeCurrency,
  sanitizeBatch,
  isBatchValid,
  getBatchErrors,
} from '../../lib/sanitize';

describe('Sanitization Module', () => {
  describe('sanitizeInput - Basic Functionality', () => {
    it('should handle null and undefined inputs', () => {
      const nullResult = sanitizeInput(null);
      const undefinedResult = sanitizeInput(undefined);

      expect(nullResult.value).toBe('');
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Input cannot be empty');

      expect(undefinedResult.value).toBe('');
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('Input cannot be empty');
    });

    it('should allow empty inputs when configured', () => {
      const result = sanitizeInput('', { allowEmpty: true });
      expect(result.value).toBe('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should trim whitespace by default', () => {
      const result = sanitizeInput('  hello world  ');
      expect(result.value).toBe('hello world');
      expect(result.isValid).toBe(true);
    });

    it('should not trim when configured not to', () => {
      const result = sanitizeInput('  hello world  ', { trim: false });
      expect(result.value).toBe('  hello world  ');
      expect(result.isValid).toBe(true);
    });

    it('should normalize whitespace by default', () => {
      const result = sanitizeInput('hello    world\n\there');
      expect(result.value).toBe('hello world here');
      expect(result.isValid).toBe(true);
    });

    it('should respect max length limits', () => {
      const longString = 'a'.repeat(1001);
      const result = sanitizeInput(longString, { maxLength: 1000 });
      
      expect(result.value.length).toBe(1000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 1000 characters');
    });

    it('should track original and sanitized lengths', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      
      expect(result.originalLength).toBe(15);
      expect(result.sanitizedLength).toBe(11);
    });
  });

  describe('sanitizeInput - Security Features', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(maliciousInput);
      
      expect(result.value).toBe('Hello World');
      expect(result.isValid).toBe(true);
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<img src="x" onerror="alert(1)">Hello';
      const result = sanitizeInput(maliciousInput);
      
      expect(result.value).toBe('Hello');
      expect(result.isValid).toBe(true);
    });

    it('should remove javascript: URLs', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const result = sanitizeInput(maliciousInput);
      
      expect(result.value).toBe('');
      expect(result.isValid).toBe(true);
    });

    it('should remove data: URLs', () => {
      const maliciousInput = 'data:text/html,<script>alert("xss")</script>';
      const result = sanitizeInput(maliciousInput);
      
      expect(result.value).toBe('');
      expect(result.isValid).toBe(true);
    });

    it('should escape HTML entities', () => {
      const input = '<script>&"\'</script>';
      const result = sanitizeInput(input, { removeScripts: false });
      
      expect(result.value).toBe('&lt;script&gt;&amp;&quot;&#x27;&lt;/script&gt;');
      expect(result.isValid).toBe(true);
    });

    it('should detect SQL injection patterns', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const result = sanitizeInput(sqlInjection);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input contains potentially dangerous SQL patterns');
    });

    it('should detect XSS patterns', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = sanitizeInput(xssInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input contains potentially dangerous XSS patterns');
    });

    it('should detect command injection patterns', () => {
      const commandInput = 'cat /etc/passwd';
      const result = sanitizeInput(commandInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input contains potentially dangerous command patterns');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        const result = sanitizeEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(email);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example', // missing TLD
      ];

      invalidEmails.forEach(email => {
        const result = sanitizeEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });
    });

    it('should respect email length limits', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = sanitizeEmail(longEmail);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 254 characters');
    });

    it('should not escape HTML for emails', () => {
      const email = 'user@example.com';
      const result = sanitizeEmail(email);
      
      expect(result.value).toBe(email);
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizePassword', () => {
    it('should validate password length', () => {
      const shortPassword = '1234567';
      const result = sanitizePassword(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should accept valid passwords', () => {
      const validPassword = 'SecurePass123!';
      const result = sanitizePassword(validPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(validPassword);
    });

    it('should not trim passwords', () => {
      const password = '  password123  ';
      const result = sanitizePassword(password);
      
      expect(result.value).toBe('  password123  ');
      expect(result.isValid).toBe(true); // 15 characters, meets minimum length
    });

    it('should respect password length limits', () => {
      const longPassword = 'a'.repeat(129);
      const result = sanitizePassword(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 128 characters');
    });
  });

  describe('sanitizeProductName', () => {
    it('should sanitize product names correctly', () => {
      const productName = '  Product Name 123  ';
      const result = sanitizeProductName(productName);
      
      expect(result.value).toBe('Product Name 123');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty product names', () => {
      const result = sanitizeProductName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input cannot be empty');
    });

    it('should respect length limits', () => {
      const longName = 'a'.repeat(101);
      const result = sanitizeProductName(longName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 100 characters');
    });
  });

  describe('sanitizeSKU', () => {
    it('should accept valid SKU formats', () => {
      const validSKUs = [
        'SKU123',
        'PROD-001',
        'ITEM_ABC',
        '123456',
      ];

      validSKUs.forEach(sku => {
        const result = sanitizeSKU(sku);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(sku);
      });
    });

    it('should reject invalid SKU characters', () => {
      const invalidSKUs = [
        'SKU 123', // space
        'PROD@001', // special char
        'ITEM#ABC', // special char
      ];

      invalidSKUs.forEach(sku => {
        const result = sanitizeSKU(sku);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('SKU can only contain letters, numbers, hyphens, and underscores');
      });
    });

    it('should not normalize SKU whitespace', () => {
      const sku = 'SKU 123';
      const result = sanitizeSKU(sku);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU can only contain letters, numbers, hyphens, and underscores');
    });
  });

  describe('sanitizeDescription', () => {
    it('should allow empty descriptions', () => {
      const result = sanitizeDescription('');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('');
    });

    it('should sanitize descriptions correctly', () => {
      const description = '  Product description with <script>alert("xss")</script>  ';
      const result = sanitizeDescription(description);
      
      expect(result.value).toBe('Product description with');
      expect(result.isValid).toBe(true);
    });

    it('should respect length limits', () => {
      const longDescription = 'a'.repeat(501);
      const result = sanitizeDescription(longDescription);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 500 characters');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should allow empty search queries', () => {
      const result = sanitizeSearchQuery('');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('');
    });

    it('should sanitize search queries', () => {
      const query = '  search term with <script>alert("xss")</script>  ';
      const result = sanitizeSearchQuery(query);
      
      expect(result.value).toBe('search term with');
      expect(result.isValid).toBe(true);
    });

    it('should respect search query length limits', () => {
      const longQuery = 'a'.repeat(201);
      const result = sanitizeSearchQuery(longQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input exceeds maximum length of 200 characters');
    });
  });

  describe('sanitizeCurrency', () => {
    it('should handle valid currency inputs', () => {
      const validInputs = [
        '123.45',
        '1,234.56',
        '0.99',
        '1000',
        '1.000',
        '12,34', // European format
      ];

      validInputs.forEach(input => {
        const result = sanitizeCurrency(input);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle comma/period edge cases', () => {
      // Test European format (comma as decimal separator)
      const result1 = sanitizeCurrency('12,34');
      expect(result1.isValid).toBe(true);
      expect(result1.value).toBe('12.34');

      // Test US format with thousands separator
      const result2 = sanitizeCurrency('1,234.56');
      expect(result2.isValid).toBe(true);
      expect(result2.value).toBe('1234.56');

      // Test mixed format
      const result3 = sanitizeCurrency('1.000,50');
      expect(result3.isValid).toBe(true);
      expect(result3.value).toBe('1000.50');
    });

    it('should reject invalid currency inputs', () => {
      const invalidInputs = [
        'abc',
        '123abc',
        'abc123',
        '12.34.56',
        '12,34,56',
      ];

      invalidInputs.forEach(input => {
        const result = sanitizeCurrency(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid currency value');
      });
    });

    it('should handle min/max bounds', () => {
      const result = sanitizeCurrency('5.00', { min: 10, max: 100 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 10');

      const result2 = sanitizeCurrency('150.00', { min: 10, max: 100 });
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Value must be at most 100');
    });

    it('should handle negative number options', () => {
      const result = sanitizeCurrency('-123.45', { allowNegative: false });
      expect(result.value).toBe('123.45');
      expect(result.isValid).toBe(true);
    });

    it('should format to specified decimal places', () => {
      const result = sanitizeCurrency('123.456', { decimalPlaces: 2 });
      expect(result.value).toBe('123.46');
      expect(result.isValid).toBe(true);

      const result2 = sanitizeCurrency('123', { decimalPlaces: 3 });
      expect(result2.value).toBe('123.000');
      expect(result2.isValid).toBe(true);
    });

    it('should handle zero values correctly', () => {
      const result = sanitizeCurrency('0');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('0.00');

      const result2 = sanitizeCurrency('0.00');
      expect(result2.isValid).toBe(true);
      expect(result2.value).toBe('0.00');
    });
  });

  describe('sanitizeNumeric', () => {
    it('should handle valid numeric inputs', () => {
      const validInputs = [
        '123',
        '123.45',
        '-123.45',
        '0',
        '0.0',
      ];

      validInputs.forEach(input => {
        const result = sanitizeNumeric(input);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject non-numeric inputs', () => {
      const invalidInputs = [
        'abc',
        '123abc',
        'abc123',
      ];

      invalidInputs.forEach(input => {
        const result = sanitizeNumeric(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid numeric value');
      });
    });

    it('should handle min/max bounds', () => {
      const result = sanitizeNumeric('5', { min: 10, max: 100 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 10');

      const result2 = sanitizeNumeric('150', { min: 10, max: 100 });
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Value must be at most 100');
    });

    it('should handle decimal options', () => {
      const result = sanitizeNumeric('123.45', { allowDecimals: false });
      expect(result.value).toBe('12345');
      expect(result.isValid).toBe(true);
    });

    it('should handle negative number options', () => {
      const result = sanitizeNumeric('-123', { allowNegative: false });
      expect(result.value).toBe('123');
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple decimal points', () => {
      const result = sanitizeNumeric('123.45.67');
      expect(result.value).toBe('123.4567');
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeBatch', () => {
    it('should sanitize multiple inputs with field-specific configs', () => {
      const inputs = {
        name: '  Product Name  ',
        email: 'user@example.com',
        sku: 'SKU-123',
        price: '19.99',
      };

      const fieldConfig = {
        name: { maxLength: 50 },
        email: { maxLength: 100 },
        sku: { maxLength: 20 },
        price: { maxLength: 10 },
      };

      const results = sanitizeBatch(inputs, fieldConfig);

      expect(results.name.value).toBe('Product Name');
      expect(results.name.isValid).toBe(true);

      expect(results.email.value).toBe('user@example.com');
      expect(results.email.isValid).toBe(true);

      expect(results.sku.value).toBe('SKU-123');
      expect(results.sku.isValid).toBe(true);

      expect(results.price.value).toBe('19.99');
      expect(results.price.isValid).toBe(true);
    });

    it('should handle mixed valid and invalid inputs', () => {
      const inputs = {
        name: '  Product Name  ',
        email: 'invalid-email',
        sku: 'SKU 123', // invalid due to space
      };

      const fieldConfig = {
        name: { maxLength: 50 },
        email: { maxLength: 100 },
        sku: { maxLength: 20 },
      };

      const results = sanitizeBatch(inputs, fieldConfig);

      expect(results.name.isValid).toBe(true);
      expect(results.email.isValid).toBe(true); // sanitizeInput doesn't validate email format
      expect(results.sku.isValid).toBe(true); // sanitizeInput doesn't validate SKU format
    });
  });

  describe('isBatchValid', () => {
    it('should return true for all valid results', () => {
      const results = {
        name: { isValid: true, errors: [] },
        email: { isValid: true, errors: [] },
        sku: { isValid: true, errors: [] },
      };

      expect(isBatchValid(results)).toBe(true);
    });

    it('should return false if any result is invalid', () => {
      const results = {
        name: { isValid: true, errors: [] },
        email: { isValid: false, errors: ['Invalid email'] },
        sku: { isValid: true, errors: [] },
      };

      expect(isBatchValid(results)).toBe(false);
    });
  });

  describe('getBatchErrors', () => {
    it('should return errors for invalid fields only', () => {
      const results = {
        name: { isValid: true, errors: [] },
        email: { isValid: false, errors: ['Invalid email format'] },
        sku: { isValid: false, errors: ['Invalid SKU format'] },
      };

      const errors = getBatchErrors(results);

      expect(errors).toEqual({
        email: ['Invalid email format'],
        sku: ['Invalid SKU format'],
      });
    });

    it('should return empty object for all valid results', () => {
      const results = {
        name: { isValid: true, errors: [] },
        email: { isValid: true, errors: [] },
        sku: { isValid: true, errors: [] },
      };

      const errors = getBatchErrors(results);

      expect(errors).toEqual({});
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long inputs gracefully', () => {
      const veryLongInput = 'a'.repeat(10000);
      const result = sanitizeInput(veryLongInput, { maxLength: 1000 });
      
      expect(result.value.length).toBe(1000);
      expect(result.isValid).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicodeInput = 'Hello 世界 🌍';
      const result = sanitizeInput(unicodeInput);
      
      expect(result.value).toBe('Hello 世界 🌍');
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in different contexts', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = sanitizeInput(specialChars);
      
      expect(result.value).toBe('!@#$%^&amp;*()_+-=[]{}|;:,.&lt;&gt;?');
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed content types', () => {
      const mixedInput = 'Normal text <script>alert("xss")</script> more text';
      const result = sanitizeInput(mixedInput);
      
      expect(result.value).toBe('Normal text more text');
      expect(result.isValid).toBe(true);
    });
  });
}); 