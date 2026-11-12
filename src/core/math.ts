/** Utilidades matemáticas puras (sin three). */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lleva un ángulo al rango (-π, π]. */
export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let result = angle % twoPi;
  if (result <= -Math.PI) result += twoPi;
  else if (result > Math.PI) result -= twoPi;
  return result;
}

/**
 * Dirección de la mirada para una orientación dada. Con yaw 0 y pitch 0 mira hacia -z
 * (la misma convención que la cámara de three). Escribe en `out` para no crear objetos.
 */
export function lookDirection(yaw: number, pitch: number, out: Vec3): Vec3 {
  const cosPitch = Math.cos(pitch);
  out.x = -Math.sin(yaw) * cosPitch;
  out.y = Math.sin(pitch);
  out.z = -Math.cos(yaw) * cosPitch;
  return out;
}
