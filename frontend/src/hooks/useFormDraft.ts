import { useEffect, useCallback, useRef } from 'react';

/**
 * Persists form state to localStorage and restores it on mount.
 * File objects are excluded (cannot be serialised) — only text/primitive state is saved.
 *
 * @param key      Unique localStorage key for this form
 * @param state    The current form state object (no File values)
 * @param setState Function to restore state on mount
 */
export function useFormDraft<T extends object>(
  key: string,
  state: T,
  setState: (s: T) => void
) {
  const isFirstRender = useRef(true);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        setState(parsed);
      }
    } catch {
      // corrupt data — ignore
    }
    isFirstRender.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Auto-save on every state change (debounced 600ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isFirstRender.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // storage full — ignore
      }
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, state]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  const hasDraft = useCallback((): boolean => {
    return !!localStorage.getItem(key);
  }, [key]);

  return { clearDraft, hasDraft };
}
