/**
 * Traducción pura de eventos de dispositivo a intenciones (sin DOM, para poder probarla).
 * La conexión con los eventos reales del navegador está en input-binding.ts.
 */
import { PLAYER, TOUCH } from '../data/config';
import type { ActionIntent, HeldIntent } from '../core/input';
import { clamp } from '../core/math';

export type KeyIntent =
  { kind: 'held'; intent: HeldIntent } | { kind: 'action'; intent: ActionIntent };

const KEY_MAP: Readonly<Record<string, KeyIntent>> = {
  KeyW: { kind: 'held', intent: 'forward' },
  KeyS: { kind: 'held', intent: 'back' },
  KeyA: { kind: 'held', intent: 'left' },
  KeyD: { kind: 'held', intent: 'right' },
  ArrowLeft: { kind: 'held', intent: 'turnLeft' },
  ArrowRight: { kind: 'held', intent: 'turnRight' },
  ArrowUp: { kind: 'held', intent: 'turnUp' },
  ArrowDown: { kind: 'held', intent: 'turnDown' },
  KeyE: { kind: 'action', intent: 'interact' },
  KeyP: { kind: 'action', intent: 'pause' },
  Escape: { kind: 'action', intent: 'back' },
  KeyM: { kind: 'action', intent: 'mute' },
};

/** Teclas cuya acción por defecto del navegador se evita mientras se juega. */
const PREVENT_DEFAULT_CODES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * Traduce un código físico de tecla (`KeyboardEvent.code`) a una intención. Las teclas con
 * Ctrl, Alt o Meta no son del juego (se dejan al navegador).
 */
export function keyToIntent(
  code: string,
  modifiers: { ctrl: boolean; alt: boolean; meta: boolean },
): KeyIntent | null {
  if (modifiers.ctrl || modifiers.alt || modifiers.meta) return null;
  return Object.prototype.hasOwnProperty.call(KEY_MAP, code) ? (KEY_MAP[code] ?? null) : null;
}

export function shouldPreventDefault(code: string): boolean {
  return PREVENT_DEFAULT_CODES.has(code);
}

export interface LookDelta {
  yaw: number;
  pitch: number;
}

/**
 * Convierte un movimiento de ratón (píxeles) en giro. Los saltos anómalos se descartan.
 * Mover a la derecha gira a la derecha (yaw negativo); mover hacia arriba mira arriba,
 * salvo con el eje invertido.
 */
export function mouseToLook(
  dx: number,
  dy: number,
  sensitivity: number,
  invertY: boolean,
): LookDelta | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) > PLAYER.maxMouseDelta || Math.abs(dy) > PLAYER.maxMouseDelta) return null;
  const scale = PLAYER.mouseRadiansPerPixel * sensitivity;
  return { yaw: -dx * scale, pitch: (invertY ? dy : -dy) * scale };
}

/** Igual que mouseToLook para el arrastre táctil (sin filtro de saltos). */
export function dragToLook(
  dx: number,
  dy: number,
  sensitivity: number,
  invertY: boolean,
): LookDelta {
  const scale = PLAYER.touchRadiansPerPixel * sensitivity;
  return { yaw: -dx * scale, pitch: (invertY ? dy : -dy) * scale };
}

/**
 * Convierte el desplazamiento del dedo desde el centro del joystick en ejes de movimiento.
 * Arriba en pantalla es avanzar. La longitud se limita a 1.
 */
export function joystickAxes(dx: number, dy: number, radius: number): { x: number; z: number } {
  if (!(radius > 0)) return { x: 0, z: 0 };
  let x = dx / radius;
  let z = -dy / radius;
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  return { x: clamp(x, -1, 1), z: clamp(z, -1, 1) };
}

/** Un toque corto y casi quieto es un toque de interacción, no un arrastre. */
export function isTap(movedPixels: number, durationMs: number): boolean {
  return movedPixels <= TOUCH.tapMaxMove && durationMs <= TOUCH.tapMaxMs;
}
