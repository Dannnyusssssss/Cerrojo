/**
 * Conecta los eventos reales del navegador (teclado, ratón, táctil, captura del puntero, foco)
 * con el estado de entrada unificado. La traducción en sí está en input-map.ts.
 */
import type { ActionIntent, InputState } from '../core/input';
import type { Settings } from '../data/config';
import { dragToLook, isTap, keyToIntent, mouseToLook, shouldPreventDefault } from './input-map';

export interface BindingCallbacks {
  /** True mientras se explora o se examina (las teclas son del juego). */
  inGame(): boolean;
  /** True mientras se explora (el ratón y el arrastre giran la cámara). */
  exploring(): boolean;
  /** True mientras se examina un objeto (el arrastre gira el objeto). */
  inspecting(): boolean;
  settings(): Settings;
  onAction(action: ActionIntent): void;
  /** Toque corto sobre la escena: interactuar con lo que hay bajo el dedo. */
  onTap(clientX: number, clientY: number): void;
  /** Clic de ratón sin captura del puntero durante la exploración. */
  onUnlockedClick(): void;
  onInspectDrag(dx: number, dy: number): void;
  onPointerLockChange(locked: boolean): void;
  onTouchDetected(): void;
  onFocusLost(): void;
  /** True si las teclas 1 a 8 eligen objetos del inventario en este momento. */
  slotsActive(): boolean;
  onSlot(index: number): void;
}

interface Drag {
  id: number;
  type: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  moved: number;
}

// Controles que usan las flechas por sí mismos (deslizadores, listas); los botones no.
const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

export class InputBinding {
  private readonly input: InputState;
  private readonly canvas: HTMLCanvasElement;
  private readonly cb: BindingCallbacks;
  private drag: Drag | null = null;

  constructor(input: InputState, canvas: HTMLCanvasElement, callbacks: BindingCallbacks) {
    this.input = input;
    this.canvas = canvas;
    this.cb = callbacks;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onLockChange);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    // Un toque en la escena puede abrir un panel justo encima; sin esto, el clic que el
    // navegador genera después del toque caería sobre el panel recién abierto.
    canvas.addEventListener(
      'touchend',
      (event) => {
        if (event.cancelable) event.preventDefault();
      },
      { passive: false },
    );
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Pide la captura del puntero (solo desde un gesto del jugador). Si falla, se juega con flechas. */
  requestPointerLock(): void {
    if (this.pointerLocked) return;
    try {
      const result = this.canvas.requestPointerLock() as unknown;
      if (result instanceof Promise) result.catch(() => undefined);
    } catch {
      // El navegador la rechazó: el juego sigue siendo jugable con las flechas.
    }
  }

  releasePointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    const inForm = target instanceof HTMLElement && FORM_TAGS.has(target.tagName);
    const mapped = keyToIntent(event.code, {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    });
    if (mapped === null) return;
    if (mapped.kind === 'slot') {
      // Teclas 1 a 8: casillas del inventario, explorando o con un panel abierto.
      if (!event.repeat && !inForm && this.cb.slotsActive()) this.cb.onSlot(mapped.index);
      return;
    }
    if (mapped.kind === 'action') {
      // Esc y P funcionan también en los menús; las demás acciones solo jugando.
      const always = mapped.intent === 'back' || mapped.intent === 'pause';
      if (event.repeat || (!always && !this.cb.inGame())) return;
      if (inForm && !always) return;
      this.cb.onAction(mapped.intent);
      return;
    }
    if (!this.cb.inGame() || inForm) return;
    if (shouldPreventDefault(event.code)) event.preventDefault();
    this.input.press(mapped.intent);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const mapped = keyToIntent(event.code, { ctrl: false, alt: false, meta: false });
    if (mapped?.kind === 'held') this.input.release(mapped.intent);
  };

  private readonly onBlur = (): void => {
    this.input.releaseAll();
    this.cb.onFocusLost();
  };

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.onBlur();
  };

  private readonly onLockChange = (): void => {
    this.cb.onPointerLockChange(this.pointerLocked);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') this.cb.onTouchDetected();
    if (event.pointerType === 'mouse' && this.pointerLocked) {
      if (event.button === 0 && this.cb.exploring()) this.cb.onAction('interact');
      return;
    }
    if (event.pointerType === 'mouse' && this.cb.exploring() && event.button === 0) {
      this.cb.onUnlockedClick();
      return;
    }
    if (this.drag !== null) return;
    this.drag = {
      id: event.pointerId,
      type: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startTime: event.timeStamp,
      moved: 0,
    };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const s = this.cb.settings();
    if (event.pointerType === 'mouse' && this.pointerLocked) {
      if (!this.cb.exploring()) return;
      const look = mouseToLook(event.movementX, event.movementY, s.sensitivity, s.invertY);
      if (look) this.input.addLook(look.yaw, look.pitch);
      return;
    }
    const drag = this.drag;
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.moved = Math.max(
      drag.moved,
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY),
    );
    if (this.cb.inspecting()) {
      this.cb.onInspectDrag(dx, dy);
    } else if (this.cb.exploring() && drag.type === 'touch') {
      const look = dragToLook(dx, dy, s.sensitivity, s.invertY);
      this.input.addLook(look.yaw, look.pitch);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (drag?.id !== event.pointerId) return;
    this.drag = null;
    if (drag.type === 'touch' && this.cb.exploring() && isTap(drag.moved)) {
      this.cb.onTap(event.clientX, event.clientY);
    }
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.drag?.id === event.pointerId) this.drag = null;
  };
}
