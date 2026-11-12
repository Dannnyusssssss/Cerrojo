/**
 * Único acceso a localStorage del juego. Todo lo que se lee cruza src/validation/.
 * Si el almacenamiento está bloqueado o lleno, el juego sigue sin guardar.
 */
import type { Settings } from '../data/config';
import { STORAGE_KEY } from '../data/meta';
import { logError } from '../core/errors';
import { updateRecord, type RoomRecord } from '../game/progress';
import {
  defaultSave,
  parseRecords,
  parseSave,
  parseSession,
  serializeSave,
  type SaveData,
  type SavedSession,
} from '../validation/save-data';
import { parseSettings } from '../validation/settings';

/** Parte de la API de Storage que se usa (permite probar con un almacén falso). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Devuelve el localStorage del navegador, o null si no existe o está bloqueado. */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export class SaveStore {
  private readonly backend: StorageLike | null;
  private readonly defaults: Readonly<Settings>;
  private data: SaveData;

  constructor(backend: StorageLike | null, defaults: Readonly<Settings>) {
    this.backend = backend;
    this.defaults = defaults;
    this.data = defaultSave(defaults);
  }

  /** Lee y valida el guardado. Nunca lanza. */
  load(): SaveData {
    let raw: string | null = null;
    try {
      raw = this.backend?.getItem(STORAGE_KEY) ?? null;
    } catch (error) {
      logError('save.load', error);
    }
    this.data = parseSave(raw, this.defaults);
    return this.data;
  }

  getSettings(): Settings {
    return { ...this.data.settings };
  }

  /** Valida y guarda los ajustes. Devuelve false si no se pudo escribir. */
  saveSettings(settings: unknown): boolean {
    this.data = { ...this.data, settings: parseSettings(settings, this.defaults) };
    return this.write();
  }

  getRecords(): ReadonlyMap<string, RoomRecord> {
    return this.data.records;
  }

  /**
   * Anota una sala terminada (nunca se llama con ayudas de depuración). Devuelve true si es
   * una marca nueva en su categoría (sin pistas o con pistas).
   */
  saveRecord(room: string, steps: number, hints: number): boolean {
    const { record, improved } = updateRecord(this.data.records.get(room), steps, hints);
    // El resultado pasa por la misma validación que lo leído (descarta tiempos imposibles).
    const merged = parseRecords(Object.fromEntries([...this.data.records, [room, record]]));
    if (!merged.has(room)) return false;
    this.data = { ...this.data, records: merged };
    this.write();
    return improved;
  }

  getCurrent(): SavedSession | null {
    return this.data.current;
  }

  /** Guarda la partida en curso (o la borra con null). Devuelve false si no se pudo escribir. */
  saveCurrent(session: SavedSession | null): boolean {
    this.data = { ...this.data, current: session === null ? null : parseSession(session) };
    return this.write();
  }

  /** «Borrar datos guardados»: marcas, progreso y partida en curso. Los ajustes se conservan. */
  clearProgress(): boolean {
    this.data = { ...defaultSave(this.defaults), settings: this.data.settings };
    return this.write();
  }

  private write(): boolean {
    if (this.backend === null) return false;
    try {
      this.backend.setItem(STORAGE_KEY, serializeSave(this.data));
      return true;
    } catch (error) {
      logError('save.write', error);
      return false;
    }
  }
}
