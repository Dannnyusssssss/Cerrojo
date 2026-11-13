import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../src/data/config';
import { STORAGE_KEY } from '../src/data/meta';
import { SaveStore, type StorageLike } from '../src/save/storage';
import { parseSave } from '../src/validation/save-data';
import { parseSettings } from '../src/validation/settings';

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class FullStorage implements StorageLike {
  getItem(): string | null {
    return null;
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

class BlockedStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('SecurityError');
  }
}

const custom: Settings = {
  sensitivity: 1.5,
  invertY: true,
  fov: 90,
  quality: 'high',
  muted: true,
  volume: 0.3,
  reduceMotion: true,
  showTimer: false,
};

describe('guardado de ajustes', () => {
  it('sobrevive a recargar (escribir y volver a leer)', () => {
    const storage = new MemoryStorage();
    const first = new SaveStore(storage, DEFAULT_SETTINGS);
    first.load();
    expect(first.saveSettings(custom)).toBe(true);

    const second = new SaveStore(storage, DEFAULT_SETTINGS);
    expect(second.load().settings).toEqual(custom);
  });

  it('usa la clave con prefijo del juego', () => {
    const storage = new MemoryStorage();
    new SaveStore(storage, DEFAULT_SETTINGS).saveSettings(custom);
    expect([...storage.items.keys()]).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toBe('cerrojo:v1');
  });

  it('sin guardado usa los valores por defecto recibidos', () => {
    const defaults = { ...DEFAULT_SETTINGS, reduceMotion: true };
    const store = new SaveStore(new MemoryStorage(), defaults);
    expect(store.load().settings).toEqual(defaults);
  });

  it('con el almacenamiento lleno no lanza y avisa con false', () => {
    const store = new SaveStore(new FullStorage(), DEFAULT_SETTINGS);
    store.load();
    expect(store.saveSettings(custom)).toBe(false);
    expect(store.getSettings()).toEqual(custom);
  });

  it('con el almacenamiento bloqueado no lanza', () => {
    const store = new SaveStore(new BlockedStorage(), DEFAULT_SETTINGS);
    expect(store.load().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.saveSettings(custom)).toBe(false);
  });

  it('sin almacenamiento disponible no lanza', () => {
    const store = new SaveStore(null, DEFAULT_SETTINGS);
    expect(store.load().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.saveSettings(custom)).toBe(false);
  });

  it('avisa una sola vez del fallo de escritura, sea lo que sea lo que se guarda', () => {
    for (const backend of [new FullStorage(), new BlockedStorage(), null]) {
      const store = new SaveStore(backend, DEFAULT_SETTINGS);
      store.load();
      let warnings = 0;
      store.onWriteFailure = () => {
        warnings += 1;
      };
      // Una marca, la partida en curso, los ajustes y borrar datos: todos fallan.
      store.saveRecord('room-1', 600, 0);
      store.saveCurrent(null);
      store.saveSettings(custom);
      store.clearProgress();
      expect(warnings).toBe(1);
    }
  });

  it('con un almacenamiento que funciona nunca avisa', () => {
    const store = new SaveStore(new MemoryStorage(), DEFAULT_SETTINGS);
    let warnings = 0;
    store.onWriteFailure = () => {
      warnings += 1;
    };
    store.saveSettings(custom);
    store.saveRecord('room-1', 600, 0);
    expect(warnings).toBe(0);
  });

  it('valida lo que se guarda aunque venga de la interfaz', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage, DEFAULT_SETTINGS);
    store.saveSettings({ ...custom, fov: 9999, quality: 'ultra' });
    expect(store.getSettings().fov).toBe(DEFAULT_SETTINGS.fov);
    expect(store.getSettings().quality).toBe(DEFAULT_SETTINGS.quality);
  });
});

describe('entradas hostiles en el guardado', () => {
  const parse = (raw: string | null): Settings => parseSave(raw, DEFAULT_SETTINGS).settings;

  it.each([
    ['vacío', ''],
    ['null', null],
    ['JSON roto', '{"version":1,"settings":'],
    ['texto plano', 'hola'],
    ['número', '42'],
    ['array', '[1,2,3]'],
    ['null JSON', 'null'],
    ['otra versión', JSON.stringify({ version: 3, settings: custom })],
    ['sin versión', JSON.stringify({ settings: custom })],
    ['versión como texto', JSON.stringify({ version: '1', settings: custom })],
    ['HTML', '<script>alert(1)</script>'],
    ['caracteres de control', '\u0000\u0001\u0002'],
  ])('%s → valores por defecto', (_name, raw) => {
    expect(parse(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('gigante (más de 1 MB) se descarta sin analizarlo', () => {
    const huge = JSON.stringify({ version: 1, settings: custom, pad: 'x'.repeat(1_100_000) });
    expect(parse(huge)).toEqual(DEFAULT_SETTINGS);
  });

  it('tipos erróneos campo por campo', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: {
        sensitivity: '2',
        invertY: 'true',
        fov: null,
        quality: 3,
        muted: 1,
        reduceMotion: {},
      },
    });
    expect(parse(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('valores fuera de rango y no finitos', () => {
    const raw =
      '{"version":1,"settings":{"sensitivity":1e400,"fov":-5,"quality":"ultra","invertY":true}}';
    expect(parse(raw)).toEqual({ ...DEFAULT_SETTINGS, invertY: true });
  });

  it('conserva los campos válidos aunque otros sean inválidos', () => {
    const raw = JSON.stringify({ version: 1, settings: { ...custom, fov: 500 } });
    expect(parse(raw)).toEqual({ ...custom, fov: DEFAULT_SETTINGS.fov });
  });

  it('campos extra se ignoran', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { ...custom, admin: true, html: '<img src=x onerror=alert(1)>' },
      extra: { nested: [1, 2, 3] },
    });
    const result = parseSave(raw, DEFAULT_SETTINGS);
    expect(result.settings).toEqual(custom);
    expect(Object.keys(result)).toEqual(['version', 'settings', 'records', 'current']);
    expect(Object.keys(result.settings).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('__proto__, constructor y prototype no contaminan objetos', () => {
    const raw =
      '{"version":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},' +
      '"settings":{"__proto__":{"muted":true,"polluted":true},"fov":80}}';
    const result = parseSave(raw, DEFAULT_SETTINGS);
    expect(result.settings).toEqual({ ...DEFAULT_SETTINGS, fov: 80 });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(result.settings)).toBe(Object.prototype);
  });

  it('settings que no es un objeto plano', () => {
    for (const settings of [null, 'x', 5, [custom], true]) {
      expect(parse(JSON.stringify({ version: 1, settings }))).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('parseSettings devuelve una copia, no los valores por defecto compartidos', () => {
    const result = parseSettings(undefined, DEFAULT_SETTINGS);
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(result).not.toBe(DEFAULT_SETTINGS);
  });
});
