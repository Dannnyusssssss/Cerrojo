/**
 * Texto de cada nivel de pista (puro: sin DOM, para poder probarlo). Los dos primeros niveles
 * están escritos a mano en texts.ts; el tercero es la solución, armada con las respuestas de
 * la partida.
 */
import { TEXTS } from '../data/texts';
import type { GameState } from '../game/game-state';
import type { RoomAnswers } from '../game/seeded';
import type { PuzzleDef, RoomDef } from '../game/room';
import { itemName } from './feedback';

type HintTable = Readonly<Record<string, readonly [string, string]>>;

/** Pistas escritas a mano de una sala (niveles 1 y 2 de cada puzzle). */
export function roomHints(room: RoomDef): HintTable {
  return TEXTS.hints[room.titleKey];
}

function objectName(room: RoomDef, id: string): string {
  const def = room.interactables.find((d) => d.id === id);
  return def ? TEXTS.objects[def.nameKey] : id;
}

/** Une una lista como «a, b y c». */
export function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1] ?? ''}`;
}

/** Tercer nivel: la solución exacta de esta partida. */
export function solutionText(room: RoomDef, answers: RoomAnswers, puzzle: PuzzleDef): string {
  const t = TEXTS.hintSolution;
  const answer = answers.codes.get(puzzle.id) ?? [];
  switch (puzzle.type) {
    case 'key-lock':
      return t.keyLock(itemName(room.items, puzzle.key), objectName(room, puzzle.target));
    case 'code-lock':
      return t.code(objectName(room, puzzle.target), answer.join(' '));
    case 'dial':
      // El panel numera las posiciones desde 1 (la marca larga).
      return t.dial(
        objectName(room, puzzle.target),
        joinList(answer.map((p) => TEXTS.dialPanel.position(p + 1))),
      );
    case 'symbol-lock':
      return t.symbols(
        objectName(room, puzzle.target),
        joinList(answer.map((i) => TEXTS.shapes[puzzle.symbols[i] ?? 'circle'])),
      );
    case 'sequence':
      return t.sequence(
        objectName(room, puzzle.target),
        joinList(
          answer.map((i) => t.switchItem(i + 1, TEXTS.shapes[puzzle.switches[i] ?? 'circle'])),
        ),
      );
    case 'placement':
      return t.placement(
        objectName(room, puzzle.target),
        joinList(puzzle.slots.map((s, i) => t.slotItem(i + 1, itemName(room.items, s.item)))),
      );
    case 'combine':
      return t.combine(
        itemName(room.items, puzzle.inputs[0]),
        itemName(room.items, puzzle.inputs[1]),
      );
  }
}

/** Texto del nivel `level` (1 a 3) de la pista de un puzzle. */
export function hintText(
  room: RoomDef,
  answers: RoomAnswers,
  puzzle: PuzzleDef,
  level: number,
): string {
  if (level >= 3) return solutionText(room, answers, puzzle);
  const written = roomHints(room)[puzzle.id];
  return written?.[level === 1 ? 0 : 1] ?? solutionText(room, answers, puzzle);
}

/** Lo que muestra el panel de pistas para el puzzle elegido (null: no queda nada). */
export function hintView(
  room: RoomDef,
  state: GameState,
  puzzle: PuzzleDef | null,
): { texts: string[]; next: number | null; none: boolean } {
  if (puzzle === null) return { texts: [], next: null, none: true };
  const seen = state.hints.seen(puzzle.id);
  const texts = Array.from({ length: seen }, (_, i) =>
    hintText(room, state.answers, puzzle, i + 1),
  );
  return { texts, next: state.hints.next(puzzle.id), none: false };
}
