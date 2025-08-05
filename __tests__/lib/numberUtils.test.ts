import {
  safeParseNumber,
  safeParseInt,
  isValidPrice,
  isValidQuantity,
  safeMultiply,
  safeSum,
  calculateItemTotal,
  sanitizeCartItem,
  validateCartTotals,
} from '../../lib/numberUtils';

describe('Number Utilities', () => {
  describe('safeParseNumber', () => {
    it('should parse valid numbers correctly', () => {
      expect(safeParseNumber(123)).toBe(123);
      expect(safeParseNumber(123.45)).toBe(123.45);
      expect(safeParseNumber('123')).toBe(123);
      expect(safeParseNumber('123.45')).toBe(123.45);
      expect(safeParseNumber(' 123.45 ')).toBe(123.45);
    });

    it('should return 0 for invalid inputs', () => {
      expect(safeParseNumber(NaN)).toBe(0);
      expect(safeParseNumber(Infinity)).toBe(0);
      expect(safeParseNumber(-Infinity)).toBe(0);
      expect(safeParseNumber('invalid')).toBe(0);
      expect(safeParseNumber('')).toBe(0);
      expect(safeParseNumber(null)).toBe(0);
      expect(safeParseNumber(undefined)).toBe(0);
      expect(safeParseNumber({})).toBe(0);
      expect(safeParseNumber([])).toBe(0);
    });
  });

  describe('safeParseInt', () => {
    it('should parse valid integers correctly', () => {
      expect(safeParseInt(123)).toBe(123);
      expect(safeParseInt(123.89)).toBe(123); // Should floor
      expect(safeParseInt('123')).toBe(123);
      expect(safeParseInt('123.89')).toBe(123);
    });

    it('should handle negative numbers by returning absolute value', () => {
      expect(safeParseInt(-123)).toBe(123);
      expect(safeParseInt('-123')).toBe(123);
    });

    it('should return 0 for invalid inputs', () => {
      expect(safeParseInt('invalid')).toBe(0);
      expect(safeParseInt(null)).toBe(0);
      expect(safeParseInt(undefined)).toBe(0);
    });
  });

  describe('isValidPrice', () => {
    it('should validate reasonable prices', () => {
      expect(isValidPrice(0)).toBe(true);
      expect(isValidPrice(100)).toBe(true);
      expect(isValidPrice(99999999)).toBe(true); // Max price
    });

    it('should reject invalid prices', () => {
      expect(isValidPrice(-1)).toBe(false); // Negative
      expect(isValidPrice(100000000)).toBe(false); // Too high
      expect(isValidPrice(123.45)).toBe(false); // Not integer (should be in minor units)
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
    });
  });

  describe('isValidQuantity', () => {
    it('should validate reasonable quantities', () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(100)).toBe(true);
      expect(isValidQuantity(10000)).toBe(true); // Max quantity
    });

    it('should reject invalid quantities', () => {
      expect(isValidQuantity(0)).toBe(false); // Zero not allowed
      expect(isValidQuantity(-1)).toBe(false); // Negative
      expect(isValidQuantity(10001)).toBe(false); // Too high
      expect(isValidQuantity(1.5)).toBe(false); // Not integer
      expect(isValidQuantity(NaN)).toBe(false);
    });
  });

  describe('safeMultiply', () => {
    it('should multiply numbers correctly', () => {
      expect(safeMultiply(100, 5)).toBe(500);
      expect(safeMultiply(123.45, 2)).toBe(247); // Should round
    });

    it('should handle edge cases', () => {
      expect(safeMultiply(0, 100)).toBe(0);
      expect(safeMultiply(100, 0)).toBe(0);
      expect(safeMultiply('invalid' as any, 100)).toBe(0);
    });

    it('should avoid floating point errors', () => {
      // Test case that typically causes floating point errors
      expect(safeMultiply(0.1, 3)).toBe(0); // 0.3 rounded
      expect(safeMultiply(333, 3)).toBe(999); // Should be exact
    });
  });

  describe('safeSum', () => {
    it('should sum arrays correctly', () => {
      expect(safeSum([1, 2, 3])).toBe(6);
      expect(safeSum([100, 200, 300])).toBe(600);
    });

    it('should handle empty arrays', () => {
      expect(safeSum([])).toBe(0);
    });

    it('should handle invalid values in array', () => {
      expect(safeSum([1, NaN, 3])).toBe(4);
      expect(safeSum([1, 'invalid' as any, 3])).toBe(4);
    });
  });

  describe('calculateItemTotal', () => {
    it('should calculate totals correctly', () => {
      expect(calculateItemTotal(1000, 3)).toBe(3000);
      expect(calculateItemTotal(1500, 2)).toBe(3000);
    });

    it('should handle invalid inputs', () => {
      expect(calculateItemTotal(-100, 3)).toBe(0); // Invalid price
      expect(calculateItemTotal(1000, 0)).toBe(0); // Invalid quantity
      expect(calculateItemTotal(NaN, 3)).toBe(0);
    });

    it('should warn for invalid inputs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      calculateItemTotal(-100, 3);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sanitizeCartItem', () => {
    const validItem = {
      product: { id: '123', name: 'Test' },
      quantity: 2,
      unit_price: 1500,
      total_price: 3000,
    };

    it('should validate correct items', () => {
      const result = sanitizeCartItem(validItem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized.quantity).toBe(2);
      expect(result.sanitized.unit_price).toBe(1500);
      expect(result.sanitized.total_price).toBe(3000);
    });

    it('should reject items with invalid product', () => {
      const invalidItem = { ...validItem, product: null };
      const result = sanitizeCartItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid product data');
    });

    it('should reject items with invalid quantity', () => {
      const invalidItem = { ...validItem, quantity: 0 };
      const result = sanitizeCartItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid quantity');
    });

    it('should reject items with invalid price', () => {
      const invalidItem = { ...validItem, unit_price: -100 };
      const result = sanitizeCartItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid unit price');
    });

    it('should sanitize string values', () => {
      const itemWithStrings = {
        ...validItem,
        quantity: '3',
        unit_price: '2000',
      };
      const result = sanitizeCartItem(itemWithStrings);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.quantity).toBe(3);
      expect(result.sanitized.unit_price).toBe(2000);
      expect(result.sanitized.total_price).toBe(6000);
    });

    it('should recalculate total price', () => {
      const itemWithWrongTotal = {
        ...validItem,
        total_price: 9999, // Wrong total
      };
      const result = sanitizeCartItem(itemWithWrongTotal);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.total_price).toBe(3000); // Correct total
    });
  });

  describe('validateCartTotals', () => {
    const items = [
      { total_price: 1000 },
      { total_price: 2000 },
      { total_price: 1500 },
    ];

    it('should validate correct totals', () => {
      const result = validateCartTotals(items, 4500);
      expect(result.isValid).toBe(true);
      expect(result.calculatedTotal).toBe(4500);
      expect(result.difference).toBe(0);
    });

    it('should detect incorrect totals', () => {
      const result = validateCartTotals(items, 5000);
      expect(result.isValid).toBe(false);
      expect(result.calculatedTotal).toBe(4500);
      expect(result.difference).toBe(500);
    });

    it('should handle empty arrays', () => {
      const result = validateCartTotals([], 0);
      expect(result.isValid).toBe(true);
      expect(result.calculatedTotal).toBe(0);
    });

    it('should handle invalid values in items', () => {
      const invalidItems = [
        { total_price: 1000 },
        { total_price: 'invalid' },
        { total_price: 2000 },
      ];
      const result = validateCartTotals(invalidItems, 3000);
      expect(result.isValid).toBe(true);
      expect(result.calculatedTotal).toBe(3000);
    });

    it('should allow tiny floating point differences', () => {
      const result = validateCartTotals([{ total_price: 333 }], 333.1);
      expect(result.isValid).toBe(true); // < 1 cent difference allowed
    });
  });
});