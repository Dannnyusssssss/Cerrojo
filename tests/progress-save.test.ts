/**
 * Guardado v2: migración, marcas, partida en curso y «Continuar», con entradas hostiles.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SAVE_LIMITS, type Settings } from '../src/data/config';
import { STORAGE_KEY } from '../src/data/meta';
import { ROOMS } from '../src/data/rooms';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { isRoomUnlocked, updateRecord } from '../src/game/progress';
import { generateAnswers } from '../src/game/seeded';
import { replayActions, restoreSession, type SavedAction } from '../src/game/session';
import { World } from '../src/game/world';
import { SessionKeeper } from '../src/save/session-keeper';
import { SaveStore, type StorageLike } from '../src/save/storage';
import {
  parseRecords,
  parseSave,
  parseSession,
  type SavedSession,
} from '../src/validation/save-data';
import { parseActions } from '../src/validation/session-data';

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

const SEED = 42;
const MIN = SAVE_LIMITS.minRecordSteps;

/** Usa el objeto `item` del inventario sobre `id`, como haría el jugador. */
function useOn(world: World, item: string, id: string): void {
  world.state.inventory.select(world.state.inventory.items.indexOf(item));
  world.interact(id);
}

/** Juega la Sala 1 hasta abrir el armario (y pide una pista). */
function playStart(world: World): void {
  world.interact('drawer');
  world.interact('small-key');
  useOn(world, 'small-key', 'cabinet-door');
  world.interact('book');
  world.revealHint('p-panel');
}

/** Termina la Sala 1 desde donde la deja playStart. */
function playRest(world: World): void {
  for (const id of ['block-circle', 'block-triangle', 'block-square', 'postcard']) {
    world.interact(id);
  }
  world.place('p-panel', 0, 'block-square');
  world.place('p-panel', 1, 'block-circle');
  world.place('p-panel', 2, 'block-triangle');
  for (const id of ['order-card', 'clock', 'picture']) world.interact(id);
  world.tryCode('p-chest', world.state.answers.codes.get('p-chest') ?? []);
  world.interact('door-key');
  useOn(world, 'door-key', 'exit-door');
}

function startedWorld(): World {
  const world = new World(ROOM_1, generateAnswers(ROOM_1, SEED));
  playStart(world);
  return world;
}

describe('registro de acciones', () => {
  it('anota solo las acciones acertadas y una vez lo que se abre', () => {
    const world = startedWorld();
    // Cerrar y volver a abrir el cajón no se repite; equivocarse no se anota.
    world.interact('drawer');
    world.interact('drawer');
    world.tryCode('p-chest', [0, 0, 0, 0]);
    expect(world.log.actions.map((a) => a.k)).toEqual(['open', 'take', 'use', 'look', 'hint']);
  });

  it('repetir el registro deja el mismo estado', () => {
    const world = startedWorld();
    const state = replayActions(ROOM_1, world.state.answers, world.log.actions);
    expect(state).not.toBeNull();
    expect(state?.inventory.items).toEqual(world.state.inventory.items);
    expect(state?.isSolved('p-cabinet')).toBe(true);
    expect(state?.hasSeen('clue-circle')).toBe(true);
    expect(state?.hints.used).toBe(1);
  });

  it('la sala completa se termina siguiendo el registro, y entonces no se puede continuar', () => {
    const world = startedWorld();
    playRest(world);
    expect(world.state.finished).toBe(true);
    const answers = world.state.answers;
    expect(replayActions(ROOM_1, answers, world.log.actions)?.finished).toBe(true);
    // Una partida terminada no se ofrece para continuar.
    expect(restoreSession(ROOM_1, answers, world.log.actions)).toBeNull();
  });
});

