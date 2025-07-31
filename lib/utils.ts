/**
 * Format a number as currency (in pence) to display format
 * @param amountInPence - Amount in pence (integer)
 * @param currency - Currency code (default: 'GBP')
 * @returns Formatted currency string
 */
export const formatCurrency = (amountInPence: number, currency: string = 'GBP'): string => {
  const amountInPounds = amountInPence / 100;
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInPounds);
};

/**
 * Convert a price string to pence
 * @param priceString - Price string (e.g., "£10.50")
 * @returns Amount in pence
 */
export const parsePriceToPence = (priceString: string): number => {
  // Remove currency symbols and whitespace
  const cleanPrice = priceString.replace(/[£$€,\s]/g, '');
  
  // Parse as float and convert to pence
  const priceInPounds = parseFloat(cleanPrice);
  
  if (isNaN(priceInPounds)) {
    return 0;
  }
  
  return Math.round(priceInPounds * 100);
};

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