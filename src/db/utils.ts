import type { DBBaseRecord } from "../types/definitions/schema.ts";

export function objectsToColumnsAndRows<T extends DBBaseRecord>(
  objects: T[],
  columnsToExclude: (keyof T)[] = ["id", "created_at", "updated_at"]
): { columns: (keyof T)[]; rows: (T[keyof T] | null)[][] } {
  const columns = (Object.keys(objects[0]) as (keyof T)[]).filter((column) => !columnsToExclude.includes(column));
  const rows = objects.map((object) => columns.map((column) => object[column] ?? null));
  return { columns, rows };
}
