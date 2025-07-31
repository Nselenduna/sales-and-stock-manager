import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import useDebounce from '../../hooks/useDebounce';

// Mock timer functions
jest.useFakeTimers();

describe('useDebounce', () => {
  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial value', 500));
    expect(result.current).toBe('initial value');
  });

  it('should not update the debounced value before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial value', delay: 500 } }
    );

    // Change the value
    rerender({ value: 'new value', delay: 500 });
    
    // Value should not change yet
    expect(result.current).toBe('initial value');
    
    // Fast-forward time by 300ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Value should still not change
    expect(result.current).toBe('initial value');
  });

  it('should update the debounced value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial value', delay: 500 } }
    );

    // Change the value
    rerender({ value: 'new value', delay: 500 });
    
    // Fast-forward time by the full delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Value should change now
    expect(result.current).toBe('new value');
  });

  it('should reset the timer when the value changes during delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial value', delay: 500 } }
    );

    // Change the value
    rerender({ value: 'intermediate value', delay: 500 });
    
    // Fast-forward time by 300ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Change the value again
    rerender({ value: 'final value', delay: 500 });
    
    // Fast-forward time by 300ms more (less than full delay from second change)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Value should still not be the final value
    expect(result.current).toBe('initial value');
    
    // Fast-forward time by the remaining delay
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Value should be the final value now
    expect(result.current).toBe('final value');
  });

  it('should respect changes to the delay parameter', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial value', delay: 500 } }
    );

    // Change the value and shorten the delay
    rerender({ value: 'new value', delay: 200 });
    
    // Fast-forward time by the new delay
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Value should change now with shorter delay
    expect(result.current).toBe('new value');
  });
}); 