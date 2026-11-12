/**
 * Señales de cada resultado (puro): qué sonido suena y cuál es su equivalente visual. Toda
 * señal sonora tiene una visual, así el juego entero se puede jugar sin sonido; ningún puzzle
 * se resuelve escuchando.
 */
import type { CombineResult, Outcome } from './game-state';
import type { PlaceResult } from './puzzles/placement';
import type { PressResult } from './puzzles/sequence';

export type SoundCue =
  | 'step'
  | 'wheel'
  | 'press'
  | 'place'
  | 'pickup'
  | 'open'
  | 'close'
  | 'mechanism'
  | 'wrong'
  | 'success';

/**
 * Equivalente visual de cada señal (lo dibujan la interfaz y el render):
 * message: aviso en pantalla · animation: el objeto se mueve (se abre, se cierra) ·
 * panelRight / panelWrong: el panel brilla o tiembla con su mensaje · panelChange: el control
 * del panel cambia (rueda, interruptor bajado, pieza en su hueco) · movement: la vista avanza ·
 * view: se abre la vista de examen o un panel.
 */
export type VisualCue =
  | 'message'
  | 'animation'
  | 'panelRight'
  | 'panelWrong'
  | 'panelChange'
  | 'movement'
  | 'view'
  | 'none';

export interface Signal {
  sound: SoundCue | null;
  visual: VisualCue;
}

const NONE: Signal = { sound: null, visual: 'none' };

export function outcomeSignal(outcome: Outcome): Signal {
  switch (outcome.kind) {
    case 'inspect':
    case 'panel':
      return { sound: null, visual: 'view' };
    case 'toggled':
      return outcome.open
        ? { sound: 'open', visual: 'animation' }
        : { sound: 'close', visual: 'animation' };
    case 'picked':
      return { sound: 'pickup', visual: 'message' };
    case 'locked':
    case 'inventoryFull':
    case 'wrongItem':
      return { sound: 'wrong', visual: 'message' };
    case 'unlocked':
      return { sound: outcome.finished ? 'success' : 'mechanism', visual: 'message' };
    case 'none':
      return NONE;
  }
}

/** Probar una combinación en un panel de ruedas. */
export function codeSignal(ok: boolean): Signal {
  return ok ? { sound: 'success', visual: 'panelRight' } : { sound: 'wrong', visual: 'panelWrong' };
}

/** Accionar un interruptor. */
export function pressSignal(result: PressResult): Signal {
  switch (result) {
    case 'pressed':
      return { sound: 'press', visual: 'panelChange' };
    case 'wrong':
      return { sound: 'wrong', visual: 'panelWrong' };
    case 'solved':
      return { sound: 'success', visual: 'panelRight' };
    case 'invalid':
      return NONE;
  }
}

/** Colocar una pieza; `solved` si con ella se completó el panel. */
export function placeSignal(result: PlaceResult, solved: boolean): Signal {
  switch (result) {
    case 'placed':
      return solved
        ? { sound: 'success', visual: 'panelRight' }
        : { sound: 'place', visual: 'panelChange' };
    case 'wrong':
      return { sound: 'wrong', visual: 'panelWrong' };
    default:
      return NONE;
  }
}

export function combineSignal(result: CombineResult): Signal {
  switch (result.kind) {
    case 'combined':
      return { sound: 'mechanism', visual: 'message' };
    case 'noMatch':
      return { sound: 'wrong', visual: 'message' };
    case 'invalid':
      return NONE;
  }
}

/** Girar una rueda o un dial del panel (el valor visible cambia). */
export const WHEEL_SIGNAL: Signal = { sound: 'wheel', visual: 'panelChange' };

/** Un paso al caminar (la vista avanza). */
export const STEP_SIGNAL: Signal = { sound: 'step', visual: 'movement' };

/** Distancia caminada entre dos pasos, en metros. */
export const STEP_DISTANCE = 0.7;
