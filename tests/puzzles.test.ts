import { describe, expect, it } from 'vitest';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { GameState, INVENTORY_CAPACITY } from '../src/game/game-state';
import { Inventory } from '../src/game/inventory';
import { codeFromClues, codeMatches, stepWheel } from '../src/game/puzzles/code-lock';
import { emptySlots, placementComplete, placeResult } from '../src/game/puzzles/placement';
import type { CodeLockDef, PlacementDef } from '../src/game/room';
import { generateAnswers } from '../src/game/seeded';

const codeLock = ROOM_1.puzzles.find((p) => p.type === 'code-lock') as CodeLockDef;
const placement = ROOM_1.puzzles.find((p) => p.type === 'placement') as PlacementDef;
const newGame = (seed = 3): GameState => new GameState(ROOM_1, generateAnswers(ROOM_1, seed));

/** Abre el cajón, recoge la llave y abre el armario. */
function openCabinet(game: GameState): void {
  game.interact('drawer', null);
  game.interact('small-key', null);
  game.interact('cabinet-door', 'small-key');
}

describe('inventario', () => {
  it('recoge hasta llenarse y no admite más', () => {
    const inv = new Inventory(INVENTORY_CAPACITY);
    for (let i = 0; i < INVENTORY_CAPACITY; i++) expect(inv.add(`o${i}`)).toBe(true);
    expect(inv.isFull).toBe(true);
    expect(inv.add('extra')).toBe(false);
    expect(inv.items).toHaveLength(INVENTORY_CAPACITY);
  });

  it('no duplica un objeto', () => {
    const inv = new Inventory(8);
    inv.add('a');
    expect(inv.add('a')).toBe(false);
  });

  it('seleccionar dos veces la misma casilla la suelta; fuera de rango no hace nada', () => {
    const inv = new Inventory(8);
    inv.add('a');
    inv.add('b');
    inv.select(1);
    expect(inv.selectedItem).toBe('b');
    inv.select(1);
    expect(inv.selectedItem).toBeNull();
    inv.select(5);
    inv.select(-1);
    expect(inv.selectedItem).toBeNull();
  });

  it('quitar un objeto ajusta la selección sin apuntar a otro', () => {
    const inv = new Inventory(8);
    inv.add('a');
    inv.add('b');
    inv.add('c');
    inv.select(2);
    inv.remove('a');
    expect(inv.selectedItem).toBe('c');
    inv.remove('c');
    expect(inv.selectedItem).toBeNull();
  });

  it('recoger un objeto en la sala lo quita de la vista y lo pone en el inventario', () => {
    const game = newGame();
    expect(game.isVisible('small-key')).toBe(false);
    game.interact('drawer', null);
    expect(game.isVisible('small-key')).toBe(true);
    expect(game.interact('small-key', null)).toEqual({
      kind: 'picked',
      id: 'small-key',
      item: 'small-key',
    });
    expect(game.isVisible('small-key')).toBe(false);
    expect(game.inventory.items).toEqual(['small-key']);
  });

  it('con el inventario lleno, el objeto se queda en la sala', () => {
    const game = newGame();
    for (let i = 0; i < INVENTORY_CAPACITY; i++) game.inventory.add(`relleno-${i}`);
    game.interact('drawer', null);
    expect(game.interact('small-key', null)).toEqual({ kind: 'inventoryFull' });
    expect(game.isVisible('small-key')).toBe(true);
  });

  it('un objeto invisible no se puede recoger', () => {
    const game = newGame();
    expect(game.interact('small-key', null)).toEqual({ kind: 'none' });
    expect(game.inventory.items).toEqual([]);
  });
});

