/**
 * Currency configuration and formatting utilities
 * Provides a centralized way to handle currency formatting and localization
 */

export interface CurrencyConfig {
  code: string;
  locale: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

// Supported currencies configuration
export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  GBP: {
    code: 'GBP',
    locale: 'en-GB',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    locale: 'en-US',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    locale: 'en-GB', // Using en-GB for European formatting
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
  },
  ZAR: {
    code: 'ZAR',
    locale: 'en-ZA',
    symbol: 'R',
    name: 'South African Rand',
    decimalPlaces: 2,
  },
};

// Default currency - can be changed based on user preference or system settings
let defaultCurrency: CurrencyConfig = SUPPORTED_CURRENCIES.GBP;

/**
 * Set the default currency for the application
 * @param currencyCode - Currency code (e.g., 'GBP', 'USD', 'EUR')
 */
export const setDefaultCurrency = (currencyCode: string): void => {
  if (SUPPORTED_CURRENCIES[currencyCode]) {
    defaultCurrency = SUPPORTED_CURRENCIES[currencyCode];
  } else {
    console.warn(`Unsupported currency code: ${currencyCode}. Keeping default.`);
  }
};

/**
 * Get the current default currency configuration
 * @returns Current default currency configuration
 */
export const getDefaultCurrency = (): CurrencyConfig => {
  return defaultCurrency;
};

/**
 * Format a number as currency using the specified or default currency
 * @param amountInMinorUnits - Amount in minor units (pence, cents, etc.)
 * @param currencyCode - Optional currency code, uses default if not specified
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amountInMinorUnits: number,
  currencyCode?: string
): string => {
  const currency = currencyCode ? SUPPORTED_CURRENCIES[currencyCode] : defaultCurrency;
  
  if (!currency) {
    console.warn(`Unsupported currency code: ${currencyCode}. Using default.`);
    return formatCurrency(amountInMinorUnits);
  }

  // Convert minor units to major units (e.g., pence to pounds)
  const majorAmount = amountInMinorUnits / Math.pow(10, currency.decimalPlaces);
  
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(majorAmount);
  } catch (error) {
    console.warn(`Failed to format currency with Intl.NumberFormat:`, error);
    // Fallback to manual formatting
    return `${currency.symbol}${majorAmount.toFixed(currency.decimalPlaces)}`;
  }
};

/**
 * Convert a price string to minor units (pence, cents, etc.)
 * @param priceString - Price string (e.g., "£10.50", "$12.99")
 * @param currencyCode - Optional currency code for validation
 * @returns Amount in minor units
 */
export const parsePriceToMinorUnits = (
  priceString: string,
  currencyCode?: string
): number => {
  const currency = currencyCode ? SUPPORTED_CURRENCIES[currencyCode] : defaultCurrency;
  
  if (!currency) {
    console.warn(`Unsupported currency code: ${currencyCode}. Using default.`);
    return parsePriceToMinorUnits(priceString);
  }

  // Remove all currency symbols and whitespace
  const cleanPrice = priceString.replace(/[£$€R,\s]/g, '');
  
  // Parse as float
  const majorAmount = parseFloat(cleanPrice);
  
  if (isNaN(majorAmount)) {
    console.warn(`Invalid price string: ${priceString}`);
    return 0;
  }
  
  // Convert to minor units and round to avoid floating point errors
  return Math.round(majorAmount * Math.pow(10, currency.decimalPlaces));
};

/**
 * Validate if a currency code is supported
 * @param currencyCode - Currency code to validate
 * @returns True if supported, false otherwise
 */
export const isSupportedCurrency = (currencyCode: string): boolean => {
  return currencyCode in SUPPORTED_CURRENCIES;
};

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - Currency code
 * @returns Currency symbol or default currency symbol
 */
export const getCurrencySymbol = (currencyCode?: string): string => {
  const currency = currencyCode ? SUPPORTED_CURRENCIES[currencyCode] : defaultCurrency;
  return currency?.symbol || defaultCurrency.symbol;
};

/**
 * Convert amount between different currencies
 * Note: This is a placeholder for future implementation with exchange rates
 * @param amount - Amount in minor units
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount in minor units
 */
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  // TODO: Implement with real exchange rates
  console.warn('Currency conversion not implemented. Returning original amount.');
  return amount;
};

/**
 * Format currency with custom options
 * @param amountInMinorUnits - Amount in minor units
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export const formatCurrencyCustom = (
  amountInMinorUnits: number,
  options: {
    currencyCode?: string;
    showSymbol?: boolean;
    showCode?: boolean;
    precision?: number;
  } = {}
): string => {
  const {
    currencyCode,
    showSymbol = true,
    showCode = false,
    precision,
  } = options;

  const currency = currencyCode ? SUPPORTED_CURRENCIES[currencyCode] : defaultCurrency;
  
  if (!currency) {
    console.warn(`Unsupported currency code: ${currencyCode}. Using default.`);
    return formatCurrencyCustom(amountInMinorUnits, { ...options, currencyCode: undefined });
  }

  const decimalPlaces = precision !== undefined ? precision : currency.decimalPlaces;
  const majorAmount = amountInMinorUnits / Math.pow(10, currency.decimalPlaces);
  
  let formatted = majorAmount.toFixed(decimalPlaces);
  
  if (showSymbol) {
    formatted = `${currency.symbol}${formatted}`;
  }
  
  if (showCode) {
    formatted = `${formatted} ${currency.code}`;
  }
  
  return formatted;
};