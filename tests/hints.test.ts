import { describe, expect, it } from 'vitest';
import { ROOMS } from '../src/data/rooms';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { ROOM_2 } from '../src/data/rooms/room-2';
import { TEXTS } from '../src/data/texts';
import { GameState } from '../src/game/game-state';
import { chooseHintPuzzle, hintCandidates, HINT_LEVELS, HintLedger } from '../src/game/hints';
import { generateAnswers } from '../src/game/seeded';
import { solveFrom } from '../src/game/solver';
import { hintText, joinList, roomHints, solutionText } from '../src/ui/hint-text';

describe('HintLedger', () => {
  it('cada nivel nuevo cuenta una vez y no hay más de tres por puzzle', () => {
    const ledger = new HintLedger();
    expect(ledger.next('p')).toBe(1);
    expect(ledger.reveal('p')).toBe(1);
    expect(ledger.reveal('p')).toBe(2);
    expect(ledger.reveal('q')).toBe(1);
    expect(ledger.reveal('p')).toBe(3);
    expect(ledger.next('p')).toBeNull();
    expect(ledger.reveal('p')).toBeNull();
    expect(ledger.seen('p')).toBe(HINT_LEVELS);
    expect(ledger.seen('nada')).toBe(0);
    expect(ledger.used).toBe(4);
  });
});

describe('textos de pista', () => {
  it('toda sala tiene los tres niveles de pista para cada puzzle', () => {
    for (const room of ROOMS) {
      const written = roomHints(room);
      // Ninguna pista escrita para un puzzle que no existe.
      expect(Object.keys(written).sort()).toEqual(room.puzzles.map((p) => p.id).sort());
      for (const seed of [0, 1, 42, 4294967295]) {
        const answers = generateAnswers(room, seed);
        for (const puzzle of room.puzzles) {
          const texts = [1, 2, 3].map((level) => hintText(room, answers, puzzle, level));
          for (const text of texts) expect(text.trim().length, puzzle.id).toBeGreaterThan(10);
          expect(new Set(texts).size, `${room.id} ${puzzle.id}`).toBe(3);
        }
      }
    }
  });

  it('el tercer nivel da la solución exacta de la partida', () => {
    const answers = generateAnswers(ROOM_1, 42);
    const chest = ROOM_1.puzzles.find((p) => p.id === 'p-chest');
    if (!chest) throw new Error('falta el cofre');
    const code = (answers.codes.get('p-chest') ?? []).join(' ');
    expect(solutionText(ROOM_1, answers, chest)).toContain(code);

    const room2 = generateAnswers(ROOM_2, 7);
    const safe = ROOM_2.puzzles.find((p) => p.id === 'p-safe');
    const switches = ROOM_2.puzzles.find((p) => p.id === 'p-switches');
    if (safe?.type !== 'dial' || switches?.type !== 'sequence') throw new Error('faltan puzzles');
    const positions = room2.codes.get('p-safe') ?? [];
    // El panel numera las posiciones desde 1.
    for (const p of positions) {
      expect(solutionText(ROOM_2, room2, safe)).toContain(TEXTS.dialPanel.position(p + 1));
    }
    const order = room2.codes.get('p-switches') ?? [];
    const text = solutionText(ROOM_2, room2, switches);
    const first = order[0] ?? 0;
    expect(text).toContain(`${first + 1} (${TEXTS.shapes[switches.switches[first] ?? 'circle']})`);
  });

  it('une listas en castellano', () => {
    expect(joinList([])).toBe('');
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a y b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b y c');
  });
});

describe('elección del puzzle de la pista', () => {
  it('al empezar, cada sala da la pista de su primer paso', () => {
    const first: Record<string, string> = {
      'room-1': 'p-cabinet',
      'room-2': 'p-toolbox',
      'room-3': 'p-mapcase',
    };
    for (const room of ROOMS) {
      const state = new GameState(room, generateAnswers(room, 1));
      expect(chooseHintPuzzle(state)?.id, room.id).toBe(first[room.id]);
    }
  });

  it('no propone un puzzle cuyas piezas siguen bajo llave', () => {
    const state = new GameState(ROOM_1, generateAnswers(ROOM_1, 3));
    // El libro tiene una pista del cofre, pero las demás están en el armario cerrado.
    state.interact('book', null);
    expect(hintCandidates(state).map((c) => c.puzzle.id)).toEqual(['p-cabinet']);
  });

  it('prefiere el puzzle más avanzado entre los disponibles', () => {
    const state = new GameState(ROOM_2, generateAnswers(ROOM_2, 3));
    state.interact('bench-drawer', null);
    state.interact('small-key', null);
    expect(state.interact('toolbox', 'small-key').kind).toBe('unlocked');
    state.interact('handle', null);
    // Con el mango en la mano, falta solo la punta: combinar va primero.
    const candidates = hintCandidates(state);
    expect(candidates[0]?.puzzle.id).toBe('p-screwdriver');
    expect(candidates[0]?.progress).toBe(0.5);
    // El cuadro eléctrico se puede abrir con el destornillador que se puede formar, pero aún no.
    expect(candidates.find((c) => c.puzzle.id === 'p-fusebox')?.progress).toBe(0);
  });

  it('en toda la partida hay una pista útil y nunca de algo ya resuelto', () => {
    for (const room of ROOMS) {
      for (const seed of [0, 5, 99]) {
        const state = new GameState(room, generateAnswers(room, seed));
        for (let round = 0; round < 40 && !state.finished; round++) {
          const candidates = hintCandidates(state);
          expect(candidates.length, `${room.id} ronda ${round}`).toBeGreaterThan(0);
          for (const c of candidates) expect(state.isSolved(c.puzzle.id)).toBe(false);
          solveFrom(state, 1);
        }
        expect(state.finished).toBe(true);
        expect(chooseHintPuzzle(state)).toBeNull();
      }
    }
  });
});
