/**
 * Colisión en el plano (x, z): el jugador es un círculo y las paredes y muebles son
 * rectángulos alineados con los ejes. Al chocar se elimina solo la componente que entra en el
 * obstáculo, así que el jugador desliza a lo largo de él.
 */
import { clamp, type Vec2 } from '../core/math';

export interface Rect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** Saca el círculo del rectángulo si lo solapa. Devuelve true si hubo que moverlo. */
export function pushOutOfRect(pos: Vec2, radius: number, rect: Rect): boolean {
  const closestX = clamp(pos.x, rect.minX, rect.maxX);
  const closestZ = clamp(pos.z, rect.minZ, rect.maxZ);
  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return false;

  if (distSq > 1e-12) {
    // El centro está fuera: se empuja en la dirección del punto más cercano.
    const dist = Math.sqrt(distSq);
    const push = (radius - dist) / dist;
    pos.x += dx * push;
    pos.z += dz * push;
    return true;
  }

  // El centro está dentro: se sale por el lado más cercano.
  const toLeft = pos.x - rect.minX;
  const toRight = rect.maxX - pos.x;
  const toBack = pos.z - rect.minZ;
  const toFront = rect.maxZ - pos.z;
  const min = Math.min(toLeft, toRight, toBack, toFront);
  if (min === toLeft) pos.x = rect.minX - radius;
  else if (min === toRight) pos.x = rect.maxX + radius;
  else if (min === toBack) pos.z = rect.minZ - radius;
  else pos.z = rect.maxZ + radius;
  return true;
}

/** Resuelve el solape con todos los rectángulos (varias pasadas para las esquinas). */
export function resolveCircle(pos: Vec2, radius: number, rects: readonly Rect[], passes = 4): void {
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (const rect of rects) {
      if (pushOutOfRect(pos, radius, rect)) moved = true;
    }
    if (!moved) return;
  }
}

/**
 * Mueve el círculo (dx, dz) deslizando por los obstáculos. El movimiento se divide en
 * sub-pasos de como mucho medio radio para no atravesar paredes delgadas.
 */
export function moveCircle(
  pos: Vec2,
  dx: number,
  dz: number,
  radius: number,
  rects: readonly Rect[],
): void {
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;
  const length = Math.hypot(dx, dz);
  const substeps = Math.max(1, Math.ceil(length / (radius * 0.5)));
  const stepX = dx / substeps;
  const stepZ = dz / substeps;
  for (let i = 0; i < substeps; i++) {
    const startX = pos.x;
    const startZ = pos.z;
    pos.x += stepX;
    pos.z += stepZ;
    resolveCircle(pos, radius, rects, 8);
    if (!circleOverlapsAny(pos, radius, rects)) continue;
    // En un hueco más estrecho que el jugador los empujes se contrarrestan. Se prueba el
    // movimiento por ejes y, si tampoco cabe, el jugador se queda donde estaba.
    pos.x = startX;
    pos.z = startZ;
    tryAxisMove(pos, stepX, 0, radius, rects);
    tryAxisMove(pos, 0, stepZ, radius, rects);
  }
}

function tryAxisMove(pos: Vec2, dx: number, dz: number, radius: number, rects: readonly Rect[]) {
  const startX = pos.x;
  const startZ = pos.z;
  pos.x += dx;
  pos.z += dz;
  resolveCircle(pos, radius, rects, 8);
  if (circleOverlapsAny(pos, radius, rects)) {
    pos.x = startX;
    pos.z = startZ;
  }
}

/** True si el círculo solapa algún rectángulo (con una pequeña tolerancia). */
export function circleOverlapsAny(pos: Vec2, radius: number, rects: readonly Rect[]): boolean {
  const r = radius - 1e-6;
  return rects.some((rect) => {
    const dx = pos.x - clamp(pos.x, rect.minX, rect.maxX);
    const dz = pos.z - clamp(pos.z, rect.minZ, rect.maxZ);
    return dx * dx + dz * dz < r * r;
  });
}
