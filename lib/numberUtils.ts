/**
 * Number validation and sanitization utilities
 * Ensures all numeric calculations are safe and accurate
 */

/**
 * Safely parse a value to a number, returning 0 for invalid inputs
 * @param value - Value to parse as number
 * @returns Parsed number or 0 if invalid
 */
export const safeParseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim());
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  }
  
  return 0;
};

/**
 * Safely parse a value to an integer, returning 0 for invalid inputs
 * @param value - Value to parse as integer
 * @returns Parsed integer or 0 if invalid
 */
export const safeParseInt = (value: unknown): number => {
  const num = safeParseNumber(value);
  return Math.floor(Math.abs(num)); // Ensure positive integer
};

/**
 * Validate that a price value is within reasonable bounds
 * @param priceInMinorUnits - Price in minor units (pence, cents)
 * @returns True if valid, false otherwise
 */
export const isValidPrice = (priceInMinorUnits: number): boolean => {
  // Check for NaN or infinity before parsing
  if (typeof priceInMinorUnits === 'number' && (!Number.isFinite(priceInMinorUnits))) {
    return false;
  }
  
  const price = safeParseNumber(priceInMinorUnits);
  
  // Price should be non-negative and within reasonable bounds
  // Max price: 999,999.99 (99999999 in minor units)
  return price >= 0 && price <= 99999999 && Number.isInteger(price);
};

/**
 * Validate that a quantity is within reasonable bounds
 * @param quantity - Quantity value
 * @returns True if valid, false otherwise
 */
export const isValidQuantity = (quantity: number): boolean => {
  const qty = safeParseNumber(quantity);
  
  // Quantity should be positive integer, max 10,000
  return qty > 0 && qty <= 10000 && Number.isInteger(qty);
};

/**
 * Safely multiply two numbers to avoid floating point errors
 * @param a - First number
 * @param b - Second number
 * @returns Product of a and b
 */
export const safeMultiply = (a: number, b: number): number => {
  const numA = safeParseNumber(a);
  const numB = safeParseNumber(b);
  
  // Round to avoid floating point errors
  return Math.round(numA * numB);
};

/**
 * Safely add an array of numbers
 * @param numbers - Array of numbers to sum
 * @returns Sum of all numbers
 */
export const safeSum = (numbers: number[]): number => {
  return numbers.reduce((sum, num) => {
    const safeNum = safeParseNumber(num);
    return sum + safeNum;
  }, 0);
};

/**
 * Calculate item total price safely
 * @param unitPrice - Unit price in minor units
 * @param quantity - Quantity
 * @returns Total price in minor units
 */
export const calculateItemTotal = (unitPrice: number, quantity: number): number => {
  const safePrice = safeParseNumber(unitPrice);
  const safeQty = safeParseInt(quantity);
  
  if (!isValidPrice(safePrice) || !isValidQuantity(safeQty)) {
    console.warn('Invalid price or quantity for calculation:', { unitPrice, quantity });
    return 0;
  }
  
  return safeMultiply(safePrice, safeQty);
};

/**
 * Validate and sanitize cart item data
 * @param item - Cart item to validate
 * @returns Sanitized cart item
 */
export const sanitizeCartItem = (item: unknown): {
  isValid: boolean;
  sanitized: unknown;
  errors: string[];
} => {
  const errors: string[] = [];
  const cartItem = item as Record<string, unknown>;
  
  // Validate product
  if (!cartItem.product || typeof (cartItem.product as Record<string, unknown>).id !== 'string') {
    errors.push('Invalid product data');
  }
  
  // Validate and sanitize quantity
  const quantity = safeParseInt(cartItem.quantity);
  if (!isValidQuantity(quantity)) {
    errors.push('Invalid quantity');
  }
  
  // Validate and sanitize unit price
  const unitPrice = safeParseNumber(cartItem.unit_price);
  if (!isValidPrice(unitPrice)) {
    errors.push('Invalid unit price');
  }
  
  // Calculate total price
  const totalPrice = calculateItemTotal(unitPrice, quantity);
  
  const sanitized = {
    ...cartItem,
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
  };
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
};

/**
 * Validate cart totals for consistency
 * @param items - Array of cart items
 * @param reportedTotal - Reported total to validate against
 * @returns Validation result
 */
export const validateCartTotals = (items: unknown[], reportedTotal: number): {
  isValid: boolean;
  calculatedTotal: number;
  difference: number;
} => {
  const calculatedTotal = safeSum(items.map(item => safeParseNumber((item as Record<string, unknown>).total_price)));
  const difference = Math.abs(calculatedTotal - safeParseNumber(reportedTotal));
  
  // Allow for tiny floating point differences (< 1 cent)
  const isValid = difference < 1;
  
  return {
    isValid,
    calculatedTotal,
    difference,
  };
};