import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing search input with loading state
 * @param value - The search value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object containing debounced value and loading state
 */
export function useDebouncedSearch(value: string, delay: number = 300) {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    // Set loading state when value changes
    if (value !== debouncedValue) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [value, debouncedValue]);

  return {
    debouncedValue,
    isSearching,
  };
}
