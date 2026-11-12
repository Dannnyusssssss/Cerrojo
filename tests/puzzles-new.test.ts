import { describe, expect, it } from 'vitest';
import { SHAPES } from '../src/data/shapes';
import { GameState } from '../src/game/game-state';
import { combineMatches } from '../src/game/puzzles/combine';
import { positionsFromClue, stepDial } from '../src/game/puzzles/dial';
import { pressSwitch, sequenceFromClue } from '../src/game/puzzles/sequence';
import { symbolsFromClue } from '../src/game/puzzles/symbol-lock';
import type { ClueContent } from '../src/game/puzzles/clue';
import type {
  CombineDef,
  DialDef,
  PuzzleDef,
  RoomDef,
  SequenceDef,
  SymbolLockDef,
} from '../src/game/room';
import { generateAnswers } from '../src/game/seeded';
import { solveFrom, solveRoom } from '../src/game/solver';
import { validateRoom } from '../src/game/validate-room';
import { combineMessage } from '../src/ui/feedback';
import { keyToIntent } from '../src/ui/input-map';
import { ROOM_MIX } from './fixtures/room-mix';

function puzzleOf<T extends PuzzleDef['type']>(type: T): PuzzleDef & { type: T } {
  const found = ROOM_MIX.puzzles.find((p) => p.type === type);
  if (!found) throw new Error(type);
  return found as PuzzleDef & { type: T };
}

const sequence: SequenceDef = puzzleOf('sequence');
const dial: DialDef = puzzleOf('dial');
const symbolLock: SymbolLockDef = puzzleOf('symbol-lock');
const combine: CombineDef = puzzleOf('combine');
const newGame = (seed = 7): GameState => new GameState(ROOM_MIX, generateAnswers(ROOM_MIX, seed));
const only =
  (clue: string, content: ClueContent) =>
  (asked: string): ClueContent | undefined =>
    asked === clue ? content : undefined;

/** Combina la herramienta y abre la caja: deja visibles los interruptores. */
function openBox(game: GameState): void {
  game.interact('part-a', null);
  game.interact('part-b', null);
  game.combine('part-a', 'part-b');
  game.interact('box', 'tool');
}

const SEEDS = Array.from({ length: 1000 }, (_, i) => i * 7919 + 1);

describe('formas', () => {
  it('hay 8 formas distintas, con nombre', () => {
    expect(new Set(SHAPES).size).toBe(8);
  });
});

