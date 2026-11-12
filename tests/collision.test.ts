import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/data/config';
import { ROOM_1 } from '../src/data/rooms/room-1';
import { circleOverlapsAny, moveCircle, pushOutOfRect, type Rect } from '../src/game/collision';
import { createPlayer, stepPlayer, turnPlayer } from '../src/game/player';
import { roomColliders } from '../src/game/room';
import { Rng } from '../src/core/rng';

const r = 0.3;
// Pared vertical en x ∈ [1, 1.2].
const wall: Rect = { minX: 1, maxX: 1.2, minZ: -10, maxZ: 10 };

describe('colisión círculo contra rectángulo', () => {
  it('no atraviesa una pared al caminar hacia ella', () => {
    const pos = { x: 0, z: 0 };
    for (let i = 0; i < 100; i++) moveCircle(pos, 0.05, 0, r, [wall]);
    expect(pos.x).toBeCloseTo(1 - r, 6);
  });

  it('no atraviesa una pared delgada con un paso enorme', () => {
    const pos = { x: 0, z: 0 };
    moveCircle(pos, 5, 0, r, [wall]);
    expect(pos.x).toBeLessThanOrEqual(1 - r + 1e-6);
  });

  it('desliza a lo largo de la pared al caminar en diagonal', () => {
    const pos = { x: 1 - r, z: 0 };
    moveCircle(pos, 0.1, 0.1, r, [wall]);
    expect(pos.x).toBeCloseTo(1 - r, 6);
    expect(pos.z).toBeCloseTo(0.1, 6);
  });

  it('no se queda atrapado en una esquina interior y puede salir', () => {
    const north: Rect = { minX: -5, maxX: 5, minZ: -5.2, maxZ: -5 };
    const west: Rect = { minX: -5.2, maxX: -5, minZ: -5, maxZ: 5 };
    const pos = { x: 0, z: 0 };
    for (let i = 0; i < 200; i++) moveCircle(pos, -0.05, -0.05, r, [north, west]);
    expect(pos.x).toBeCloseTo(-5 + r, 5);
    expect(pos.z).toBeCloseTo(-5 + r, 5);
    moveCircle(pos, 0.5, 0.5, r, [north, west]);
    expect(pos.x).toBeCloseTo(-5 + r + 0.5, 5);
    expect(pos.z).toBeCloseTo(-5 + r + 0.5, 5);
  });

  it('rodea una esquina exterior sin engancharse', () => {
    const block: Rect = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    const pos = { x: -0.5, z: -0.29 };
    for (let i = 0; i < 60; i++) moveCircle(pos, 0.05, 0, r, [block]);
    expect(pos.x).toBeGreaterThan(1.5);
    expect(circleOverlapsAny(pos, r, [block])).toBe(false);
  });

  it('saca el círculo si empieza dentro del rectángulo', () => {
    const block: Rect = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
    const pos = { x: 0.2, z: 1 };
    expect(pushOutOfRect(pos, r, block)).toBe(true);
    expect(pos.x).toBeCloseTo(-r, 6);
    expect(circleOverlapsAny(pos, r, [block])).toBe(false);
  });

  it('no solapa en un hueco más estrecho que el jugador (regresión)', () => {
    // Bloque a 0.4 m de una pared: el círculo de 0.6 m no cabe y los empujes se contrarrestan.
    const north: Rect = { minX: -5, maxX: 5, minZ: -2.7, maxZ: -2.5 };
    const block: Rect = { minX: 2.35, maxX: 2.95, minZ: -2.1, maxZ: -1.1 };
    const pos = { x: 1.5, z: -1.8 };
    for (let i = 0; i < 300; i++) {
      moveCircle(pos, 0.03, -0.02, r, [north, block]);
      expect(circleOverlapsAny(pos, r, [north, block])).toBe(false);
    }
  });

  it('ignora desplazamientos no finitos', () => {
    const pos = { x: 0, z: 0 };
    moveCircle(pos, Number.NaN, 1, r, [wall]);
    expect(pos).toEqual({ x: 0, z: 0 });
  });
});

describe('jugador en la sala de prueba', () => {
  const colliders = roomColliders(ROOM_1);
  const tuning = { radius: PLAYER.radius, walkSpeed: PLAYER.walkSpeed, maxPitch: PLAYER.maxPitch };
  const dt = 1 / 60;

  it('el punto de aparición no solapa nada', () => {
    const p = createPlayer(ROOM_1.spawn);
    expect(circleOverlapsAny({ x: p.x, z: p.z }, PLAYER.radius, colliders)).toBe(false);
  });

  it('caminar hacia delante con yaw 0 reduce z', () => {
    const p = createPlayer({ x: 0, z: 1, yaw: 0 });
    stepPlayer(p, { x: 0, z: 1 }, dt, colliders, tuning);
    expect(p.z).toBeLessThan(1);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.prevZ).toBe(1);
  });

  it('desplazarse a la derecha con yaw 0 aumenta x', () => {
    const p = createPlayer({ x: 0, z: 1, yaw: 0 });
    stepPlayer(p, { x: 1, z: 0 }, dt, colliders, tuning);
    expect(p.x).toBeGreaterThan(0);
  });

  it('nunca atraviesa paredes ni muebles en un paseo aleatorio largo', () => {
    const rng = new Rng(2024);
    const p = createPlayer(ROOM_1.spawn);
    const hw = ROOM_1.width / 2;
    const hd = ROOM_1.depth / 2;
    for (let i = 0; i < 20000; i++) {
      if (i % 30 === 0) turnPlayer(p, (rng.next() - 0.5) * 2, 0, PLAYER.maxPitch);
      stepPlayer(p, { x: rng.next() * 2 - 1, z: 1 }, dt, colliders, tuning);
      expect(circleOverlapsAny({ x: p.x, z: p.z }, PLAYER.radius, colliders)).toBe(false);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(hw - PLAYER.radius + 1e-6);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(hd - PLAYER.radius + 1e-6);
    }
  });

  it('el pitch se limita y el yaw da la vuelta', () => {
    const p = createPlayer({ x: 0, z: 0, yaw: 0 });
    turnPlayer(p, 0, 10, PLAYER.maxPitch);
    expect(p.pitch).toBe(PLAYER.maxPitch);
    turnPlayer(p, 4 * Math.PI + 0.5, 0, PLAYER.maxPitch);
    expect(p.yaw).toBeCloseTo(0.5, 9);
    turnPlayer(p, Number.NaN, 0, PLAYER.maxPitch);
    expect(p.yaw).toBeCloseTo(0.5, 9);
  });
});
