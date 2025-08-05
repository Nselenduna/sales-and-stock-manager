import {
  formatCurrency,
  parsePriceToMinorUnits,
  setDefaultCurrency,
  getDefaultCurrency,
  getCurrencySymbol,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  formatCurrencyCustom,
} from '../../lib/currency';

describe('Currency Utilities', () => {
  beforeEach(() => {
    // Reset to default currency before each test
    setDefaultCurrency('GBP');
  });

  describe('formatCurrency', () => {
    it('should format GBP currency correctly', () => {
      const result = formatCurrency(1250); // 12.50 in pence
      expect(result).toBe('£12.50');
    });

    it('should format USD currency correctly', () => {
      const result = formatCurrency(1250, 'USD'); // 12.50 in cents
      expect(result).toBe('$12.50');
    });

    it('should format EUR currency correctly', () => {
      const result = formatCurrency(1250, 'EUR'); // 12.50 in cents
      expect(result).toBe('€12.50');
    });

    it('should format ZAR currency correctly', () => {
      const result = formatCurrency(1250, 'ZAR'); // 12.50 in cents
      // ZAR formatting may vary by system, so check for both possible formats
      expect(result).toMatch(/R\s?12[,.]50/);
    });

    it('should handle zero amounts', () => {
      const result = formatCurrency(0);
      expect(result).toBe('£0.00');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(123456789); // 1,234,567.89
      expect(result).toMatch(/£1,234,567.89/);
    });

    it('should fallback to default currency for unsupported currency codes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = formatCurrency(1250, 'INVALID');
      expect(result).toBe('£12.50');
      expect(consoleSpy).toHaveBeenCalledWith('Unsupported currency code: INVALID. Using default.');
      consoleSpy.mockRestore();
    });

    it('should use default currency when no currency code is provided', () => {
      setDefaultCurrency('USD');
      const result = formatCurrency(1250);
      expect(result).toBe('$12.50');
    });
  });

  describe('parsePriceToMinorUnits', () => {
    it('should parse GBP price strings correctly', () => {
      expect(parsePriceToMinorUnits('£12.50')).toBe(1250);
      expect(parsePriceToMinorUnits('12.50')).toBe(1250);
      expect(parsePriceToMinorUnits('£1,234.56')).toBe(123456);
    });

    it('should parse USD price strings correctly', () => {
      expect(parsePriceToMinorUnits('$12.50', 'USD')).toBe(1250);
      expect(parsePriceToMinorUnits('12.50', 'USD')).toBe(1250);
    });

    it('should parse EUR price strings correctly', () => {
      expect(parsePriceToMinorUnits('€12.50', 'EUR')).toBe(1250);
      expect(parsePriceToMinorUnits('12.50', 'EUR')).toBe(1250);
    });

    it('should parse ZAR price strings correctly', () => {
      expect(parsePriceToMinorUnits('R12.50', 'ZAR')).toBe(1250);
      expect(parsePriceToMinorUnits('12.50', 'ZAR')).toBe(1250);
    });

    it('should handle invalid price strings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(parsePriceToMinorUnits('invalid')).toBe(0);
      expect(parsePriceToMinorUnits('')).toBe(0);
      expect(parsePriceToMinorUnits('abc')).toBe(0);
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });

    it('should handle zero values', () => {
      expect(parsePriceToMinorUnits('0')).toBe(0);
      expect(parsePriceToMinorUnits('0.00')).toBe(0);
      expect(parsePriceToMinorUnits('£0.00')).toBe(0);
    });

    it('should handle whitespace and formatting', () => {
      expect(parsePriceToMinorUnits(' £12.50 ')).toBe(1250);
      expect(parsePriceToMinorUnits('£ 12.50')).toBe(1250);
      expect(parsePriceToMinorUnits('£12,345.67')).toBe(1234567);
    });

    it('should round properly to avoid floating point errors', () => {
      expect(parsePriceToMinorUnits('10.999')).toBe(1100); // Should round to 1100, not 1099
      expect(parsePriceToMinorUnits('10.001')).toBe(1000); // Should round to 1000, not 1001
    });
  });

  describe('setDefaultCurrency and getDefaultCurrency', () => {
    it('should set and get default currency', () => {
      setDefaultCurrency('USD');
      expect(getDefaultCurrency().code).toBe('USD');
      
      setDefaultCurrency('EUR');
      expect(getDefaultCurrency().code).toBe('EUR');
    });

    it('should warn and keep current default for invalid currency codes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      setDefaultCurrency('GBP'); // Set known good value first
      setDefaultCurrency('INVALID');
      
      expect(getDefaultCurrency().code).toBe('GBP');
      expect(consoleSpy).toHaveBeenCalledWith('Unsupported currency code: INVALID. Keeping default.');
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols for supported currencies', () => {
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('ZAR')).toBe('R');
    });

    it('should return default currency symbol for unsupported currencies', () => {
      setDefaultCurrency('GBP');
      expect(getCurrencySymbol('INVALID')).toBe('£');
    });

    it('should return default currency symbol when no code provided', () => {
      setDefaultCurrency('USD');
      expect(getCurrencySymbol()).toBe('$');
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('GBP')).toBe(true);
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('ZAR')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('INVALID')).toBe(false);
      expect(isSupportedCurrency('JPY')).toBe(false);
      expect(isSupportedCurrency('')).toBe(false);
    });
  });

  describe('formatCurrencyCustom', () => {
    it('should format with custom options', () => {
      const result = formatCurrencyCustom(1250, {
        currencyCode: 'USD',
        showSymbol: true,
        showCode: true,
        precision: 2,
      });
      expect(result).toBe('$12.50 USD');
    });

    it('should format without symbol', () => {
      const result = formatCurrencyCustom(1250, {
        showSymbol: false,
        precision: 2,
      });
      expect(result).toBe('12.50');
    });

    it('should format with different precision', () => {
      const result = formatCurrencyCustom(1250, {
        precision: 3,
      });
      expect(result).toBe('£12.500');
    });

    it('should handle zero precision', () => {
      const result = formatCurrencyCustom(1250, {
        precision: 0,
      });
      expect(result).toBe('£13'); // Should round 12.50 to 13
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should contain expected currency configurations', () => {
      expect(SUPPORTED_CURRENCIES.GBP).toEqual({
        code: 'GBP',
        locale: 'en-GB',
        symbol: '£',
        name: 'British Pound',
        decimalPlaces: 2,
      });

      expect(SUPPORTED_CURRENCIES.USD).toEqual({
        code: 'USD',
        locale: 'en-US',
        symbol: '$',
        name: 'US Dollar',
        decimalPlaces: 2,
      });

      expect(SUPPORTED_CURRENCIES.EUR).toEqual({
        code: 'EUR',
        locale: 'en-GB',
        symbol: '€',
        name: 'Euro',
        decimalPlaces: 2,
      });

      expect(SUPPORTED_CURRENCIES.ZAR).toEqual({
        code: 'ZAR',
        locale: 'en-ZA',
        symbol: 'R',
        name: 'South African Rand',
        decimalPlaces: 2,
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Intl.NumberFormat failures gracefully', () => {
      // Mock Intl.NumberFormat to throw an error
      const originalNumberFormat = Intl.NumberFormat;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (global as any).Intl.NumberFormat = jest.fn().mockImplementation(() => {
        throw new Error('NumberFormat not supported');
      });

      const result = formatCurrency(1250);
      expect(result).toBe('£12.50'); // Should fallback to manual formatting
      expect(consoleSpy).toHaveBeenCalledWith('Failed to format currency with Intl.NumberFormat:', expect.any(Error));

      // Restore
      (global as any).Intl.NumberFormat = originalNumberFormat;
      consoleSpy.mockRestore();
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-1250);
      expect(result).toMatch(/-£12.50|£-12.50/); // Different browsers may format negatives differently
    });

    it('should handle very small amounts', () => {
      const result = formatCurrency(1); // 1 pence
      expect(result).toBe('£0.01');
    });
  });
});