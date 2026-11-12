/**
 * Salas con dos zonas (Sala 3): la puerta entre zonas bloquea el paso mientras está cerrada,
 * deja pasar al abrirse, ya no se vuelve a cerrar y oculta la segunda zona hasta entonces.
 */
import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { ROOM_3 } from '../src/data/rooms/room-3';
import { roomOccluders } from '../src/game/room';
import { generateAnswers } from '../src/game/seeded';
import { World } from '../src/game/world';

const DOOR = 'dome-door';

/** Coloca al jugador mirando hacia +x (la cúpula) y camina `seconds` segundos. */
function walkEast(world: World, seconds: number): void {
  const input = new InputState();
  world.player.x = -0.6;
  world.player.z = 0;
  world.player.yaw = -Math.PI / 2;
  input.press('forward');
  for (let i = 0; i < seconds * 60; i++) world.step(input, 1 / 60);
}

describe('Sala 3: puerta entre zonas', () => {
  it('cerrada, no deja pasar a la cúpula', () => {
    const world = new World(ROOM_3, generateAnswers(ROOM_3, 3));
    walkEast(world, 3);
    expect(world.player.x).toBeLessThan(0.55);
  });

  it('abierta con los diales correctos, deja pasar', () => {
    const answers = generateAnswers(ROOM_3, 3);
    const world = new World(ROOM_3, answers);
    expect(world.tryCode('p-dome', answers.codes.get('p-dome') ?? [])).toBe(true);
    expect(world.state.isOpen(DOOR)).toBe(true);
    walkEast(world, 3);
    expect(world.player.x).toBeGreaterThan(1.0);
  });

  it('una vez abierta no se cierra y deja de señalarse', () => {
    const answers = generateAnswers(ROOM_3, 3);
    const world = new World(ROOM_3, answers);
    world.tryCode('p-dome', answers.codes.get('p-dome') ?? []);
    expect(world.interact(DOOR)).toEqual({ kind: 'none' });
    expect(world.state.isOpen(DOOR)).toBe(true);
    world.player.x = -0.4;
    world.player.z = 0;
    world.player.yaw = -Math.PI / 2;
    world.player.pitch = 0;
    expect(world.pick(world.viewRayFromPlayer())?.id).not.toBe(DOOR);
  });

  it('los objetos de la cúpula no se ven ni se alcanzan con la puerta cerrada', () => {
    const answers = generateAnswers(ROOM_3, 3);
    const world = new World(ROOM_3, answers);
    for (const id of ['telescope', 'console', 'orrery', 'exit-door']) {
      expect(world.state.isVisible(id), id).toBe(false);
      expect(world.interact(id).kind, id).toBe('none');
    }
    world.tryCode('p-dome', answers.codes.get('p-dome') ?? []);
    for (const id of ['telescope', 'console', 'orrery', 'exit-door']) {
      expect(world.state.isVisible(id), id).toBe(true);
    }
  });

  it('los tabiques tapan la vista entre zonas a toda altura', () => {
    const occluders = roomOccluders(ROOM_3);
    for (const partition of ROOM_3.partitions ?? []) {
      expect(
        occluders.some(
          (o) =>
            o.minX === partition.minX &&
            o.maxZ === partition.maxZ &&
            o.minY === 0 &&
            o.maxY === ROOM_3.height,
        ),
      ).toBe(true);
    }
  });
});
