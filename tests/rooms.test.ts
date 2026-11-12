/**
 * Pruebas comunes a todas las salas del juego: validación estática, geometría, alcance real de
 * cada objeto, solución garantizada con 1000 semillas, ausencia de ambigüedad y de callejones.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { PLAYER } from '../src/data/config';
import { ROOMS } from '../src/data/rooms';
import { TEXTS } from '../src/data/texts';
import { circleOverlapsAny } from '../src/game/collision';
import { GameState } from '../src/game/game-state';
import { codeFromClues } from '../src/game/puzzles/code-lock';
import { positionsFromClue } from '../src/game/puzzles/dial';
import { sequenceFromClue } from '../src/game/puzzles/sequence';
import { symbolsFromClue } from '../src/game/puzzles/symbol-lock';
import {
  aabbIntersects,
  interactableBox,
  isWheelPuzzle,
  roomColliders,
  roomOccluders,
  type PuzzleDef,
  type RoomDef,
} from '../src/game/room';
import { generateAnswers, type RoomAnswers } from '../src/game/seeded';
import { solveFrom, solveRoom } from '../src/game/solver';
import { validateRoom } from '../src/game/validate-room';
import { World } from '../src/game/world';

/** 1000 semillas fijas, incluidos los extremos del rango válido. */
const SEEDS = [0, 1, 4294967295, ...Array.from({ length: 997 }, (_, i) => (i * 2654435761) >>> 0)];

/** Lo que cada sala debe cumplir según el diseño (cantidad de puzzles y tipos que introduce). */
const EXPECTED: Readonly<
  Record<string, { min: number; max: number; types: readonly PuzzleDef['type'][] }>
> = {
  'room-1': { min: 4, max: 5, types: ['code-lock', 'key-lock', 'placement'] },
  'room-2': { min: 6, max: 7, types: ['sequence', 'dial', 'combine'] },
  'room-3': { min: 8, max: 9, types: ['symbol-lock'] },
};

/** Respuesta que se deduce de las pistas para un puzzle con respuesta por semilla, o undefined. */
function deduced(puzzle: PuzzleDef, answers: RoomAnswers): number[] | null | undefined {
  const all = (clue: string) => answers.clues.get(clue);
  switch (puzzle.type) {
    case 'code-lock':
      return codeFromClues(puzzle, all);
    case 'dial':
      return positionsFromClue(puzzle, all);
    case 'symbol-lock':
      return symbolsFromClue(puzzle, all);
    case 'sequence':
      return sequenceFromClue(puzzle, all);
    default:
      return undefined;
  }
}