describe('acciones contradictorias o inventadas', () => {
  const answers = generateAnswers(ROOM_1, SEED);
  const base: SavedAction[] = [
    { k: 'open', id: 'drawer' },
    { k: 'take', id: 'small-key' },
  ];

  it.each<[string, SavedAction[]]>([
    ['recoger dos veces lo mismo', [...base, { k: 'take', id: 'small-key' }]],
    ['recoger algo de un armario cerrado', [{ k: 'take', id: 'block-circle' }]],
    ['objeto inexistente', [{ k: 'take', id: 'tesoro' }]],
    ['usar algo que no se tiene', [{ k: 'use', id: 'cabinet-door', item: 'door-key' }]],
    ['usar una llave equivocada', [...base, { k: 'use', id: 'exit-door', item: 'small-key' }]],
    ['combinación incorrecta', [{ k: 'code', puzzle: 'p-chest', values: [1, 2, 3, 4] }]],
    ['puzzle inexistente', [{ k: 'code', puzzle: 'p-nada', values: [1] }]],
    [
      'colocar sin tener la pieza',
      [{ k: 'place', puzzle: 'p-panel', slot: 0, item: 'block-square' }],
    ],
    [
      'ver dos veces la misma pista',
      [
        { k: 'look', id: 'book' },
        { k: 'look', id: 'book' },
      ],
    ],
    ['examinar algo sin pista', [{ k: 'look', id: 'drawer' }]],
    ['pista de un puzzle inexistente', [{ k: 'hint', puzzle: 'p-nada' }]],
    [
      'cuatro pistas del mismo puzzle',
      Array.from({ length: 4 }, () => ({ k: 'hint', puzzle: 'p-exit' }) as const),
    ],
    ['combinar en una sala sin recetas', [{ k: 'combine', a: 'small-key', b: 'door-key' }]],
    ['interruptores en una sala sin ellos', [{ k: 'switches', puzzle: 'p-chest', order: [0] }]],
  ])('%s → se descarta', (_name, actions) => {
    expect(restoreSession(ROOM_1, answers, actions)).toBeNull();
  });

  it('un registro válido sin terminar sí se recupera', () => {
    expect(restoreSession(ROOM_1, answers, base)).not.toBeNull();
    expect(restoreSession(ROOM_1, answers, [])).not.toBeNull();
  });
});

describe('forma de la partida guardada (validación)', () => {
  const ok: SavedSession = { room: 'room-1', seed: SEED, steps: 120, actions: [] };

  it('acepta una partida bien formada', () => {
    expect(parseSession(ok)).toEqual(ok);
  });

  it.each<[string, unknown]>([
    ['no es un objeto', 'room-1'],
    ['sala inexistente', { ...ok, room: 'room-9' }],
    ['sala como número', { ...ok, room: 1 }],
    ['semilla negativa', { ...ok, seed: -1 }],
    ['semilla enorme', { ...ok, seed: 2 ** 40 }],
    ['semilla decimal', { ...ok, seed: 1.5 }],
    ['tiempo negativo', { ...ok, steps: -5 }],
    ['tiempo imposible', { ...ok, steps: SAVE_LIMITS.maxSteps + 1 }],
    ['tiempo como texto', { ...ok, steps: '100' }],
    ['acciones que no son lista', { ...ok, actions: {} }],
    [
      'demasiadas acciones',
      { ...ok, actions: Array.from({ length: 401 }, () => ({ k: 'look', id: 'book' })) },
    ],
    ['acción de tipo desconocido', { ...ok, actions: [{ k: 'teleport', id: 'exit-door' }] }],
    ['identificador con HTML', { ...ok, actions: [{ k: 'take', id: '<img onerror=x>' }] }],
    ['identificador gigante', { ...ok, actions: [{ k: 'take', id: 'a'.repeat(41) }] }],
    [
      'valores que no son enteros',
      { ...ok, actions: [{ k: 'code', puzzle: 'p-chest', values: [1.5] }] },
    ],
    ['lista de valores vacía', { ...ok, actions: [{ k: 'code', puzzle: 'p-chest', values: [] }] }],
    [
      'hueco negativo',
      { ...ok, actions: [{ k: 'place', puzzle: 'p-panel', slot: -1, item: 'x' }] },
    ],
    ['acción nula', { ...ok, actions: [null] }],
  ])('%s → sin partida', (_name, value) => {
    expect(parseSession(value)).toBeNull();
  });

  it('campos extra y __proto__ se ignoran sin contaminar', () => {
    const raw = JSON.parse(
      '{"room":"room-1","seed":1,"steps":0,"admin":true,"__proto__":{"polluted":true},' +
        '"actions":[{"k":"take","id":"small-key","extra":"<b>","__proto__":{"polluted":true}}]}',
    ) as unknown;
    const session = parseSession(raw);
    expect(session).toEqual({
      room: 'room-1',
      seed: 1,
      steps: 0,
      actions: [{ k: 'take', id: 'small-key' }],
    });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(parseActions([{ k: 'open', id: 'drawer', id2: 'x' }])).toEqual([
      { k: 'open', id: 'drawer' },
    ]);
  });
});

