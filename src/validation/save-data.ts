/**
 * Esquema del guardado completo (clave fija cerrojo:v1; la versión del formato va dentro).
 * Todo se lee por lista blanca: tipos, rangos y longitudes. Lo que no cumple se descarta.
 */
import { INPUT_LIMITS, SAVE_LIMITS, type Settings } from '../data/config';
import { SAVE_VERSION } from '../data/meta';
import { ROOMS } from '../data/rooms';
import type { RoomRecord } from '../game/progress';
import type { SavedAction } from '../game/session';
import { isPlainObject, readOwn, type UnknownRecord } from './guards';
import { parseActions } from './session-data';
import { parseSettings } from './settings';

/** Partida en curso guardada: sala, semilla, tiempo y acciones acertadas. */
export interface SavedSession {
  room: string;
  seed: number;
  steps: number;
  actions: SavedAction[];
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  settings: Settings;
  records: Map<string, RoomRecord>;
  current: SavedSession | null;
}

const ROOM_IDS: readonly string[] = ROOMS.map((room) => room.id);
const MAX_SEED = 0xffffffff;

export function defaultSave(defaults: Readonly<Settings>): SaveData {
  return { version: SAVE_VERSION, settings: { ...defaults }, records: new Map(), current: null };
}

function isIntIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Lleva un guardado de una versión anterior a la actual. La 1 solo tenía ajustes: se conservan
 * y se empieza sin marcas ni partida. Devuelve null si la versión no se reconoce.
 */
export function migrate(record: UnknownRecord): UnknownRecord | null {
  const version = readOwn(record, 'version');
  if (version === SAVE_VERSION) return record;
  if (version === 1) {
    return { version: SAVE_VERSION, settings: readOwn(record, 'settings'), records: {} };
  }
  return null;
}

/** Una marca: entero entre el mínimo posible y el máximo; si no, null. */
function parseTime(value: unknown): number | null {
  return isIntIn(value, SAVE_LIMITS.minRecordSteps, SAVE_LIMITS.maxSteps) ? value : null;
}

export function parseRecords(
  value: unknown,
  roomIds: readonly string[] = ROOM_IDS,
): Map<string, RoomRecord> {
  const records = new Map<string, RoomRecord>();
  if (!isPlainObject(value)) return records;
  // Solo se leen las salas que existen; cualquier otra clave se ignora.
  for (const id of roomIds) {
    const entry = readOwn(value, id);
    if (!isPlainObject(entry)) continue;
    const clean = parseTime(readOwn(entry, 'clean'));
    const hinted = parseTime(readOwn(entry, 'hinted'));
    if (clean !== null || hinted !== null) records.set(id, { clean, hinted });
  }
  return records;
}

export function parseSession(
  value: unknown,
  roomIds: readonly string[] = ROOM_IDS,
): SavedSession | null {
  if (!isPlainObject(value)) return null;
  const room = readOwn(value, 'room');
  const seed = readOwn(value, 'seed');
  const steps = readOwn(value, 'steps');
  if (typeof room !== 'string' || !roomIds.includes(room)) return null;
  if (!isIntIn(seed, 0, MAX_SEED) || !isIntIn(steps, 0, SAVE_LIMITS.maxSteps)) return null;
  const actions = parseActions(readOwn(value, 'actions'));
  if (actions === null) return null;
  return { room, seed, steps, actions };
}

/**
 * Convierte el texto guardado en datos válidos. Nunca lanza: lo vacío, gigante, corrupto,
 * de otra versión o con tipos erróneos se sustituye por valores por defecto, campo a campo.
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
    records: parseRecords(readOwn(current, 'records')),
    current: parseSession(readOwn(current, 'current')),
  };
}

/** Forma que se escribe en el almacenamiento (objetos planos, sin Map). */
export function serializeSave(data: SaveData): string {
  return JSON.stringify({
    version: data.version,
    settings: data.settings,
    records: Object.fromEntries(data.records),
    current: data.current,
  });
}
