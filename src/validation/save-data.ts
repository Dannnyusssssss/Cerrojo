/** Esquema del guardado completo (clave cerrojo:v1). */
import { INPUT_LIMITS, type Settings } from '../data/config';
import { SAVE_VERSION } from '../data/meta';
import { isPlainObject, readOwn, type UnknownRecord } from './guards';
import { parseSettings } from './settings';

export interface SaveData {
  version: typeof SAVE_VERSION;
  settings: Settings;
}

export function defaultSave(defaults: Readonly<Settings>): SaveData {
  return { version: SAVE_VERSION, settings: { ...defaults } };
}

/**
 * Lleva un guardado de una versión anterior a la actual. Hoy solo existe la versión 1;
 * cada versión nueva añade aquí su paso de migración. Devuelve null si no se reconoce.
 */
export function migrate(record: UnknownRecord): UnknownRecord | null {
  const version = readOwn(record, 'version');
  if (version === SAVE_VERSION) return record;
  return null;
}

/**
 * Convierte el texto guardado en datos válidos. Nunca lanza: lo vacío, gigante, corrupto,
 * de otra versión o con tipos erróneos se sustituye por valores por defecto.
 */
export function parseSave(raw: string | null, defaults: Readonly<Settings>): SaveData {
  if (raw === null || raw.length === 0 || raw.length > INPUT_LIMITS.maxSaveChars) {
    return defaultSave(defaults);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSave(defaults);
  }
  if (!isPlainObject(parsed)) return defaultSave(defaults);
  const current = migrate(parsed);
  if (current === null) return defaultSave(defaults);
  return {
    version: SAVE_VERSION,
    settings: parseSettings(readOwn(current, 'settings'), defaults),
  };
}
