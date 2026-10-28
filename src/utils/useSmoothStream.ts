import { useRef, useCallback } from 'react';

interface SmoothStreamOptions {
  onFlush: (accumulatedDelta: string) => void;
  batchIntervalMs?: number;
}

/**
 * High-performance token streamer that batches rapid SSE token deltas using
 * requestAnimationFrame and time-window throttling. Prevents quadratic re-renders
 * and UI freezing during intensive markdown streaming.
 */
export function useSmoothStream({ onFlush, batchIntervalMs = 35 }: SmoothStreamOptions) {
  const pendingBufferRef = useRef<string>('');
  const rafHandleRef = useRef<number | null>(null);
  const lastFlushTimeRef = useRef<number>(0);

  const flush = useCallback(() => {
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }

    const delta = pendingBufferRef.current;
    if (delta) {
      pendingBufferRef.current = '';
      lastFlushTimeRef.current = performance.now();
      onFlush(delta);
    }
  }, [onFlush]);

  const pushToken = useCallback((token: string) => {
    if (!token) return;

    pendingBufferRef.current += token;

    const now = performance.now();
    const elapsed = now - lastFlushTimeRef.current;

    // If enough time elapsed, request immediate frame flush
    if (elapsed >= batchIntervalMs) {
      if (rafHandleRef.current === null) {
        rafHandleRef.current = requestAnimationFrame(() => {
          rafHandleRef.current = null;
          flush();
        });
      }
    } else {
      // Schedule flush for remainder of interval window
      if (rafHandleRef.current === null) {
        rafHandleRef.current = requestAnimationFrame(() => {
          rafHandleRef.current = null;
          flush();
        });
      }
    }
  }, [batchIntervalMs, flush]);

  const endStream = useCallback(() => {
    flush();
  }, [flush]);

  const clear = useCallback(() => {
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
    pendingBufferRef.current = '';
  }, []);

  return {
    pushToken,
    flush,
    endStream,
    clear,
  };
}
