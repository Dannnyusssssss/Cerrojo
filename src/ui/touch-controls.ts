/**
 * Controles táctiles: joystick virtual a la izquierda y botones de pausa e interacción de al
 * menos 44 px. Se muestran al detectar el primer toque (eventos de puntero, no agente de usuario).
 */
import { TOUCH } from '../data/config';
import { TEXTS } from '../data/texts';
import { el, setHidden } from './dom';
import { joystickAxes } from './input-map';

export interface TouchCallbacks {
  onStick(x: number, z: number): void;
  onPause(): void;
  onInteract(): void;
  onHint(): void;
}

export class TouchControls {
  readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly callbacks: TouchCallbacks;
  private stickPointer: number | null = null;
  private centerX = 0;
  private centerY = 0;

  constructor(callbacks: TouchCallbacks) {
    this.callbacks = callbacks;
    this.knob = el('div', { className: 'joystick-knob' });
    this.base = el(
      'div',
      { className: 'joystick', attrs: { 'aria-label': TEXTS.hud.joystick, role: 'application' } },
      [this.knob],
    );
    const pause = el('button', {
      className: 'touch-btn touch-pause',
      text: 'II',
      attrs: { type: 'button', 'aria-label': TEXTS.hud.pauseButton },
    });
    pause.addEventListener('click', () => {
      callbacks.onPause();
    });
    const interact = el('button', {
      className: 'touch-btn touch-interact',
      text: TEXTS.hud.interactButton,
      attrs: { type: 'button' },
    });
    interact.addEventListener('click', () => {
      callbacks.onInteract();
    });
    const hint = el('button', {
      className: 'touch-btn touch-hint',
      text: TEXTS.hintPanel.button,
      attrs: { type: 'button' },
    });
    hint.addEventListener('click', () => {
      callbacks.onHint();
    });
    this.root = el('div', { className: 'touch-controls' }, [this.base, pause, interact, hint]);
    setHidden(this.root, true);
    this.bindJoystick();
  }

  setVisible(visible: boolean): void {
    setHidden(this.root, !visible);
    if (!visible) this.resetStick();
  }

  private bindJoystick(): void {
    this.base.addEventListener('pointerdown', (event) => {
      if (this.stickPointer !== null) return;
      event.preventDefault();
      this.stickPointer = event.pointerId;
      this.base.setPointerCapture(event.pointerId);
      const rect = this.base.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.updateStick(event.clientX, event.clientY);
    });
    this.base.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.stickPointer) return;
      this.updateStick(event.clientX, event.clientY);
    });
    const end = (event: PointerEvent): void => {
      if (event.pointerId !== this.stickPointer) return;
      this.resetStick();
    };
    this.base.addEventListener('pointerup', end);
    this.base.addEventListener('pointercancel', end);
    this.base.addEventListener('lostpointercapture', end);
  }

  private updateStick(clientX: number, clientY: number): void {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;
    const axes = joystickAxes(dx, dy, TOUCH.joystickRadius);
    this.knob.style.transform = `translate(${axes.x * TOUCH.joystickRadius}px, ${-axes.z * TOUCH.joystickRadius}px)`;
    this.callbacks.onStick(axes.x, axes.z);
  }

  private resetStick(): void {
    this.stickPointer = null;
    this.knob.style.transform = '';
    this.callbacks.onStick(0, 0);
  }
}