describe('marcas', () => {
  it('validación: solo salas existentes y tiempos posibles', () => {
    // Con JSON.parse, __proto__ queda como clave propia (como en un guardado manipulado).
    const raw = JSON.parse(
      JSON.stringify({
        'room-1': { clean: MIN + 100, hinted: 0 },
        'room-2': { clean: -1, hinted: 'rápido' },
        'room-3': { clean: MIN + 0.5, hinted: MIN },
        'room-9': { clean: MIN + 1, hinted: null },
      }).replace('{', '{"__proto__":{"clean":700},'),
    ) as unknown;
    const records = parseRecords(raw);
    expect([...records.entries()]).toEqual([
      ['room-1', { clean: MIN + 100, hinted: null }],
      ['room-3', { clean: null, hinted: MIN }],
    ]);
    expect(parseRecords(null).size).toBe(0);
    expect(parseRecords([1, 2]).size).toBe(0);
  });

  it('sin pistas y con pistas son marcas separadas; solo mejora con menos tiempo', () => {
    let step = updateRecord(undefined, 5000, 0);
    expect(step).toEqual({ record: { clean: 5000, hinted: null }, improved: true });
    step = updateRecord(step.record, 4000, 2);
    expect(step).toEqual({ record: { clean: 5000, hinted: 4000 }, improved: true });
    expect(updateRecord(step.record, 6000, 0).improved).toBe(false);
    expect(updateRecord(step.record, 5000, 0).improved).toBe(false);
    expect(updateRecord(step.record, 3000, 1)).toEqual({
      record: { clean: 5000, hinted: 3000 },
      improved: true,
    });
  });

  it('las salas se desbloquean en orden', () => {
    const none = new Map();
    expect(ROOMS.map((_, i) => isRoomUnlocked(ROOMS, i, none))).toEqual([true, false, false]);
    const first = new Map([['room-1', { clean: MIN, hinted: null }]]);
    expect(ROOMS.map((_, i) => isRoomUnlocked(ROOMS, i, first))).toEqual([true, true, false]);
    expect(isRoomUnlocked(ROOMS, 3, first)).toBe(false);
    expect(isRoomUnlocked(ROOMS, -1, first)).toBe(false);
  });
});

describe('migración y guardado completo', () => {
  const settings: Settings = { ...DEFAULT_SETTINGS, fov: 90, muted: true };

  it('un guardado de la versión 1 conserva los ajustes y empieza sin progreso', () => {
    const data = parseSave(JSON.stringify({ version: 1, settings }), DEFAULT_SETTINGS);
    expect(data.version).toBe(2);
    expect(data.settings).toEqual(settings);
    expect(data.records.size).toBe(0);
    expect(data.current).toBeNull();
  });

  it('marcas y partida inválidas no afectan a los ajustes', () => {
    const raw = JSON.stringify({ version: 2, settings, records: 'x', current: { room: 5 } });
    const data = parseSave(raw, DEFAULT_SETTINGS);
    expect(data.settings).toEqual(settings);
    expect(data.records.size).toBe(0);
    expect(data.current).toBeNull();
  });
});

