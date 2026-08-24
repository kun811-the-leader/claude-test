/**
 * SQLite has no native Json column, so every "Json-shaped" Prisma field is a
 * String holding serialized JSON. Always go through these two helpers instead
 * of calling JSON.parse/stringify ad hoc — when the schema moves to Postgres
 * and those columns become native `Json`, this file is the only place that
 * needs to change (toJson/fromJson become no-ops).
 */

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function fromJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
