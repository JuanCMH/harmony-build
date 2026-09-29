export const groupByKey = <T, K extends keyof T>(
  items: T[] | undefined,
  key: K,
): Map<T[K], T[]> => {
  const grouped = new Map<T[K], T[]>();
  items?.forEach((item) => {
    const group = grouped.get(item[key]) || [];
    group.push(item);
    grouped.set(item[key], group);
  });
  return grouped;
};
