/** Valores iniciales de los ajustes según el entorno del jugador (sin guardado previo). */
import { DEFAULT_SETTINGS, type Settings } from '../data/config';

export interface EnvironmentHints {
  /** El sistema pide reducir el movimiento (prefers-reduced-motion). */
  reducedMotion: boolean;
  /** El puntero principal es táctil (pointer: coarse). */
  coarsePointer: boolean;
  /** El lado corto de la pantalla mide menos de 600 px CSS. */
  smallScreen: boolean;
}

export function initialSettings(env: EnvironmentHints): Settings {
  return {
    ...DEFAULT_SETTINGS,
    reduceMotion: env.reducedMotion,
    quality: env.coarsePointer || env.smallScreen ? 'low' : DEFAULT_SETTINGS.quality,
  };
}
