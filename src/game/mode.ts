/**
 * Máquina de modos del juego (pura). Decide qué pasa con cada evento según el modo actual;
 * la interfaz solo muestra el resultado.
 */

export type Mode = 'title' | 'playing' | 'inspecting' | 'paused';

export type ModeEvent =
  'start' | 'pause' | 'togglePause' | 'resume' | 'focusLost' | 'inspect' | 'endInspect';

export interface ModeState {
  mode: Mode;
  /** Modo al que se vuelve al reanudar desde la pausa. */
  resumeTo: 'playing' | 'inspecting';
}

export const INITIAL_MODE: ModeState = { mode: 'title', resumeTo: 'playing' };

export function nextMode(state: ModeState, event: ModeEvent): ModeState {
  const { mode } = state;
  switch (event) {
    case 'start':
      return mode === 'title' ? { mode: 'playing', resumeTo: 'playing' } : state;
    case 'pause':
    case 'focusLost':
      return mode === 'playing' || mode === 'inspecting'
        ? { mode: 'paused', resumeTo: mode }
        : state;
    case 'togglePause':
      if (mode === 'paused') return { mode: state.resumeTo, resumeTo: state.resumeTo };
      return nextMode(state, 'pause');
    case 'resume':
      return mode === 'paused' ? { mode: state.resumeTo, resumeTo: state.resumeTo } : state;
    case 'inspect':
      return mode === 'playing' ? { mode: 'inspecting', resumeTo: 'inspecting' } : state;
    case 'endInspect':
      if (mode === 'inspecting') return { mode: 'playing', resumeTo: 'playing' };
      if (mode === 'paused') return { mode: 'paused', resumeTo: 'playing' };
      return state;
  }
}

/** True si la lógica del mundo avanza en este modo. */
export function isWorldRunning(mode: Mode): boolean {
  return mode === 'playing';
}
