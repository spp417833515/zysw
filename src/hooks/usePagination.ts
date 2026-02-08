import { useState, useCallback } from 'react';
import { PAGE_SIZE } from '@/utils/constants';

export function usePagination(defaultPageSize: number = PAGE_SIZE) {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const onChange = useCallback((page: number, size: number) => {
    setCurrent(page);
    setPageSize(size);
  }, []);

  const reset = useCallback(() => {
    setCurrent(1);
  }, []);

  return { current, pageSize, onChange, reset };
}
