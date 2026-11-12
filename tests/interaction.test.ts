import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { INTERACTION, PLAYER } from '../src/data/config';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { pickInteractable, rayAabb, type PickTarget, type Ray } from '../src/game/interaction';
import type { Aabb } from '../src/game/room';
import { generateAnswers } from '../src/game/seeded';
import { solveFrom } from '../src/game/solver';
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

describe('Sala 1: alcance real de cada objeto', () => {
  const lookAt = (world: World, x: number, y: number, z: number): void => {
    const p = world.player;
    const dx = x - p.x;
    const dz = z - p.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(y - PLAYER.eyeHeight, Math.hypot(dx, dz));
  };

  /** Mundo con la sala resuelta hasta justo antes de usar la puerta, para que todo sea visible. */
  const worldWithEverythingOpen = (): World => {
    const world = new World(ROOM_1, generateAnswers(ROOM_1, 7));
    // El resolvedor juega hasta el final; luego se miran los objetos que ya estaban abiertos.
    solveFrom(world.state);
    return world;
  };

  it('cada objeto se puede señalar desde su punto de acceso cuando es visible', () => {
    // Se comprueba en dos momentos: al empezar y con todos los contenedores abiertos.
    const fresh = new World(ROOM_1, generateAnswers(ROOM_1, 7));
    const opened = worldWithEverythingOpen();
    // Armario y cofre abiertos con su contenido todavía dentro.
    const answers = generateAnswers(ROOM_1, 7);
    const middle = new World(ROOM_1, answers);
    middle.interact('drawer');
    middle.interact('small-key');
    middle.state.inventory.select(0);
    middle.interact('cabinet-door');
    middle.tryCode('p-chest', answers.codes.get('p-chest') ?? []);
    expect(middle.state.isVisible('block-circle')).toBe(true);
    expect(middle.state.isVisible('door-key')).toBe(true);
    // Cajón abierto con la llave todavía dentro.
    const drawerOpen = new World(ROOM_1, answers);
    drawerOpen.interact('drawer');
    const checked = new Set<string>();
    for (const def of ROOM_1.interactables) {
      for (const world of [fresh, drawerOpen, middle, opened]) {
        if (!world.state.isVisible(def.id)) continue;
        world.player.x = def.approach.x;
        world.player.z = def.approach.z;
        const open = world.state.isOpen(def.id);
        const target = { ...def.position };
        if (open && def.openOffset) {
          target.x += def.openOffset.x;
          target.y += def.openOffset.y;
          target.z += def.openOffset.z;
        }
        lookAt(world, target.x, target.y, target.z);
        expect(world.pick(world.viewRayFromPlayer())?.id, `${def.id} abierto=${open}`).toBe(def.id);
        checked.add(def.id);
      }
    }
    // Todos los objetos se comprobaron al menos en uno de los tres momentos.
    expect([...checked].sort()).toEqual(ROOM_1.interactables.map((d) => d.id).sort());
  });

  it('los objetos dentro de contenedores se alcanzan al abrirlos', () => {
    const world = new World(ROOM_1, generateAnswers(ROOM_1, 7));
    world.player.x = -2.0;
    world.player.z = -0.7;
    lookAt(world, -2.0, 0.555, -1.5);
    expect(world.pick(world.viewRayFromPlayer())?.id).not.toBe('small-key');
    world.interact('drawer');
    expect(world.pick(world.viewRayFromPlayer())?.id).toBe('small-key');
  });

  it('el paso de lógica mueve al jugador y arranca el cronómetro', () => {
    const world = new World(ROOM_1, generateAnswers(ROOM_1, 1));
    const input = new InputState();
    expect(world.timer.started).toBe(false);
    input.press('forward');
    const z0 = world.player.z;
    world.step(input, 1 / 60);
    expect(world.player.z).toBeLessThan(z0);
    expect(world.timer.started).toBe(true);
  });
});
