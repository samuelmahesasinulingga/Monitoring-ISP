import { useState, useEffect, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseFetchOptions {
  /** Jalankan fetch secara otomatis saat URL berubah. Default: true */
  autoFetch?: boolean;
  /** Jalankan fetch hanya jika kondisi ini terpenuhi */
  enabled?: boolean;
}

/**
 * useFetch
 *
 * Generic hook untuk pola GET request yang berulang di setiap komponen.
 * Menggantikan kombinasi useState + useEffect + try/catch + setLoading.
 *
 * @example
 * const { data: customers, isLoading, refetch } = useFetch<Customer[]>(
 *   `/api/customers?workspaceId=${workspaceId}`,
 *   { enabled: !!workspaceId }
 * );
 */
export function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const { autoFetch = true, enabled = true } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: autoFetch && enabled,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        setState({ data: null, isLoading: false, error: errText });
        return;
      }
      const json: T = await res.json();
      setState({ data: json, isLoading: false, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setState({ data: null, isLoading: false, error: msg });
    }
  }, [url, enabled]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    ...state,
    /** Fungsi untuk me-refresh data secara manual */
    refetch: fetchData,
  };
}