describe.each(ROOMS.map((room) => [room.id, room] as const))('%s', (_id, room: RoomDef) => {
  it('pasa la validación de solución garantizada', () => {
    expect(validateRoom(room)).toEqual([]);
  });

  it('tiene nombre, y todos sus objetos tienen nombre visible', () => {
    expect(TEXTS.rooms[room.titleKey].name.length).toBeGreaterThan(0);
    for (const item of room.interactables)
      expect(TEXTS.objects[item.nameKey].length).toBeGreaterThan(0);
    for (const item of room.items) expect(TEXTS.objects[item.nameKey].length).toBeGreaterThan(0);
  });

  it('tiene la cantidad de puzzles prevista y usa los tipos que introduce', () => {
    const expected = EXPECTED[room.id];
    expect(expected, 'sala sin expectativas en el test').toBeDefined();
    if (!expected) return;
    expect(room.puzzles.length).toBeGreaterThanOrEqual(expected.min);
    expect(room.puzzles.length).toBeLessThanOrEqual(expected.max);
    const types = new Set(room.puzzles.map((p) => p.type));
    for (const type of expected.types) expect(types.has(type), type).toBe(true);
  });

  it('ningún objeto queda dentro de una pared o un mueble, abierto o cerrado', () => {
    const occluders = roomOccluders(room);
    for (const item of room.interactables) {
      for (const open of [false, true]) {
        const box = interactableBox(item, open);
        for (const occluder of occluders) {
          expect(aabbIntersects(box, occluder), `${item.id} abierto=${open}`).toBe(false);
        }
      }
    }
  });

  it('los muebles quedan dentro de la sala y el jugador cabe en la salida y en cada acceso', () => {
    const hw = room.width / 2;
    const hd = room.depth / 2;
    for (const f of room.furniture) {
      expect(f.x - f.w / 2).toBeGreaterThanOrEqual(-hw);
      expect(f.x + f.w / 2).toBeLessThanOrEqual(hw);
      expect(f.z - f.d / 2).toBeGreaterThanOrEqual(-hd);
      expect(f.z + f.d / 2).toBeLessThanOrEqual(hd);
      expect(f.h).toBeLessThan(room.height);
    }
    const colliders = roomColliders(room);
    expect(circleOverlapsAny(room.spawn, PLAYER.radius, colliders)).toBe(false);
    for (const item of room.interactables) {
      expect(circleOverlapsAny(item.approach, PLAYER.radius, colliders), item.id).toBe(false);
    }
  });

  it('cada objeto se puede señalar desde su punto de acceso cuando es visible', () => {
    // Se juega con el resolvedor ronda a ronda y, tras cada ronda, se apunta a cada objeto
    // visible desde su punto de acceso.
    const checked = new Set<string>();
    for (let rounds = 0; rounds < 30; rounds++) {
      const world = new World(room, generateAnswers(room, 7));
      solveFrom(world.state, rounds);
      for (const def of room.interactables) {
        if (!world.state.isVisible(def.id)) continue;
        const open = world.state.isOpen(def.id);
        // Lo que se queda abierto (la puerta de la cúpula) deja de señalarse a propósito.
        if (open && def.staysOpen === true) continue;
        const target = { ...def.position };
        if (open && def.openOffset) {
          target.x += def.openOffset.x;
          target.y += def.openOffset.y;
          target.z += def.openOffset.z;
        }
        const p = world.player;
        p.x = def.approach.x;
        p.z = def.approach.z;
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        p.yaw = Math.atan2(-dx, -dz);
        p.pitch = Math.atan2(target.y - PLAYER.eyeHeight, Math.hypot(dx, dz));
        expect(world.pick(world.viewRayFromPlayer())?.id, `${def.id} abierto=${open}`).toBe(def.id);
        checked.add(def.id);
      }
      if (world.state.finished) break;
    }
    expect([...checked].sort()).toEqual(room.interactables.map((d) => d.id).sort());
  });

  it('el resolvedor completa la sala con 1000 semillas', () => {
    for (const seed of SEEDS) {
      expect(solveRoom(room, generateAnswers(room, seed)).finished, `semilla ${seed}`).toBe(true);
    }
  });

  it('sin ambigüedad: las pistas llevan exactamente a la respuesta de cada puzzle', () => {
    for (const seed of SEEDS) {
      const answers = generateAnswers(room, seed);
      for (const puzzle of room.puzzles) {
        const result = deduced(puzzle, answers);
        if (result === undefined) continue;
        expect(result, `${puzzle.id} semilla ${seed}`).toEqual(answers.codes.get(puzzle.id));
      }
    }
  });

  it('la misma semilla da las mismas respuestas', () => {
    expect(generateAnswers(room, 42)).toEqual(generateAnswers(room, 42));
  });

  it('sin callejones: tras acciones al azar la sala sigue teniendo solución', () => {
    const ids = room.interactables.map((d) => d.id);
    const pick = <T>(rng: Rng, list: readonly T[]): T | undefined =>
      list.length === 0 ? undefined : list[rng.nextInt(0, list.length - 1)];
    for (let trial = 0; trial < 300; trial++) {
      const rng = new Rng(trial);
      const game = new GameState(room, generateAnswers(room, trial * 7919));
      for (let step = 0; step < 80; step++) {
        const puzzle = pick(rng, room.puzzles);
        const items = game.inventory.items;
        switch (rng.nextInt(0, 5)) {
          case 0:
            game.interact(
              pick(rng, ids) ?? '',
              rng.next() < 0.5 ? (pick(rng, items) ?? null) : null,
            );
            break;
          case 1:
            if (puzzle && isWheelPuzzle(puzzle)) {
              game.tryCode(
                puzzle.id,
                Array.from({ length: 4 }, () => rng.nextInt(0, 9)),
              );
            }
            break;
          case 2:
            game.place(puzzle?.id ?? '', rng.nextInt(0, 3), pick(rng, items) ?? '');
            break;
          case 3:
            game.pressSwitch(puzzle?.id ?? '', rng.nextInt(0, 4));
            break;
          case 4:
            game.combine(pick(rng, items) ?? '', pick(rng, items) ?? '');
            break;
          default:
            game.inventory.select(rng.nextInt(0, 7));
        }
      }
      expect(solveFrom(game).finished, `prueba ${trial}`).toBe(true);
    }
  });
});
