import { useState, useCallback, useEffect } from 'react';
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
  setQueued: (count: number) => void;
  setFailed: (message?: string) => void;
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

  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
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

  const setQueued = useCallback((count: number) => {
    setSyncState(prev => ({
      ...prev,
      status: 'queued',
      queueCount: count,
      message: undefined,
    }));
  }, []);

  const setFailed = useCallback((message?: string) => {
    setSyncState(prev => ({
      ...prev,
      status: 'failed',
      message: message || 'Sync failed',
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
    setTimeout(() => {
      setSyncState(prev => ({
        ...prev,
        status: 'idle',
      }));
    }, 3000);
  }, []);

  const reset = useCallback(() => {
    if (retryTimeout) {
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
    const timeout = setTimeout(() => {
      // This would typically trigger the actual sync operation
      // For now, we'll just simulate it
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