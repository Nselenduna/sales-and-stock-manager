// Re-export currency utilities from the dedicated currency module
export {
  formatCurrency,
  parsePriceToMinorUnits as parsePriceToPence,
  setDefaultCurrency,
  getDefaultCurrency,
  getCurrencySymbol,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from './currency';

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Generate a receipt number
 * @returns Receipt number string
 */
export const generateReceiptNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `R${timestamp}${random.toString().padStart(3, '0')}`;
};

/**
 * Validate barcode format
 * @param barcode - Barcode string
 * @returns True if valid format
 */
export const isValidBarcode = (barcode: string): boolean => {
  // Basic validation - can be extended for specific barcode types
  return /^[0-9]{8,13}$/.test(barcode);
};

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}; 