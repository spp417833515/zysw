import { useMemo, useState, useCallback } from 'react';

interface SelectableItem {
  id: string;
  amount: number;
}

/**
 * 批量选择行的通用 hook：管理选中 keys、派生选中项与合计金额。
 * 每当 items 改变（如刷新），自动剔除已不存在的 key。
 */
export function useBatchSelection<T extends SelectableItem>(items: T[]) {
  const [keys, setKeysRaw] = useState<string[]>([]);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const validKeys = useMemo(() => keys.filter((k) => ids.has(k)), [keys, ids]);

  const selected = useMemo(
    () => items.filter((i) => validKeys.includes(i.id)),
    [items, validKeys],
  );
  const total = useMemo(
    () => selected.reduce((s, i) => s + (i.amount || 0), 0),
    [selected],
  );

  const setKeys = useCallback((next: React.Key[]) => {
    setKeysRaw(next.map(String));
  }, []);
  const clear = useCallback(() => setKeysRaw([]), []);

  return { keys: validKeys, setKeys, selected, total, clear };
}
