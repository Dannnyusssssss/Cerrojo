/**
 * Selección de objetos: un rayo desde los ojos (retícula) o desde el punto tocado, solo contra
 * los objetos interactuables, con alcance máximo y línea de visión (paredes y muebles tapan).
 */
import type { Vec3 } from '../core/math';
import type { Aabb } from './room';

export interface Ray {
  origin: Vec3;
  /** Dirección unitaria. */
  dir: Vec3;
}

export interface PickTarget {
  id: string;
  box: Aabb;
}

export interface PickResult {
  id: string;
  distance: number;
}

/**
 * Intersección rayo-caja (método de las losas). Devuelve la distancia de entrada (0 si el
 * origen está dentro) o null si no la toca dentro de [0, maxDistance].
 */
export function rayAabb(ray: Ray, box: Aabb, maxDistance: number): number | null {
  let tMin = 0;
  let tMax = maxDistance;
  const axes: [number, number, number, number][] = [
    [ray.origin.x, ray.dir.x, box.minX, box.maxX],
    [ray.origin.y, ray.dir.y, box.minY, box.maxY],
    [ray.origin.z, ray.dir.z, box.minZ, box.maxZ],
  ];
  for (const [origin, dir, min, max] of axes) {
    if (Math.abs(dir) < 1e-12) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let t1 = (min - origin) / dir;
    let t2 = (max - origin) / dir;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }
  return tMin;
}

/**
 * Devuelve el objeto interactuable más cercano que el rayo toca dentro del alcance y que no
 * está tapado por ningún obstáculo. Null si no hay ninguno.
 */
export function pickInteractable(
  ray: Ray,
  targets: readonly PickTarget[],
  occluders: readonly Aabb[],
  reach: number,
): PickResult | null {
  if (!isValidRay(ray) || !(reach > 0)) return null;
  let best: PickResult | null = null;
  for (const target of targets) {
    const t = rayAabb(ray, target.box, reach);
    if (t !== null && (best === null || t < best.distance)) best = { id: target.id, distance: t };
  }
  if (best === null) return null;
  for (const occluder of occluders) {
    const t = rayAabb(ray, occluder, best.distance);
    if (t !== null && t < best.distance - 1e-4) return null;
  }
  return best;
}

function isValidRay(ray: Ray): boolean {
  const { origin, dir } = ray;
  const values = [origin.x, origin.y, origin.z, dir.x, dir.y, dir.z];
  if (!values.every(Number.isFinite)) return false;
  return Math.hypot(dir.x, dir.y, dir.z) > 1e-9;
}
