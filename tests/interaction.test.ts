import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { INTERACTION, PLAYER } from '../src/data/config';
import { TEST_ROOM } from '../src/data/rooms/test-room';
import { pickInteractable, rayAabb, type PickTarget, type Ray } from '../src/game/interaction';
import { actionLabel, createObjectStates, interact } from '../src/game/objects';
import type { Aabb } from '../src/game/room';
import { World } from '../src/game/world';

const box = (x: number, z: number, half = 0.2): Aabb => ({
  minX: x - half,
  maxX: x + half,
  minY: 1.4,
  maxY: 1.8,
  minZ: z - half,
  maxZ: z + half,
});

// Rayo desde el origen a 1.6 m de altura mirando hacia -z.
const forward: Ray = { origin: { x: 0, y: 1.6, z: 0 }, dir: { x: 0, y: 0, z: -1 } };

describe('rayo contra caja', () => {
  it('devuelve la distancia de entrada', () => {
    expect(rayAabb(forward, box(0, -1), 10)).toBeCloseTo(0.8, 9);
  });

  it('no toca cajas detrás ni a un lado', () => {
    expect(rayAabb(forward, box(0, 1), 10)).toBeNull();
    expect(rayAabb(forward, box(1, -1), 10)).toBeNull();
  });

  it('respeta la distancia máxima', () => {
    expect(rayAabb(forward, box(0, -5), 2)).toBeNull();
  });

  it('desde dentro de la caja la distancia es 0', () => {
    expect(rayAabb(forward, box(0, 0), 10)).toBe(0);
  });
});

describe('selección de objetos', () => {
  const reach = INTERACTION.reach;

  it('selecciona un objeto dentro del alcance', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -1) }];
    expect(pickInteractable(forward, targets, [], reach)?.id).toBe('a');
  });

  it('no selecciona fuera del alcance', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -3) }];
    expect(pickInteractable(forward, targets, [], reach)).toBeNull();
  });

  it('en el límite del alcance sí selecciona', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -(reach + 0.2)) }];
    expect(pickInteractable(forward, targets, [], reach)?.distance).toBeCloseTo(reach, 9);
  });

  it('una pared entre el ojo y el objeto lo tapa', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -1.5) }];
    const wall: Aabb = { minX: -3, maxX: 3, minY: 0, maxY: 3, minZ: -0.8, maxZ: -0.6 };
    expect(pickInteractable(forward, targets, [wall], reach)).toBeNull();
  });

  it('un obstáculo detrás del objeto no lo tapa', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -1) }];
    const wall: Aabb = { minX: -3, maxX: 3, minY: 0, maxY: 3, minZ: -1.8, maxZ: -1.6 };
    expect(pickInteractable(forward, targets, [wall], reach)?.id).toBe('a');
  });

  it('gana el objeto más cercano', () => {
    const targets: PickTarget[] = [
      { id: 'lejos', box: box(0, -1.7) },
      { id: 'cerca', box: box(0, -0.8) },
    ];
    expect(pickInteractable(forward, targets, [], reach)?.id).toBe('cerca');
  });

  it('solo considera interactuables: sin objetivos no hay selección', () => {
    expect(pickInteractable(forward, [], [box(0, -1)], reach)).toBeNull();
  });

  it('rayos inválidos no seleccionan nada', () => {
    const targets: PickTarget[] = [{ id: 'a', box: box(0, -1) }];
    const zero: Ray = { origin: forward.origin, dir: { x: 0, y: 0, z: 0 } };
    const nan: Ray = { origin: { x: Number.NaN, y: 1.6, z: 0 }, dir: forward.dir };
    expect(pickInteractable(zero, targets, [], reach)).toBeNull();
    expect(pickInteractable(nan, targets, [], reach)).toBeNull();
  });
});

describe('estados de los objetos', () => {
  it('todos empiezan cerrados', () => {
    const states = createObjectStates(TEST_ROOM);
    expect([...states.values()].every((s) => !s.open)).toBe(true);
  });

  it('abrir y cerrar alterna el estado', () => {
    const states = createObjectStates(TEST_ROOM);
    expect(interact(TEST_ROOM, states, 'box')).toEqual({ kind: 'toggled', id: 'box', open: true });
    expect(interact(TEST_ROOM, states, 'box')).toEqual({ kind: 'toggled', id: 'box', open: false });
  });

  it('examinar no cambia el estado', () => {
    const states = createObjectStates(TEST_ROOM);
    expect(interact(TEST_ROOM, states, 'book')).toEqual({ kind: 'inspect', id: 'book' });
    expect(states.get('book')?.open).toBe(false);
  });

  it('un id desconocido no hace nada', () => {
    const states = createObjectStates(TEST_ROOM);
    expect(interact(TEST_ROOM, states, 'nada')).toEqual({ kind: 'none' });
    expect(interact(TEST_ROOM, states, '__proto__')).toEqual({ kind: 'none' });
  });

  it('la acción mostrada sigue al estado', () => {
    const states = createObjectStates(TEST_ROOM);
    const drawer = TEST_ROOM.interactables.find((i) => i.id === 'drawer');
    const book = TEST_ROOM.interactables.find((i) => i.id === 'book');
    if (!drawer || !book) throw new Error('faltan objetos de prueba');
    expect(actionLabel(drawer, states.get('drawer'))).toBe('open');
    interact(TEST_ROOM, states, 'drawer');
    expect(actionLabel(drawer, states.get('drawer'))).toBe('close');
    expect(actionLabel(book, states.get('book'))).toBe('examine');
  });
});

describe('mundo: selección desde la mirada del jugador', () => {
  const lookAt = (world: World, x: number, y: number, z: number): void => {
    const p = world.player;
    const dx = x - p.x;
    const dz = z - p.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(y - PLAYER.eyeHeight, Math.hypot(dx, dz));
  };

  it('cada objeto de la sala se puede señalar de cerca', () => {
    for (const def of TEST_ROOM.interactables) {
      const world = new World(TEST_ROOM);
      // Colocarse a 1 m del objeto, del lado de la sala.
      const toCenter = Math.hypot(def.position.x, def.position.z) || 1;
      world.player.x = def.position.x - (def.position.x / toCenter) * 1.0;
      world.player.z = def.position.z - (def.position.z / toCenter) * 1.0;
      lookAt(world, def.position.x, def.position.y, def.position.z);
      expect(world.pick(world.viewRayFromPlayer())?.id, def.id).toBe(def.id);
    }
  });

  it('desde el punto de aparición no se alcanza el reloj (demasiado lejos)', () => {
    const world = new World(TEST_ROOM);
    world.player.z = -1.5;
    lookAt(world, 0, 1.85, 2.47);
    expect(world.pick(world.viewRayFromPlayer())).toBeNull();
  });

  it('el cajón abierto se señala en su nueva posición', () => {
    const world = new World(TEST_ROOM);
    world.player.x = -2.0;
    world.player.z = -0.6;
    lookAt(world, -2.0, 0.6, -1.675 + 0.32);
    expect(world.pick(world.viewRayFromPlayer())).toBeNull();
    world.interactWith('drawer');
    expect(world.pick(world.viewRayFromPlayer())?.id).toBe('drawer');
  });

  it('el paso de lógica mueve al jugador con la entrada', () => {
    const world = new World(TEST_ROOM);
    const input = new InputState();
    input.press('forward');
    const z0 = world.player.z;
    world.step(input, 1 / 60);
    expect(world.player.z).toBeLessThan(z0);
    expect(world.steps).toBe(1);
  });
});
