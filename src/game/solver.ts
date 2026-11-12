/**
 * Resolvedor automático para los tests: juega una sala como lo haría una persona, usando solo
 * lo que tiene a la vista (objetos visibles, pistas ya examinadas, su inventario). Puede probar
 * objetos en las cerraduras, pero no conoce los códigos hasta deducirlos de las pistas.
 */
import { GameState } from './game-state';
import { codeFromClues } from './puzzles/code-lock';
import type { RoomDef } from './room';
import type { RoomAnswers } from './seeded';

export interface SolveResult {
  finished: boolean;
  actions: number;
}

/** Continúa una partida desde su estado actual hasta terminarla o quedarse sin opciones. */
export function solveFrom(state: GameState, maxRounds = 100): SolveResult {
  let actions = 0;
  for (let round = 0; round < maxRounds && !state.finished; round++) {
    let progress = false;
    // 1. Recoger, examinar y abrir todo lo que está a la vista.
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
    // 2. Intentar cada puzzle con lo que se tiene.
    for (const puzzle of state.room.puzzles) {
      if (state.isSolved(puzzle.id) || !state.isVisible(puzzle.target)) continue;
      if (puzzle.type === 'key-lock') {
        for (const item of [...state.inventory.items]) {
          actions += 1;
          if (state.interact(puzzle.target, item).kind === 'unlocked') {
            progress = true;
            break;
          }
        }
      } else if (puzzle.type === 'code-lock') {
        const code = codeFromClues(puzzle, (clue) => state.seenClue(clue));
        if (code !== null) {
          actions += 1;
          if (state.tryCode(puzzle.id, code)) progress = true;
        }
      } else {
        const slots = state.placementSlots(puzzle.id);
        slots.forEach((slot, index) => {
          if (slot !== null) return;
          for (const item of [...state.inventory.items]) {
            actions += 1;
            if (state.place(puzzle.id, index, item) === 'placed') {
              progress = true;
              break;
            }
          }
        });
      }
    }
    if (!progress) break;
  }
  return { finished: state.finished, actions };
}

export function solveRoom(room: RoomDef, answers: RoomAnswers): SolveResult {
  return solveFrom(new GameState(room, answers));
}