describe('sequence', () => {
  it('cada pulsación solo se apunta; el orden se comprueba con la última', () => {
    expect(pressSwitch([2, 0, 1], [], 2)).toEqual({ pressed: [2], result: 'pressed' });
    expect(pressSwitch([2, 0, 1], [2], 0)).toEqual({ pressed: [2, 0], result: 'pressed' });
    expect(pressSwitch([2, 0, 1], [2, 0], 1)).toEqual({ pressed: [2, 0, 1], result: 'solved' });
  });

  it('las pulsaciones intermedias no delatan si el orden va bien', () => {
    // Empezar bien o mal da la misma respuesta hasta accionar el último.
    expect(pressSwitch([2, 0, 1], [], 2).result).toBe('pressed');
    expect(pressSwitch([2, 0, 1], [], 1).result).toBe('pressed');
    expect(pressSwitch([2, 0, 1], [1], 0).result).toBe('pressed');
  });

  it('con un orden equivocado, al accionar el último todo vuelve a su sitio', () => {
    expect(pressSwitch([2, 0, 1], [0, 2], 1)).toEqual({ pressed: [], result: 'wrong' });
  });

  it('un interruptor ya accionado o inexistente no cambia nada', () => {
    expect(pressSwitch([2, 0, 1], [2], 2)).toEqual({ pressed: [2], result: 'invalid' });
    for (const index of [-1, 1.5, Number.NaN, 3]) {
      expect(pressSwitch([0, 1, 2], [1], index)).toEqual({ pressed: [1], result: 'invalid' });
    }
    expect(pressSwitch([], [], 0).result).toBe('invalid');
  });

  it('el orden se deduce de la pista solo si es único', () => {
    const order = {
      kind: 'order' as const,
      symbols: ['cross', 'circle', 'star', 'hexagon'] as const,
    };
    expect(sequenceFromClue(sequence, only('clue-seq', order))).toEqual([3, 0, 1, 2]);
    expect(sequenceFromClue(sequence, () => undefined)).toBeNull();
    const short = { kind: 'order' as const, symbols: ['cross', 'circle'] as const };
    expect(sequenceFromClue(sequence, only('clue-seq', short))).toBeNull();
    const repeated = {
      kind: 'order' as const,
      symbols: ['cross', 'cross', 'star', 'hexagon'] as const,
    };
    expect(sequenceFromClue(sequence, only('clue-seq', repeated))).toBeNull();
    const foreign = {
      kind: 'order' as const,
      symbols: ['arrow', 'circle', 'star', 'hexagon'] as const,
    };
    expect(sequenceFromClue(sequence, only('clue-seq', foreign))).toBeNull();
  });

  it('en la partida: fallar no tiene consecuencias y el orden correcto lo resuelve', () => {
    const game = newGame(21);
    expect(game.pressSwitch('p-switch', 0)).toBe('invalid'); // aún no es visible
    openBox(game);
    const answer = game.answers.codes.get('p-switch') ?? [];
    const reversed = [...answer].reverse();
    for (const index of reversed.slice(0, -1))
      expect(game.pressSwitch('p-switch', index)).toBe('pressed');
    expect(game.pressedSwitches('p-switch')).toEqual(reversed.slice(0, -1));
    expect(game.pressSwitch('p-switch', reversed[reversed.length - 1] ?? 0)).toBe('wrong');
    expect(game.pressedSwitches('p-switch')).toEqual([]);
    expect(game.pressSwitch('p-switch', 9)).toBe('invalid');
    for (const index of answer.slice(0, -1))
      expect(game.pressSwitch('p-switch', index)).toBe('pressed');
    expect(game.pressSwitch('p-switch', answer[answer.length - 1] ?? 0)).toBe('solved');
    expect(game.isSolved('p-switch')).toBe(true);
    expect(game.isVisible('dial-note')).toBe(true);
    expect(game.pressSwitch('p-switch', 0)).toBe('solved');
  });

  it('la etiqueta del panel de interruptores es «Accionar»', () => {
    const game = newGame();
    openBox(game);
    expect(game.actionLabel('switchboard', null)).toBe('operate');
    expect(game.actionLabel('safe', null)).toBe('tryCode');
    expect(game.interact('safe', null)).toEqual({ kind: 'panel', puzzle: 'p-dial' });
  });
});

describe('dial', () => {
  it('las agujas dan la vuelta en ambos sentidos', () => {
    expect(stepDial(7, 1, 8)).toBe(0);
    expect(stepDial(0, -1, 8)).toBe(7);
    expect(stepDial(3, -11, 8)).toBe(0);
  });

  it('las posiciones salen de la pista solo si encajan con los diales', () => {
    const clue = (positions: number[]) => only('clue-dial', { kind: 'positions', positions });
    expect(positionsFromClue(dial, clue([1, 5, 7]))).toEqual([1, 5, 7]);
    expect(positionsFromClue(dial, clue([1, 5]))).toBeNull();
    expect(positionsFromClue(dial, clue([1, 5, 8]))).toBeNull();
    expect(positionsFromClue(dial, clue([1, -1, 2]))).toBeNull();
    expect(positionsFromClue(dial, clue([1, 0.5, 2]))).toBeNull();
    expect(positionsFromClue(dial, () => undefined)).toBeNull();
  });

  it('por semilla: nunca 0 (los diales empiezan en 0) y dentro del rango', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const code = generateAnswers(ROOM_MIX, seed).codes.get('p-dial') ?? [];
      expect(code).toHaveLength(3);
      for (const p of code) expect(p >= 1 && p <= 7).toBe(true);
    }
  });

  it('en la partida: posiciones equivocadas no abren; las correctas sí', () => {
    const game = newGame(5);
    const answer = game.answers.codes.get('p-dial') ?? [];
    expect(game.tryCode('p-dial', [0, 0, 0])).toBe(false);
    expect(
      game.tryCode(
        'p-dial',
        answer.map((p) => stepDial(p, 1, 8)),
      ),
    ).toBe(false);
    expect(game.tryCode('p-dial', answer)).toBe(true);
    expect(game.isOpen('safe')).toBe(true);
  });
});

