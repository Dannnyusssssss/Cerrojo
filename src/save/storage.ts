/**
 * Único acceso a localStorage del juego. Todo lo que se lee cruza src/validation/.
 * Si el almacenamiento está bloqueado o lleno, el juego sigue sin guardar.
 */
import type { Settings } from '../data/config';
import { STORAGE_KEY } from '../data/meta';
import { logError } from '../core/errors';
import { defaultSave, parseSave, type SaveData } from '../validation/save-data';
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

  private write(): boolean {
    if (this.backend === null) return false;
    try {
      this.backend.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (error) {
      logError('save.write', error);
      return false;
    }
  }
}
