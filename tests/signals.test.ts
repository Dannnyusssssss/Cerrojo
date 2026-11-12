import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { ROOM_1 } from '../src/data/rooms/room-1';
import type { CombineResult, Outcome } from '../src/game/game-state';
import type { PlaceResult } from '../src/game/puzzles/placement';
import type { PressResult } from '../src/game/puzzles/sequence';
import { generateAnswers } from '../src/game/seeded';
import {
  codeSignal,
  combineSignal,
  outcomeSignal,
  placeSignal,
  pressSignal,
  STEP_SIGNAL,
  WHEEL_SIGNAL,
  type Signal,
} from '../src/game/signals';
import { World } from '../src/game/world';

const OUTCOMES: Outcome[] = [
  { kind: 'none' },
  { kind: 'inspect', id: 'book' },
  { kind: 'toggled', id: 'drawer', open: true },
  { kind: 'toggled', id: 'drawer', open: false },
  { kind: 'locked', id: 'chest' },
  { kind: 'panel', puzzle: 'p-chest' },
  { kind: 'picked', id: 'small-key', item: 'small-key' },
  { kind: 'inventoryFull' },
  { kind: 'wrongItem', item: 'small-key' },
  { kind: 'unlocked', id: 'cabinet-door', item: 'small-key', finished: false },
  { kind: 'unlocked', id: 'exit-door', item: 'door-key', finished: true },
];
const PRESS: PressResult[] = ['pressed', 'wrong', 'solved', 'invalid'];
const PLACE: PlaceResult[] = ['placed', 'wrong', 'occupied', 'invalid'];
const COMBINE: CombineResult[] = [
  { kind: 'combined', item: 'x' },
  { kind: 'noMatch' },
  { kind: 'invalid' },
];

function allSignals(): Signal[] {
  return [
    ...OUTCOMES.map(outcomeSignal),
    codeSignal(true),
    codeSignal(false),
    ...PRESS.map(pressSignal),
    ...PLACE.flatMap((r) => [placeSignal(r, false), placeSignal(r, true)]),
    ...COMBINE.map(combineSignal),
    WHEEL_SIGNAL,
    STEP_SIGNAL,
  ];
}

describe('señales de cada resultado', () => {
  it('toda señal sonora tiene un equivalente visual', () => {
    for (const signal of allSignals()) {
      if (signal.sound !== null) expect(signal.visual, signal.sound).not.toBe('none');
    }
  });

  it('acertar y fallar suenan distinto y se ven distinto', () => {
    expect(codeSignal(true)).toEqual({ sound: 'success', visual: 'panelRight' });
    expect(codeSignal(false)).toEqual({ sound: 'wrong', visual: 'panelWrong' });
    expect(pressSignal('pressed').sound).toBe('press');
    expect(pressSignal('solved').visual).toBe('panelRight');
    expect(placeSignal('placed', true).sound).toBe('success');
    expect(placeSignal('placed', false).sound).toBe('place');
  });

  it('abrir la salida suena a acierto; otra cerradura, a mecanismo', () => {
    expect(outcomeSignal(OUTCOMES[10] as Outcome).sound).toBe('success');
    expect(outcomeSignal(OUTCOMES[9] as Outcome).sound).toBe('mechanism');
  });

  it('lo que no cambia nada no suena', () => {
    expect(outcomeSignal({ kind: 'none' }).sound).toBeNull();
    expect(pressSignal('invalid').sound).toBeNull();
    expect(placeSignal('invalid', false).sound).toBeNull();
    expect(combineSignal({ kind: 'invalid' }).sound).toBeNull();
  });
});

describe('señales del mundo', () => {
  const world = (): World => new World(ROOM_1, generateAnswers(ROOM_1, 42));

  it('cada acción deja su señal y recogerlas vacía la cola', () => {
    const w = world();
    w.interact('drawer');
    w.tryCode('p-chest', [0, 0, 0, 0]);
    expect(w.drainSignals().map((s) => s.sound)).toEqual(['open', 'wrong']);
    expect(w.drainSignals()).toEqual([]);
  });

  it('caminar da pasos según la distancia, y quieto no suena', () => {
    const w = world();
    const input = new InputState();
    for (let i = 0; i < 60; i++) w.step(input, 1 / 60);
    expect(w.drainSignals()).toEqual([]);
    input.setStick(0, 1);
    for (let i = 0; i < 60; i++) w.step(input, 1 / 60);
    // Un segundo a 2,2 m/s con pasos cada 0,7 m: tres pasos (si nada lo frena).
    const steps = w.drainSignals().filter((s) => s.sound === 'step').length;
    expect(steps).toBeGreaterThanOrEqual(1);
    expect(steps).toBeLessThanOrEqual(3);
  });

  it('la cola tiene tope aunque nadie la recoja', () => {
    const w = world();
    for (let i = 0; i < 100; i++) w.tryCode('p-chest', [0, 0, 0, 0]);
    expect(w.drainSignals().length).toBeLessThanOrEqual(32);
  });
});
