import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils/format';

/** Asinxron so'rovni yuklash holati va xatosi bilan boshqaradi. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    fn()
      .then((r) => id === seq.current && setData(r))
      .catch((e) => id === seq.current && setError(errorMessage(e)))
      .finally(() => id === seq.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
