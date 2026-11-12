/**
 * Resolvedor automático para los tests: juega una sala como lo haría una persona, usando solo
 * lo que tiene a la vista (objetos visibles, pistas ya examinadas, su inventario). Puede probar
 * objetos en las cerraduras y combinar objetos a ciegas, pero no conoce las respuestas de las
 * ruedas ni de los interruptores hasta deducirlas de las pistas.
 */
import { GameState } from './game-state';
import type { KnownClue } from './puzzles/clue';
import { codeFromClues } from './puzzles/code-lock';
import { positionsFromClue } from './puzzles/dial';
import { sequenceFromClue } from './puzzles/sequence';
import { symbolsFromClue } from './puzzles/symbol-lock';
import { puzzleTarget, type PuzzleDef, type RoomDef } from './room';
import type { RoomAnswers } from './seeded';

export interface SolveResult {
  finished: boolean;
  actions: number;
}

/** Respuesta de un puzzle de ruedas deducida de las pistas vistas, o null. */
function wheelAnswer(puzzle: PuzzleDef, known: KnownClue): number[] | null {
  switch (puzzle.type) {
    case 'code-lock':
      return codeFromClues(puzzle, known);
    case 'dial':
      return positionsFromClue(puzzle, known);
    case 'symbol-lock':
      return symbolsFromClue(puzzle, known);
    default:
      return null;
  }
}

/** Recoge, examina y abre todo lo que está a la vista. Devuelve [acciones, hubo progreso]. */
function sweep(state: GameState): [number, boolean] {
  let actions = 0;
  let progress = false;
  for (const id of state.visibleIds()) {
    const def = state.def(id);
    if (!def) continue;
    const lock = def.lock === undefined ? undefined : state.puzzle(def.lock);
    const locked = lock !== undefined && !state.isSolved(lock.id);
    const worth =
      def.behavior === 'pickup' ||
      (def.behavior === 'examine' && def.clue !== undefined && !state.hasSeen(def.clue)) ||
      (def.behavior === 'toggle' && !locked && !state.isOpen(id));
    if (worth) {
      const outcome = state.interact(id, null);
      actions += 1;
      if (outcome.kind !== 'none' && outcome.kind !== 'inventoryFull') progress = true;
    }
  }
  return [actions, progress];
}

/** Intenta un puzzle con lo que se tiene. Devuelve [acciones, hubo progreso]. */
function attempt(state: GameState, puzzle: PuzzleDef): [number, boolean] {
  let actions = 0;
  const known: KnownClue = (clue) => state.seenClue(clue);
  const items = [...state.inventory.items];
  switch (puzzle.type) {
    case 'key-lock':
      for (const item of items) {
        actions += 1;
        if (state.interact(puzzle.target, item).kind === 'unlocked') return [actions, true];
      }
      return [actions, false];
    case 'placement': {
      let progress = false;
      state.placementSlots(puzzle.id).forEach((slot, index) => {
        if (slot !== null) return;
        for (const item of [...state.inventory.items]) {
          actions += 1;
          if (state.place(puzzle.id, index, item) === 'placed') {
            progress = true;
            break;
          }
        }
      });
      return [actions, progress];
    }
    case 'sequence': {
      const order = sequenceFromClue(puzzle, known);
      if (order === null) return [0, false];
      // Si quedó un intento a medias, se termina con los que faltan (vuelven a su sitio).
      for (
        let i = 0;
        i < puzzle.switches.length && state.pressedSwitches(puzzle.id).length > 0;
        i++
      ) {
        if (state.pressedSwitches(puzzle.id).includes(i)) continue;
        actions += 1;
        state.pressSwitch(puzzle.id, i);
      }
      if (state.isSolved(puzzle.id)) return [actions, true];
      for (const index of order) {
        actions += 1;
        state.pressSwitch(puzzle.id, index);
      }
      return [actions, state.isSolved(puzzle.id)];
    }
    case 'combine':
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          actions += 1;
          if (state.combine(items[i] ?? '', items[j] ?? '').kind === 'combined') {
            return [actions, true];
          }
        }
      }
      return [actions, false];
    default: {
      const answer = wheelAnswer(puzzle, known);
      if (answer === null) return [0, false];
      return [1, state.tryCode(puzzle.id, answer)];
    }
  }
}

/** Continúa una partida desde su estado actual hasta terminarla o quedarse sin opciones. */
export function solveFrom(state: GameState, maxRounds = 100): SolveResult {
  let actions = 0;
  for (let round = 0; round < maxRounds && !state.finished; round++) {
    const [swept, sweptProgress] = sweep(state);
    actions += swept;
    let progress = sweptProgress;
    for (const puzzle of state.room.puzzles) {
      if (state.isSolved(puzzle.id)) continue;
      const target = puzzleTarget(puzzle);
      if (target !== undefined && !state.isVisible(target)) continue;
      const [count, solved] = attempt(state, puzzle);
      actions += count;
      if (solved) progress = true;
    }
    if (!progress) break;
  }
  return { finished: state.finished, actions };
}

export function solveRoom(room: RoomDef, answers: RoomAnswers): SolveResult {
  return solveFrom(new GameState(room, answers));
}
