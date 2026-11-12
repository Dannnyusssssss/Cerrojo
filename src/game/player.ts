/**
 * Jugador en primera persona: un círculo en el plano con orientación (yaw, pitch).
 * La altura de los ojos es solo de render.
 */
import type { Axes } from '../core/input';
import { clamp, wrapAngle } from '../core/math';
import { moveCircle, type Rect } from './collision';

export interface PlayerState {
  x: number;
  z: number;
  /** Posición al inicio del último paso, para interpolar en el render. */
  prevX: number;
  prevZ: number;
  yaw: number;
  pitch: number;
}

export interface PlayerTuning {
  radius: number;
  walkSpeed: number;
  maxPitch: number;
}

export function createPlayer(spawn: { x: number; z: number; yaw: number }): PlayerState {
  return { x: spawn.x, z: spawn.z, prevX: spawn.x, prevZ: spawn.z, yaw: spawn.yaw, pitch: 0 };
}

const scratch = { x: 0, z: 0 };

/**
 * Avanza un paso de lógica. `move.z` es avanzar y `move.x` desplazarse a la derecha,
 * relativos a hacia dónde mira el jugador.
 */
export function stepPlayer(
  player: PlayerState,
  move: Axes,
  dt: number,
  colliders: readonly Rect[],
  tuning: PlayerTuning,
): void {
  player.prevX = player.x;
  player.prevZ = player.z;
  if (move.x === 0 && move.z === 0) return;
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  // Adelante = (-sin, -cos); derecha = (cos, -sin).
  const dx = (cos * move.x - sin * move.z) * tuning.walkSpeed * dt;
  const dz = (-sin * move.x - cos * move.z) * tuning.walkSpeed * dt;
  scratch.x = player.x;
  scratch.z = player.z;
  moveCircle(scratch, dx, dz, tuning.radius, colliders);
  player.x = scratch.x;
  player.z = scratch.z;
}

/** Gira la mirada. El pitch se limita para no dar la vuelta. */
export function turnPlayer(
  player: PlayerState,
  yawDelta: number,
  pitchDelta: number,
  maxPitch: number,
): void {
  if (!Number.isFinite(yawDelta) || !Number.isFinite(pitchDelta)) return;
  player.yaw = wrapAngle(player.yaw + yawDelta);
  player.pitch = clamp(player.pitch + pitchDelta, -maxPitch, maxPitch);
}
