export function omit<T extends object, K extends keyof T>(
  objectA: T,
  objectB: Partial<Record<K, unknown>>,
): Partial<Omit<T, K>> {
  return Object.entries(objectA).reduce(
    (acc, [key, value]) => {
      if (!(key in objectB)) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Partial<Omit<T, K>>,
  );
}
