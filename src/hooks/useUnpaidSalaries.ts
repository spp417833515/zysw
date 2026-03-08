import { useState, useCallback } from 'react';
import { getUnpaidSalaries } from '@/api/employee';
import type { UnpaidSalaryItem } from '@/types/employee';

export function useUnpaidSalaries() {
  const [unpaidItems, setUnpaidItems] = useState<UnpaidSalaryItem[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(false);

  const fetchUnpaid = useCallback(async () => {
    setUnpaidLoading(true);
    try {
      const res = await getUnpaidSalaries();
      setUnpaidItems(res.data?.items ?? []);
    } finally {
      setUnpaidLoading(false);
    }
  }, []);

  return { unpaidItems, unpaidLoading, fetchUnpaid };
}