describe('key-lock', () => {
  it('sin objeto en la mano, el armario está cerrado', () => {
    const game = newGame();
    expect(game.interact('cabinet-door', null)).toEqual({ kind: 'locked', id: 'cabinet-door' });
    expect(game.isOpen('cabinet-door')).toBe(false);
  });

  it('la llave correcta lo abre y se gasta', () => {
    const game = newGame();
    openCabinet(game);
    expect(game.isSolved('p-cabinet')).toBe(true);
    expect(game.isOpen('cabinet-door')).toBe(true);
    expect(game.inventory.has('small-key')).toBe(false);
  });

  it('un objeto equivocado no abre y no se pierde', () => {
    const game = newGame();
    game.interact('drawer', null);
    game.interact('small-key', null);
    expect(game.interact('exit-door', 'small-key')).toEqual({
      kind: 'wrongItem',
      item: 'small-key',
    });
    expect(game.inventory.has('small-key')).toBe(true);
    expect(game.isSolved('p-exit')).toBe(false);
  });

  it('un objeto que no se tiene no cuenta como usado', () => {
    const game = newGame();
    expect(game.interact('cabinet-door', 'small-key')).toEqual({
      kind: 'locked',
      id: 'cabinet-door',
    });
  });

  it('una vez abierto, se puede cerrar y abrir libremente', () => {
    const game = newGame();
    openCabinet(game);
    expect(game.interact('cabinet-door', null)).toEqual({
      kind: 'toggled',
      id: 'cabinet-door',
      open: false,
    });
    expect(game.isVisible('block-circle')).toBe(false);
    game.interact('cabinet-door', null);
    expect(game.isVisible('block-circle')).toBe(true);
  });

  it('la etiqueta de acción cambia con el objeto en la mano', () => {
    const game = newGame();
    expect(game.actionLabel('cabinet-door', null)).toBe('open');
    expect(game.actionLabel('cabinet-door', 'small-key')).toBe('use');
    expect(game.actionLabel('book', 'small-key')).toBe('examine');
    expect(game.actionLabel('chest', null)).toBe('tryCode');
    expect(game.actionLabel('slot-panel', null)).toBe('place');
  });
});

describe('code-lock', () => {
  it('las ruedas giran de 9 a 0 y de 0 a 9', () => {
    expect(stepWheel(9, 1)).toBe(0);
    expect(stepWheel(0, -1)).toBe(9);
    expect(stepWheel(4, 1)).toBe(5);
    expect(stepWheel(4, -13)).toBe(1);
  });

  it('comparar códigos', () => {
    expect(codeMatches([1, 2, 3, 4], [1, 2, 3, 4])).toBe(true);
    expect(codeMatches([1, 2, 3, 4], [1, 2, 3, 5])).toBe(false);
    expect(codeMatches([1, 2, 3, 4], [1, 2, 3])).toBe(false);
  });

  it('interactuar con el cofre abre su panel', () => {
    expect(newGame().interact('chest', null)).toEqual({ kind: 'panel', puzzle: 'p-chest' });
  });

  it('un código equivocado no abre y se puede reintentar sin límite', () => {
    const game = newGame(11);
    const answer = game.answers.codes.get('p-chest') ?? [];
    const wrong = answer.map((d) => stepWheel(d, 1));
    for (let i = 0; i < 50; i++) expect(game.tryCode('p-chest', wrong)).toBe(false);
    expect(game.isSolved('p-chest')).toBe(false);
    expect(game.tryCode('p-chest', answer)).toBe(true);
    expect(game.isOpen('chest')).toBe(true);
    expect(game.isVisible('door-key')).toBe(true);
  });

  it('códigos con longitud o valores raros no abren ni rompen', () => {
    const game = newGame();
    for (const attempt of [[], [1, 2, 3], [1, 2, 3, 4, 5], [Number.NaN, 1, 2, 3], [-1, 99, 2, 3]]) {
      expect(game.tryCode('p-chest', attempt)).toBe(false);
    }
    expect(game.tryCode('no-existe', [1, 2, 3, 4])).toBe(false);
  });

  it('el código se deduce de las pistas solo cuando se tienen todas', () => {
    const answers = generateAnswers(ROOM_1, 5);
    const all = (clue: string) => answers.clues.get(clue);
    expect(codeFromClues(codeLock, all)).toEqual(answers.codes.get('p-chest'));
    const missingOrder = (clue: string) => (clue === codeLock.orderClue ? undefined : all(clue));
    expect(codeFromClues(codeLock, missingOrder)).toBeNull();
    const missingDigit = (clue: string) => (clue === 'clue-square' ? undefined : all(clue));
    expect(codeFromClues(codeLock, missingDigit)).toBeNull();
  });

  it('pistas contradictorias (una forma con dos dígitos) no dan código', () => {
    const twice = (clue: string) =>
      clue === codeLock.orderClue
        ? { kind: 'order' as const, symbols: codeLock.symbols }
        : { kind: 'symbolDigit' as const, symbol: 'circle' as const, digit: 1 };
    expect(codeFromClues(codeLock, twice)).toBeNull();
  });
});

