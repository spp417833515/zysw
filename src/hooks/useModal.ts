import { useState, useCallback } from 'react';

export function useModal<T = undefined>() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  const show = useCallback((d?: T) => {
    setData(d);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setData(undefined);
  }, []);

  return { open, data, show, hide };
}
