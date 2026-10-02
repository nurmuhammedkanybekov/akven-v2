import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

interface AsyncState<T> { data: T | null; error: Error | null; loading: boolean; reload: () => void }

/** Runs an async loader when the dependencies change, ignores stale results, and offers reload(). */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loaderRef.current(controller.signal)
      .then((d) => { if (!controller.signal.aborted) { setData(d); setError(null); } })
      .catch((e: Error) => { if (e.name !== "AbortError" && !controller.signal.aborted) setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