describe('placement', () => {
  it('cada bloque encaja solo en su silueta; estados intermedios', () => {
    let slots = emptySlots(placement);
    expect(placeResult(placement, slots, 0, 'block-circle')).toBe('wrong');
    expect(placeResult(placement, slots, 0, 'block-square')).toBe('placed');
    slots = ['block-square', null, null];
    expect(placementComplete(placement, slots)).toBe(false);
    expect(placeResult(placement, slots, 0, 'block-square')).toBe('occupied');
    expect(placeResult(placement, slots, 7, 'block-square')).toBe('invalid');
    expect(placementComplete(placement, ['block-square', 'block-circle', 'block-triangle'])).toBe(
      true,
    );
  });

  it('un bloque que no encaja sigue en el inventario', () => {
    const game = newGame();
    openCabinet(game);
    game.interact('block-circle', null);
    expect(game.place('p-panel', 0, 'block-circle')).toBe('wrong');
    expect(game.inventory.has('block-circle')).toBe(true);
  });

  it('colocar los tres bloques resuelve el panel y muestra la tarjeta', () => {
    const game = newGame();
    openCabinet(game);
    for (const id of ['block-circle', 'block-triangle', 'block-square']) game.interact(id, null);
    expect(game.isVisible('order-card')).toBe(false);
    expect(game.place('p-panel', 1, 'block-circle')).toBe('placed');
    expect(game.placementSlots('p-panel')).toEqual([null, 'block-circle', null]);
    expect(game.isSolved('p-panel')).toBe(false);
    game.place('p-panel', 0, 'block-square');
    game.place('p-panel', 2, 'block-triangle');
    expect(game.isSolved('p-panel')).toBe(true);
    expect(game.isVisible('order-card')).toBe(true);
    expect(game.inventory.items).toEqual([]);
  });

  it('no se puede colocar un objeto que no se tiene', () => {
    expect(newGame().place('p-panel', 0, 'block-square')).toBe('invalid');
  });
});

describe('examinar y salida', () => {
  it('examinar descubre la pista y no cambia nada más', () => {
    const game = newGame();
    expect(game.hasSeen('clue-circle')).toBe(false);
    expect(game.seenClue('clue-circle')).toBeUndefined();
    expect(game.interact('book', null)).toEqual({ kind: 'inspect', id: 'book' });
    expect(game.hasSeen('clue-circle')).toBe(true);
    expect(game.seenClue('clue-circle')?.kind).toBe('symbolDigit');
  });

  it('la llave de la puerta termina la sala', () => {
    const game = newGame(9);
    game.tryCode('p-chest', game.answers.codes.get('p-chest') ?? []);
    game.interact('door-key', null);
    const outcome = game.interact('exit-door', 'door-key');
    expect(outcome).toEqual({
      kind: 'unlocked',
      id: 'exit-door',
      item: 'door-key',
      finished: true,
    });
    expect(game.finished).toBe(true);
  });
});
