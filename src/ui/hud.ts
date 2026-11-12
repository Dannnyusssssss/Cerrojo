/**
 * HUD del juego: retícula, nombre y acción del objeto señalado, avisos y barra de la vista
 * de examen. Cada texto lleva un fondo propio para mantener el contraste sobre la escena.
 */
import { TEXTS } from '../data/texts';
import { button, el, setHidden } from './dom';

export class Hud {
  readonly root: HTMLDivElement;
  private readonly reticle: HTMLDivElement;
  private readonly focusLabel: HTMLDivElement;
  private readonly focusName: HTMLSpanElement;
  private readonly focusAction: HTMLSpanElement;
  private readonly toast: HTMLDivElement;
  private readonly inspectBar: HTMLDivElement;
  private toastTimer: number | undefined;

  constructor(onInspectBack: () => void) {
    this.reticle = el('div', { className: 'reticle', attrs: { 'aria-hidden': 'true' } });
    this.focusName = el('span', { className: 'focus-name' });
    this.focusAction = el('span', { className: 'focus-action' });
    this.focusLabel = el('div', { className: 'focus-label', attrs: { 'aria-live': 'polite' } }, [
      this.focusName,
      this.focusAction,
    ]);
    this.toast = el('div', { className: 'toast', attrs: { role: 'status' } });
    const back = button(TEXTS.inspect.back, onInspectBack, 'btn btn-inspect-back');
    this.inspectBar = el('div', { className: 'inspect-bar' }, [
      el('p', { className: 'inspect-help', text: TEXTS.inspect.help }),
      back,
    ]);
    this.root = el('div', { className: 'hud' }, [
      this.reticle,
      this.focusLabel,
      this.toast,
      this.inspectBar,
    ]);
    setHidden(this.focusLabel, true);
    setHidden(this.toast, true);
    setHidden(this.inspectBar, true);
  }

  setVisible(visible: boolean): void {
    setHidden(this.root, !visible);
  }

  /** Muestra el nombre y la acción del objeto señalado, o lo oculta con null. */
  setFocus(name: string | null, action: string | null): void {
    if (name === null || action === null) {
      setHidden(this.focusLabel, true);
      this.reticle.classList.remove('reticle-active');
      return;
    }
    this.focusName.textContent = name;
    this.focusAction.textContent = action;
    setHidden(this.focusLabel, false);
    this.reticle.classList.add('reticle-active');
  }

  setInspecting(inspecting: boolean): void {
    setHidden(this.inspectBar, !inspecting);
    setHidden(this.reticle, inspecting);
    if (inspecting) {
      this.setFocus(null, null);
      this.inspectBar.querySelector('button')?.focus();
    }
  }

  showToast(text: string, ms = 3000): void {
    this.toast.textContent = text;
    setHidden(this.toast, false);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      setHidden(this.toast, true);
    }, ms);
  }
}
