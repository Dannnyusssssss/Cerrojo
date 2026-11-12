import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { SHAPES } from '../src/data/shapes';
import { GameState } from '../src/game/game-state';
import { codeFromClues } from '../src/game/puzzles/code-lock';
import type { CodeLockDef } from '../src/game/room';
import { generateAnswers } from '../src/game/seeded';
import { solveFrom, solveRoom } from '../src/game/solver';

const codeLock = ROOM_1.puzzles.find((p) => p.type === 'code-lock') as CodeLockDef;

/** 1000 semillas fijas, incluidos los extremos del rango válido. */
const SEEDS = [0, 1, 4294967295, ...Array.from({ length: 997 }, (_, i) => (i * 2654435761) >>> 0)];

describe('Sala 1: solución garantizada', () => {
  it('el resolvedor completa la sala con 1000 semillas', () => {
    for (const seed of SEEDS) {
      const result = solveRoom(ROOM_1, generateAnswers(ROOM_1, seed));
      expect(result.finished, `semilla ${seed}`).toBe(true);
    }
  });

  it('cada semilla genera pistas sin ambigüedad: una única respuesta', () => {
    for (const seed of SEEDS) {
      const answers = generateAnswers(ROOM_1, seed);
      const order = answers.clues.get(codeLock.orderClue);
      expect(order?.kind).toBe('order');
      if (order?.kind !== 'order') continue;
      // El orden usa cada forma exactamente una vez.
      expect([...order.symbols].sort()).toEqual([...codeLock.symbols].sort());
      // Cada forma tiene exactamente una pista con un dígito de 0 a 9.
      const symbols = codeLock.digitClues.map(({ clue }) => {
        const content = answers.clues.get(clue);
        expect(content?.kind).toBe('symbolDigit');
        if (content?.kind !== 'symbolDigit') return null;
        expect(Number.isInteger(content.digit) && content.digit >= 0 && content.digit <= 9).toBe(
          true,
        );
        return content.symbol;
      });
      expect(new Set(symbols).size).toBe(codeLock.symbols.length);
      // Las pistas llevan exactamente al código de la cerradura.
      expect(codeFromClues(codeLock, (c) => answers.clues.get(c))).toEqual(
        answers.codes.get(codeLock.id),
      );
    }
  });

  it('la misma semilla da las mismas respuestas; semillas distintas, códigos distintos', () => {
    expect(generateAnswers(ROOM_1, 42)).toEqual(generateAnswers(ROOM_1, 42));
    const codes = new Set(
      SEEDS.map((s) => (generateAnswers(ROOM_1, s).codes.get('p-chest') ?? []).join('')),
    );
    // Con 1000 semillas, casi todas dan un código distinto (10 000 combinaciones posibles).
    expect(codes.size).toBeGreaterThan(900);
    expect(generateAnswers(ROOM_1, 1).codes.get('p-chest')).not.toEqual(
      generateAnswers(ROOM_1, 2).codes.get('p-chest'),
    );
  });

  it('las formas de las pistas se distinguen por su contorno (todas distintas)', () => {
    expect(new Set(codeLock.symbols).size).toBe(codeLock.symbols.length);
    for (const s of codeLock.symbols) expect(SHAPES).toContain(s);
  });

  it('sin callejones: tras cualquier secuencia de acciones al azar la sala sigue teniendo solución', () => {
    const ids = ROOM_1.interactables.map((d) => d.id);
    for (let trial = 0; trial < 300; trial++) {
      const rng = new Rng(trial);
      const game = new GameState(ROOM_1, generateAnswers(ROOM_1, trial * 7919));
      for (let step = 0; step < 60; step++) {
        const choice = rng.nextInt(0, 3);
        if (choice === 0) {
          // Interactuar con cualquier objeto, con un objeto del inventario en la mano o sin él.
          const id = ids[rng.nextInt(0, ids.length - 1)] ?? '';
          const items = game.inventory.items;
          const item =
            rng.next() < 0.5 && items.length > 0
              ? (items[rng.nextInt(0, items.length - 1)] ?? null)
              : null;
          game.interact(id, item);
        } else if (choice === 1) {
          game.tryCode('p-chest', [
            rng.nextInt(0, 9),
            rng.nextInt(0, 9),
            rng.nextInt(0, 9),
            rng.nextInt(0, 9),
          ]);
        } else if (choice === 2) {
          const items = game.inventory.items;
          if (items.length > 0)
            game.place('p-panel', rng.nextInt(0, 2), items[rng.nextInt(0, items.length - 1)] ?? '');
        } else {
          game.inventory.select(rng.nextInt(0, 7));
        }
      }
      expect(solveFrom(game).finished, `prueba ${trial}`).toBe(true);
    }
  });
});
