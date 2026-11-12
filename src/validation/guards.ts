/**
 * Utilidades de validación por lista blanca. Nunca se copian objetos externos: solo se leen
 * claves conocidas como propiedades propias, así que `__proto__`, `constructor` y `prototype`
 * no tienen efecto.
 */

export type UnknownRecord = Readonly<Record<string, unknown>>;

/** Objeto plano (no null, no array, prototipo Object o null). */
export function isPlainObject(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Lee una propiedad propia; nunca recorre la cadena de prototipos. */
export function readOwn(record: UnknownRecord, key: string): unknown {
  if (FORBIDDEN_KEYS.has(key)) return undefined;
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export function readNumber(
  record: UnknownRecord,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = readOwn(record, key);
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

export function readBoolean(record: UnknownRecord, key: string, fallback: boolean): boolean {
  const value = readOwn(record, key);
  return typeof value === 'boolean' ? value : fallback;
}

export function readEnum<T extends string>(
  record: UnknownRecord,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = readOwn(record, key);
  if (typeof value !== 'string') return fallback;
  const match = allowed.find((option) => option === value);
  return match ?? fallback;
}
