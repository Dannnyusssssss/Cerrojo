import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/data/config';
import { initialSettings } from '../src/game/settings';
import { SaveStore, type StorageLike } from '../src/save/storage';
import { parseSettings } from '../src/validation/settings';

const desktop = { reducedMotion: false, coarsePointer: false, smallScreen: false };

describe('ajustes iniciales según el entorno', () => {
  it('en escritorio usa los valores por defecto', () => {
    expect(initialSettings(desktop)).toEqual(DEFAULT_SETTINGS);
  });

  it('«Reducir movimiento» empieza activado si el sistema lo pide', () => {
    expect(initialSettings({ ...desktop, reducedMotion: true }).reduceMotion).toBe(true);
  });

  it('en táctil o pantalla pequeña empieza en calidad Baja', () => {
    expect(initialSettings({ ...desktop, coarsePointer: true }).quality).toBe('low');
    expect(initialSettings({ ...desktop, smallScreen: true }).quality).toBe('low');
  });

  it('un guardado previo manda sobre el valor inicial del entorno', () => {
    const items = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (k) => items.get(k) ?? null,
      setItem: (k, v) => void items.set(k, v),
    };
    const first = new SaveStore(storage, initialSettings(desktop));
    first.load();
    first.saveSettings({ ...DEFAULT_SETTINGS, reduceMotion: false });
    const second = new SaveStore(storage, initialSettings({ ...desktop, reducedMotion: true }));
    expect(second.load().settings.reduceMotion).toBe(false);
  });

  it('un guardado corrupto vuelve al valor inicial del entorno', () => {
    const storage: StorageLike = { getItem: () => '{corrupto', setItem: () => undefined };
    const env = { ...desktop, reducedMotion: true };
    expect(new SaveStore(storage, initialSettings(env)).load().settings).toEqual(
      initialSettings(env),
    );
  });
});

describe('ajustes de sonido y cronómetro', () => {
  it('volumen dentro de 0 a 1 y cronómetro visible como valor por defecto', () => {
    expect(parseSettings({ volume: 0.3, showTimer: false }, DEFAULT_SETTINGS)).toMatchObject({
      volume: 0.3,
      showTimer: false,
    });
    for (const volume of [-0.1, 1.5, '0.5', null, Number.NaN]) {
      expect(parseSettings({ volume }, DEFAULT_SETTINGS).volume).toBe(DEFAULT_SETTINGS.volume);
    }
    expect(parseSettings({ showTimer: 'no' }, DEFAULT_SETTINGS).showTimer).toBe(true);
  });
});
