import { useState, useCallback, useEffect } from 'react';
import type { Timeout } from 'node';
import { SyncStatus } from '../components/SyncStatusBanner';

interface SyncFeedbackState {
  status: SyncStatus;
  message?: string;
  queueCount: number;
  retryCount: number;
}

interface UseSyncFeedbackReturn {
  syncState: SyncFeedbackState;
  setSyncing: () => void;
  setQueued: (queueCount: number) => void;
  setFailed: (errorMessage?: string) => void;
  setSuccess: () => void;
  reset: () => void;
  retry: () => void;
}

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export function useSyncFeedback(): UseSyncFeedbackReturn {
  const [syncState, setSyncState] = useState<SyncFeedbackState>({
    status: 'idle',
    queueCount: 0,
    retryCount: 0,
  });

  const [retryTimeout, setRetryTimeout] = useState<Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        // eslint-disable-next-line no-undef
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  const setSyncing = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      status: 'syncing',
      message: undefined,
    }));
  }, []);

  const setQueued = useCallback((queueCount: number) => {
    setSyncState(prev => ({
      ...prev,
      status: 'queued',
      queueCount,
      message: undefined,
    }));
  }, []);

  const setFailed = useCallback((errorMessage?: string) => {
    setSyncState(prev => ({
      ...prev,
      status: 'failed',
      message: errorMessage || 'Sync failed',
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      status: 'success',
      message: undefined,
      retryCount: 0, // Reset retry count on success
    }));

    // Auto-hide success message after 3 seconds
    // eslint-disable-next-line no-undef
    const timeout = setTimeout(() => {
      setSyncState(prev => ({
        ...prev,
        status: 'idle',
      }));
    }, 3000);

    // Store the timeout for cleanup
    setRetryTimeout(timeout);
  }, []);

  const reset = useCallback(() => {
    if (retryTimeout) {
      // eslint-disable-next-line no-undef
      clearTimeout(retryTimeout);
    }
    setSyncState({
      status: 'idle',
      queueCount: 0,
      retryCount: 0,
    });
  }, [retryTimeout]);

  const retry = useCallback(() => {
    if (syncState.retryCount >= MAX_RETRY_ATTEMPTS) {
      setFailed('Max retry attempts reached');
      return;
    }

    // Calculate exponential backoff delay
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, syncState.retryCount);
    
    setSyncState(prev => ({
      ...prev,
      status: 'syncing',
      retryCount: prev.retryCount + 1,
      message: `Retry attempt ${prev.retryCount + 1} of ${MAX_RETRY_ATTEMPTS}`,
    }));

    // Set timeout for retry
    // eslint-disable-next-line no-undef
    const timeout = setTimeout(() => {
      // This would typically trigger the actual sync operation
      // For now, we'll just simulate it
      // eslint-disable-next-line no-console
      console.log(`Retrying sync after ${delay}ms delay`);
    }, delay);

    setRetryTimeout(timeout);
  }, [syncState.retryCount, setFailed]);

  return {
    syncState,
    setSyncing,
    setQueued,
    setFailed,
    setSuccess,
    reset,
    retry,
  };
} 