describe('symbol-lock', () => {
  it('las formas salen de la pista solo si son de la cerradura', () => {
    const clue = (symbols: SymbolLockDef['symbols']) =>
      only('clue-sym', { kind: 'order', symbols });
    expect(symbolsFromClue(symbolLock, clue(['arrow', 'star', 'circle']))).toEqual([3, 0, 4]);
    expect(symbolsFromClue(symbolLock, clue(['arrow', 'star']))).toBeNull();
    expect(symbolsFromClue(symbolLock, clue(['arrow', 'star', 'triangle']))).toBeNull();
  });

  it('por semilla: formas distintas de la cerradura, y nunca todas en la posición inicial', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const code = generateAnswers(ROOM_MIX, seed).codes.get('p-symbol') ?? [];
      expect(new Set(code).size).toBe(3);
      expect(code.every((i) => i === 0)).toBe(false);
      for (const i of code) expect(i >= 0 && i < symbolLock.symbols.length).toBe(true);
    }
  });

  it('en la partida: una combinación equivocada no abre', () => {
    const game = newGame(9);
    const answer = game.answers.codes.get('p-symbol') ?? [];
    expect(game.tryCode('p-symbol', [...answer].reverse())).toBe(false);
    expect(game.tryCode('p-symbol', [99, -1, 0.5])).toBe(false);
    expect(game.tryCode('p-symbol', answer)).toBe(true);
    expect(game.isVisible('exit-key')).toBe(true);
  });
});

describe('combine', () => {
  it('las piezas encajan en cualquier orden, pero no consigo mismas', () => {
    expect(combineMatches(combine, 'part-a', 'part-b')).toBe(true);
    expect(combineMatches(combine, 'part-b', 'part-a')).toBe(true);
    expect(combineMatches(combine, 'part-a', 'part-a')).toBe(false);
    expect(combineMatches(combine, 'part-a', 'tool')).toBe(false);
  });

  it('combinar gasta las dos piezas y entrega el objeto nuevo', () => {
    const game = newGame();
    game.interact('part-a', null);
    game.interact('part-b', null);
    expect(game.combine('part-b', 'part-a')).toEqual({ kind: 'combined', item: 'tool' });
    expect(game.inventory.items).toEqual(['tool']);
    expect(game.isSolved('p-combine')).toBe(true);
  });

  it('objetos que no encajan siguen en el inventario', () => {
    const game = new GameState(ROOM_MIX, generateAnswers(ROOM_MIX, 1));
    game.interact('part-a', null);
    game.inventory.add('exit-key');
    expect(game.combine('part-a', 'exit-key')).toEqual({ kind: 'noMatch' });
    expect(game.inventory.items).toEqual(['part-a', 'exit-key']);
  });

  it('no se combina lo que no se tiene ni un objeto consigo mismo', () => {
    const game = newGame();
    game.interact('part-a', null);
    expect(game.combine('part-a', 'part-b')).toEqual({ kind: 'invalid' });
    expect(game.combine('part-a', 'part-a')).toEqual({ kind: 'invalid' });
    expect(game.inventory.items).toEqual(['part-a']);
  });

  it('cada resultado tiene un mensaje visible', () => {
    expect(combineMessage({ kind: 'combined', item: 'tool' }, ROOM_MIX.items)).toContain(
      'Llave pequeña',
    );
    expect(combineMessage({ kind: 'noMatch' }, ROOM_MIX.items)).not.toBe('');
    expect(combineMessage({ kind: 'invalid' }, ROOM_MIX.items)).not.toBe('');
  });

  it('la tecla C pide combinar', () => {
    const none = { ctrl: false, alt: false, meta: false };
    expect(keyToIntent('KeyC', none)).toEqual({ kind: 'action', intent: 'combine' });
    expect(keyToIntent('KeyC', { ...none, ctrl: true })).toBeNull();
  });
});

