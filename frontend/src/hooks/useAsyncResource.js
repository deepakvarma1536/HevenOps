import { useCallback, useEffect, useState } from 'react';

export default function useAsyncResource(loader) {
  const [resource, setResource] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async (signal) => {
    setResource((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loader(signal);
      setResource({ data, loading: false, error: null });
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setResource((current) => ({ ...current, loading: false, error }));
    }
  }, [loader]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => load(), [load]);
  const setData = useCallback((data) => {
    setResource((current) => ({ ...current, data }));
  }, []);
  return { ...resource, retry, setData };
}