describe('SessionKeeper (continuar y marcas)', () => {
  function setup(withAids = false): {
    storage: MemoryStorage;
    store: SaveStore;
    keeper: SessionKeeper;
  } {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage, DEFAULT_SETTINGS);
    store.load();
    return { storage, store, keeper: new SessionKeeper(store, withAids) };
  }

  it('cerrar a mitad de sala y volver permite continuar donde se dejó', () => {
    const { storage, keeper } = setup();
    const world = startedWorld();
    for (let i = 0; i < 300; i++) world.tickClock();
    keeper.save(ROOM_1, SEED, world);

    // «Recargar la página»: un almacén nuevo sobre los mismos datos.
    const store2 = new SaveStore(storage, DEFAULT_SETTINGS);
    store2.load();
    const keeper2 = new SessionKeeper(store2, false);
    expect(keeper2.pendingRoom).toBe('room-1');
    const restored = keeper2.restore(ROOMS);
    expect(restored?.room.id).toBe('room-1');
    expect(restored?.seed).toBe(SEED);
    expect(restored?.world.timer.steps).toBe(300);
    expect(restored?.world.state.isSolved('p-cabinet')).toBe(true);
    expect(restored?.world.state.hints.used).toBe(1);
    // Se puede terminar desde ahí.
    if (!restored) return;
    playRest(restored.world);
    expect(restored.world.state.finished).toBe(true);
  });

  it('un guardado manipulado se descarta y la sala empieza de nuevo', () => {
    const { storage, store, keeper } = setup();
    const world = startedWorld();
    keeper.save(ROOM_1, SEED, world);
    // Se cambia la semilla: el registro deja de ser legal (otra combinación, mismas acciones válidas),
    // así que además se añade una combinación inventada.
    const saved = JSON.parse(storage.items.get(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    const current = saved['current'] as SavedSession;
    current.actions.push({ k: 'code', puzzle: 'p-chest', values: [9, 9, 9, 9] });
    storage.items.set(STORAGE_KEY, JSON.stringify(saved));
    store.load();
    const fresh = new SessionKeeper(store, false);
    // Si 9999 fuese justo la combinación de esta semilla, la prueba no serviría.
    expect(generateAnswers(ROOM_1, SEED).codes.get('p-chest')).not.toEqual([9, 9, 9, 9]);
    expect(fresh.restore(ROOMS)).toBeNull();
    expect(store.getCurrent()).toBeNull();
  });

  it('terminar anota la marca y borra la partida en curso', () => {
    const { store, keeper } = setup();
    const world = startedWorld();
    keeper.save(ROOM_1, SEED, world);
    expect(keeper.finish(ROOM_1, MIN + 50, 1)).toBe(true);
    expect(store.getCurrent()).toBeNull();
    expect(store.getRecords().get('room-1')).toEqual({ clean: null, hinted: MIN + 50 });
    expect(keeper.finish(ROOM_1, MIN + 60, 1)).toBe(false);
  });

  it('una marca imposible (menos de 10 s) no se guarda', () => {
    const { store, keeper } = setup();
    expect(keeper.finish(ROOM_1, 5, 0)).toBe(false);
    expect(store.getRecords().size).toBe(0);
  });

  it('con ayudas de depuración no se guarda ni la partida ni la marca', () => {
    const { storage, store, keeper } = setup(true);
    const world = startedWorld();
    keeper.save(ROOM_1, SEED, world);
    expect(store.getCurrent()).toBeNull();
    expect(keeper.finish(ROOM_1, MIN + 50, 0)).toBe(false);
    expect(store.getRecords().size).toBe(0);
    expect(keeper.pendingRoom).toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it('una partida sin empezar no se guarda', () => {
    const { store, keeper } = setup();
    keeper.save(ROOM_1, SEED, new World(ROOM_1, generateAnswers(ROOM_1, SEED)));
    expect(store.getCurrent()).toBeNull();
  });

  it('«Borrar datos guardados» quita marcas y partida y conserva los ajustes', () => {
    const { store, keeper } = setup();
    store.saveSettings({ ...DEFAULT_SETTINGS, fov: 95 });
    keeper.finish(ROOM_1, MIN + 50, 0);
    keeper.save(ROOM_1, SEED, startedWorld());
    expect(store.clearProgress()).toBe(true);
    expect(store.getRecords().size).toBe(0);
    expect(store.getCurrent()).toBeNull();
    expect(store.getSettings().fov).toBe(95);
  });
});
