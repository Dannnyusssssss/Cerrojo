/**
 * Máquina de modos del juego (pura). Decide qué pasa con cada evento según el modo actual;
 * la interfaz solo muestra el resultado.
 */

export type Mode = 'title' | 'playing' | 'inspecting' | 'panel' | 'paused' | 'finished';

export type ModeEvent =
  | 'start'
  | 'pause'
  | 'togglePause'
  | 'resume'
  | 'focusLost'
  | 'inspect'
  | 'endInspect'
  | 'openPanel'
  | 'closePanel'
  | 'finish'
  | 'home';

type Resumable = 'playing' | 'inspecting' | 'panel';

export interface ModeState {
  mode: Mode;
  /** Modo al que se vuelve al reanudar desde la pausa. */
  resumeTo: Resumable;
}

export const INITIAL_MODE: ModeState = { mode: 'title', resumeTo: 'playing' };

const PLAYING: ModeState = { mode: 'playing', resumeTo: 'playing' };

function isResumable(mode: Mode): mode is Resumable {
  return mode === 'playing' || mode === 'inspecting' || mode === 'panel';
}

export function nextMode(state: ModeState, event: ModeEvent): ModeState {
  const { mode } = state;
  switch (event) {
    case 'start':
      return mode === 'title' || mode === 'finished' ? PLAYING : state;
    case 'pause':
    case 'focusLost':
      return isResumable(mode) ? { mode: 'paused', resumeTo: mode } : state;
    case 'togglePause':
      if (mode === 'paused') return { mode: state.resumeTo, resumeTo: state.resumeTo };
      return nextMode(state, 'pause');
    case 'resume':
      return mode === 'paused' ? { mode: state.resumeTo, resumeTo: state.resumeTo } : state;
    case 'inspect':
      return mode === 'playing' ? { mode: 'inspecting', resumeTo: 'inspecting' } : state;
    case 'openPanel':
      return mode === 'playing' ? { mode: 'panel', resumeTo: 'panel' } : state;
    case 'endInspect':
    case 'closePanel': {
      const from = event === 'endInspect' ? 'inspecting' : 'panel';
      if (mode === from) return PLAYING;
      if (mode === 'paused' && state.resumeTo === from)
        return { mode: 'paused', resumeTo: 'playing' };
      return state;
    }
    case 'finish':
      return isResumable(mode) ? { mode: 'finished', resumeTo: 'playing' } : state;
    case 'home':
      return mode === 'finished' || mode === 'paused' ? INITIAL_MODE : state;
  }
}

/** True si el jugador se mueve y la lógica del mundo avanza. */
export function isWorldRunning(mode: Mode): boolean {
  return mode === 'playing';
}

/** True si el cronómetro avanza: jugando, examinando o con un panel abierto (no en pausa). */
export function isClockRunning(mode: Mode): boolean {
  return mode === 'playing' || mode === 'inspecting' || mode === 'panel';
}
