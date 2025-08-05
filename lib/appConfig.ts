/**
 * Application Configuration for Currency and Localization
 * This module manages application-wide settings for currency formatting and locale preferences
 */

import { setDefaultCurrency, getDefaultCurrency, SUPPORTED_CURRENCIES, CurrencyConfig } from './currency';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_PREFERENCE_KEY = '@app_currency_preference';

/**
 * Initialize currency settings from stored preferences or system defaults
 * Should be called on app startup
 */
export const initializeCurrencySettings = async (): Promise<void> => {
  try {
    const storedCurrency = await AsyncStorage.getItem(CURRENCY_PREFERENCE_KEY);
    if (storedCurrency && SUPPORTED_CURRENCIES[storedCurrency]) {
      setDefaultCurrency(storedCurrency);
    } else {
      // Default to GBP if no preference is stored
      setDefaultCurrency('GBP');
    }
  } catch (error) {
    console.error('Failed to load currency preference:', error);
    // Fallback to default
    setDefaultCurrency('GBP');
  }
};

/**
 * Update user's currency preference and persist it
 * @param currencyCode - New currency code to set as default
 */
export const updateCurrencyPreference = async (currencyCode: string): Promise<boolean> => {
  try {
    if (!SUPPORTED_CURRENCIES[currencyCode]) {
      console.warn(`Unsupported currency: ${currencyCode}`);
      return false;
    }

    setDefaultCurrency(currencyCode);
    await AsyncStorage.setItem(CURRENCY_PREFERENCE_KEY, currencyCode);
    return true;
  } catch (error) {
    console.error('Failed to save currency preference:', error);
    return false;
  }
};

/**
 * Get current currency preference
 * @returns Current currency configuration
 */
export const getCurrentCurrencyConfig = (): CurrencyConfig => {
  return getDefaultCurrency();
};

/**
 * Get list of all supported currencies for settings UI
 * @returns Array of currency configurations
 */
export const getSupportedCurrencies = (): CurrencyConfig[] => {
  return Object.values(SUPPORTED_CURRENCIES);
};

/**
 * Detect system locale and suggest appropriate currency
 * @returns Suggested currency code based on system locale
 */
export const suggestCurrencyFromLocale = (): string => {
  try {
    // This would use system locale detection in a real app
    // For now, we'll return a default suggestion
    const locale = 'en-GB'; // Would use Intl.DateTimeFormat().resolvedOptions().locale
    
    if (locale.includes('GB') || locale.includes('UK')) return 'GBP';
    if (locale.includes('US')) return 'USD';
    if (locale.includes('ZA')) return 'ZAR';
    if (locale.includes('DE') || locale.includes('FR') || locale.includes('ES')) return 'EUR';
    
    return 'GBP'; // Default fallback
  } catch (error) {
    console.error('Failed to detect system locale:', error);
    return 'GBP';
  }
};