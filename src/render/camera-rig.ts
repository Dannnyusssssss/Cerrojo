/** Coloca la cámara en los ojos del jugador, interpolando la posición entre pasos de lógica. */
import type { PerspectiveCamera } from 'three';
import { lerp } from '../core/math';
import type { PlayerState } from '../game/player';

export function applyCamera(
  camera: PerspectiveCamera,
  player: PlayerState,
  alpha: number,
  eyeHeight: number,
): void {
  camera.position.set(
    lerp(player.prevX, player.x, alpha),
    eyeHeight,
    lerp(player.prevZ, player.z, alpha),
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.set(player.pitch, player.yaw, 0);
}