describe('sala de prueba con todos los tipos nuevos', () => {
  it('pasa la validación estática', () => {
    expect(validateRoom(ROOM_MIX)).toEqual([]);
  });

  it('el resolvedor la termina con 1000 semillas', () => {
    for (const seed of SEEDS) {
      expect(solveRoom(ROOM_MIX, generateAnswers(ROOM_MIX, seed)).finished).toBe(true);
    }
  });

  it('la misma semilla da las mismas respuestas', () => {
    const a = generateAnswers(ROOM_MIX, 42);
    const b = generateAnswers(ROOM_MIX, 42);
    expect([...a.codes]).toEqual([...b.codes]);
    expect([...a.clues]).toEqual([...b.clues]);
  });

  it('sin ambigüedad: cada pista da exactamente la respuesta de su puzzle', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const answers = generateAnswers(ROOM_MIX, seed);
      const all = (clue: string) => answers.clues.get(clue);
      expect(sequenceFromClue(sequence, all)).toEqual(answers.codes.get('p-switch'));
      expect(positionsFromClue(dial, all)).toEqual(answers.codes.get('p-dial'));
      expect(symbolsFromClue(symbolLock, all)).toEqual(answers.codes.get('p-symbol'));
    }
  });

  it('a mitad de una secuencia equivocada, el resolvedor sigue pudiendo terminar', () => {
    const game = newGame(77);
    openBox(game);
    const answer = game.answers.codes.get('p-switch') ?? [];
    // Un intento a medias que empieza mal: el resolvedor lo termina y vuelve a empezar.
    game.pressSwitch('p-switch', answer[1] ?? 0);
    game.pressSwitch('p-switch', answer[0] ?? 0);
    expect(game.pressedSwitches('p-switch')).toHaveLength(2);
    expect(solveFrom(game).finished).toBe(true);
  });
});

describe('validación de las reglas nuevas', () => {
  const withPuzzles = (puzzles: readonly PuzzleDef[]): RoomDef => ({ ...ROOM_MIX, puzzles });
  const replace = (id: string, next: PuzzleDef): RoomDef =>
    withPuzzles(ROOM_MIX.puzzles.map((p) => (p.id === id ? next : p)));

  it('un objeto que se consigue de dos modos es un error', () => {
    const room = replace('p-combine', { ...combine, result: 'part-a' });
    expect(validateRoom(room).join(' ')).toMatch(/dos modos/);
  });

  it('un objeto que necesitan dos puzzles es un error (se gasta en el primero)', () => {
    const room = replace('p-exit', {
      id: 'p-exit',
      type: 'key-lock',
      target: 'exit-door',
      key: 'tool',
      exit: true,
    });
    expect(validateRoom(room).join(' ')).toMatch(/lo necesitan/);
  });

  it('interruptores con formas repetidas son un error', () => {
    const room = replace('p-switch', { ...sequence, switches: ['circle', 'circle', 'star'] });
    expect(validateRoom(room).join(' ')).toMatch(/formas distintas/);
  });

  it('más ruedas que formas es un error', () => {
    const room = replace('p-symbol', { ...symbolLock, wheels: 6 });
    expect(validateRoom(room).join(' ')).toMatch(/más ruedas/);
  });

  it('diales sin posiciones suficientes son un error', () => {
    const room = replace('p-dial', { ...dial, positions: 1 });
    expect(validateRoom(room).join(' ')).toMatch(/diales/);
  });

  it('combinar un objeto consigo mismo es un error', () => {
    const room = replace('p-combine', { ...combine, inputs: ['part-a', 'part-a'] });
    expect(validateRoom(room).join(' ')).toMatch(/consigo mismo/);
  });

  it('más objetos que casillas es un error', () => {
    const extra = Array.from({ length: 6 }, (_, i) => ({
      id: `extra-${i}`,
      nameKey: 'smallKey' as const,
      icon: 'key' as const,
    }));
    const room: RoomDef = { ...ROOM_MIX, items: [...ROOM_MIX.items, ...extra] };
    expect(validateRoom(room).join(' ')).toMatch(/demasiados objetos/);
  });

  it('un ciclo a través de un objeto combinado se detecta', () => {
    // La pieza B queda dentro de la caja, que se abre con la herramienta hecha con la pieza B.
    const room: RoomDef = {
      ...ROOM_MIX,
      interactables: ROOM_MIX.interactables.map((d) =>
        d.id === 'part-b' ? { ...d, insideOf: 'box' } : d,
      ),
    };
    expect(validateRoom(room).join(' ')).toMatch(/ciclo/);
  });
});
