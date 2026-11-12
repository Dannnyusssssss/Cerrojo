/**
 * Estado de entrada unificado, sin DOM. Teclado, ratón y táctil llegan aquí ya traducidos a
 * intenciones; la lógica no sabe de qué dispositivo vienen.
 */
import { clamp } from './math';

/** Intenciones que se mantienen mientras la tecla o el control sigue pulsado. */
export type HeldIntent =
  'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight' | 'turnUp' | 'turnDown';

/** Intenciones de un solo disparo. */
export type ActionIntent = 'interact' | 'pause' | 'back' | 'mute' | 'combine' | 'hint';

export interface Axes {
  /** Lateral: -1 izquierda, 1 derecha. */
  x: number;
  /** Frontal: 1 adelante, -1 atrás. */
  z: number;
}

export class InputState {
  private readonly held = new Set<HeldIntent>();
  private actions: ActionIntent[] = [];
  private pendingYaw = 0;
  private pendingPitch = 0;
  private stickX = 0;
  private stickZ = 0;

  press(intent: HeldIntent): void {
    this.held.add(intent);
  }

  release(intent: HeldIntent): void {
    this.held.delete(intent);
  }

  isHeld(intent: HeldIntent): boolean {
    return this.held.has(intent);
  }

  /** Suelta todo (al pausar o perder el foco, para que nada quede «pegado»). */
  releaseAll(): void {
    this.held.clear();
    this.stickX = 0;
    this.stickZ = 0;
    this.pendingYaw = 0;
    this.pendingPitch = 0;
  }

  pushAction(action: ActionIntent): void {
    this.actions.push(action);
  }

  /** Devuelve y vacía las acciones pendientes, en orden de llegada. */
  consumeActions(): ActionIntent[] {
    const result = this.actions;
    this.actions = [];
    return result;
  }

  /** Acumula giro de cámara (radianes) del ratón o del arrastre táctil. */
  addLook(yaw: number, pitch: number): void {
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
    this.pendingYaw += yaw;
    this.pendingPitch += pitch;
  }

  /** Devuelve y vacía el giro acumulado. */
  consumeLook(out: { yaw: number; pitch: number }): { yaw: number; pitch: number } {
    out.yaw = this.pendingYaw;
    out.pitch = this.pendingPitch;
    this.pendingYaw = 0;
    this.pendingPitch = 0;
    return out;
  }

  /** Joystick virtual, cada eje en [-1, 1]. */
  setStick(x: number, z: number): void {
    this.stickX = Number.isFinite(x) ? clamp(x, -1, 1) : 0;
    this.stickZ = Number.isFinite(z) ? clamp(z, -1, 1) : 0;
  }

  /** Movimiento combinado de teclas y joystick, con longitud máxima 1. */
  moveAxes(out: Axes): Axes {
    let x = this.stickX;
    let z = this.stickZ;
    if (this.held.has('right')) x += 1;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('forward')) z += 1;
    if (this.held.has('back')) z -= 1;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    out.x = x;
    out.z = z;
    return out;
  }

  /** Giro con teclas: x = yaw (1 izquierda), z = pitch (1 arriba). */
  turnAxes(out: Axes): Axes {
    out.x = (this.held.has('turnLeft') ? 1 : 0) - (this.held.has('turnRight') ? 1 : 0);
    out.z = (this.held.has('turnUp') ? 1 : 0) - (this.held.has('turnDown') ? 1 : 0);
    return out;
  }
}
