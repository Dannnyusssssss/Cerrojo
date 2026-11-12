/**
 * Partida en curso como registro de acciones acertadas. Al continuar, el registro se repite con
 * la lógica real del juego: si una acción no es legal en ese momento, o la sala queda sin
 * solución, la partida se descarta. Así un guardado manipulado nunca deja un estado imposible.
 *
 * Solo se anota lo que cambia el estado por primera vez (abrir algo por primera vez, recoger,
 * ver una pista nueva, abrir una cerradura…), así el registro está acotado por el tamaño de la
 * sala. Cerrar un cajón no se anota: al continuar, lo que se abrió alguna vez aparece abierto.
 */
import { GameState } from './game-state';
import type { RoomDef } from './room';
import type { RoomAnswers } from './seeded';
import { solveFrom } from './solver';

export type SavedAction =
  | { k: 'open'; id: string }
  | { k: 'take'; id: string }
  | { k: 'look'; id: string }
  | { k: 'use'; id: string; item: string }
  | { k: 'code'; puzzle: string; values: number[] }
  | { k: 'place'; puzzle: string; slot: number; item: string }
  | { k: 'switches'; puzzle: string; order: number[] }
  | { k: 'combine'; a: string; b: string }
  | { k: 'hint'; puzzle: string };

export type SavedActionKind = SavedAction['k'];

export const ACTION_KINDS: readonly SavedActionKind[] = [
  'open',
  'take',
  'look',
  'use',
  'code',
  'place',
  'switches',
  'combine',
  'hint',
];

/** Registro de la partida en curso. */
export class SessionLog {
  private readonly list: SavedAction[];
  private readonly opened = new Set<string>();
  /** Cambia con cada acción anotada (quien guarda lo compara para saber si hay algo nuevo). */
  version = 0;

  constructor(actions: readonly SavedAction[] = []) {
    this.list = [...actions];
    for (const action of actions) if (action.k === 'open') this.opened.add(action.id);
  }

  get actions(): readonly SavedAction[] {
    return this.list;
  }

  /** Anota una acción; abrir algo que ya se abrió alguna vez no se repite. */
  add(action: SavedAction): void {
    if (action.k === 'open') {
      if (this.opened.has(action.id)) return;
      this.opened.add(action.id);
    }
    this.list.push(action);
    this.version += 1;
  }
}

/** Aplica una acción guardada. Devuelve false si no es legal en el estado actual. */
export function applyAction(state: GameState, action: SavedAction): boolean {
  switch (action.k) {
    case 'open': {
      // Lo que abrió una cerradura ya está abierto; si después se cerró y se volvió a abrir,
      // la acción no cambia nada al repetirla.
      const def = state.def(action.id);
      if (def?.behavior === 'toggle' && state.isVisible(action.id) && state.isOpen(action.id)) {
        return true;
      }
      const outcome = state.interact(action.id, null);
      return outcome.kind === 'toggled' && outcome.open;
    }
    case 'take':
      return state.interact(action.id, null).kind === 'picked';
    case 'look': {
      const clue = state.def(action.id)?.clue;
      if (clue === undefined || state.hasSeen(clue)) return false;
      return state.interact(action.id, null).kind === 'inspect' && state.hasSeen(clue);
    }
    case 'use':
      if (!state.inventory.has(action.item)) return false;
      return state.interact(action.id, action.item).kind === 'unlocked';
    case 'code':
      if (state.isSolved(action.puzzle)) return false;
      return state.tryCode(action.puzzle, action.values);
    case 'place':
      return state.place(action.puzzle, action.slot, action.item) === 'placed';
    case 'switches': {
      if (state.isSolved(action.puzzle) || state.pressedSwitches(action.puzzle).length > 0) {
        return false;
      }
      let last = '';
      for (const index of action.order) last = state.pressSwitch(action.puzzle, index);
      return last === 'solved';
    }
    case 'combine':
      return state.combine(action.a, action.b).kind === 'combined';
    case 'hint':
      if (state.puzzle(action.puzzle) === undefined) return false;
      return state.hints.reveal(action.puzzle) !== null;
  }
}

/** Repite un registro desde el principio. Devuelve null si alguna acción no es legal. */
export function replayActions(
  room: RoomDef,
  answers: RoomAnswers,
  actions: readonly SavedAction[],
): GameState | null {
  const state = new GameState(room, answers);
  for (const action of actions) {
    if (!applyAction(state, action)) return null;
  }
  return state;
}

/**
 * Estado de una partida guardada, solo si es válida: todas las acciones son legales, la sala no
 * está terminada y todavía se puede terminar (lo comprueba el resolvedor en una copia).
 */
export function restoreSession(
  room: RoomDef,
  answers: RoomAnswers,
  actions: readonly SavedAction[],
): GameState | null {
  const state = replayActions(room, answers, actions);
  if (state === null || state.finished) return null;
  const copy = replayActions(room, answers, actions);
  if (copy === null || !solveFrom(copy).finished) return null;
  return state;
}
