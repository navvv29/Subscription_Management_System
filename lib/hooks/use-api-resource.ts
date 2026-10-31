'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api/client';

interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Loads one API resource and exposes loading/error/data plus a reload.
 * `key` drives refetching (search, filters, page). The loader itself is kept in
 * a ref so it never needs to be memoised by the caller.
 */
export function useApiResource<T>(key: string, loader: () => Promise<T>): ApiResource<T> {
  const loaderRef = useRef(loader);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // Keep the latest loader available to `reload` without making it a dependency.
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  // Deferred so the effect does not synchronously cascade a loading render.
  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    return () => clearTimeout(timer);
  }, [key, reload]);

  return { data, loading, error, reload, setData };
}

/** Debounces fast-changing inputs (search boxes) before they hit the API. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
