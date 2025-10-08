export function objectsToColumnsAndRows<T extends object>(
  objects: T[],
  columnsToExclude: string[] = ["id", "created_at", "updated_at", "fail_count"],
): { columns: (keyof T)[]; rows: (T[keyof T] | null)[][] } {
  const columns = (Object.keys(objects[0]) as (keyof T)[]).filter(
    (column) => !columnsToExclude.includes(String(column)),
  );
  const rows = objects.map((object) =>
    columns.map((column) => object[column] ?? null),
  );
  return { columns, rows };
}

export function buildPlaceholders(values: unknown[]) {
  return `(${values.map(() => "?").join(",")})`;
}
