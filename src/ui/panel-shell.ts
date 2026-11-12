/** Armazón común de los paneles de puzzle: título, ayuda, cuerpo, mensaje y botones. */
import { el, setHidden } from './dom';

/** Tiempo que se muestra el mensaje de acierto antes de cerrar el panel. */
export const SOLVED_CLOSE_MS = 900;

export interface PanelShell {
  root: HTMLElement;
  title: HTMLHeadingElement;
  help: HTMLParagraphElement;
  body: HTMLDivElement;
  message: HTMLParagraphElement;
  actions: HTMLDivElement;
}

export function panelShell(titleText: string, helpText: string): PanelShell {
  const title = el('h2', { className: 'screen-title', text: titleText });
  const help = el('p', { className: 'panel-help', text: helpText });
  const body = el('div', { className: 'panel-body' });
  const message = el('p', {
    className: 'panel-message',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const actions = el('div', { className: 'menu-buttons' });
  const root = el('section', { className: 'screen puzzle-panel' }, [
    title,
    help,
    body,
    message,
    actions,
  ]);
  root.setAttribute('aria-label', titleText);
  setHidden(root, true);
  return { root, title, help, body, message, actions };
}

/** Señal visible de fallo: el panel tiembla (o solo cambia el borde) cada vez que se falla. */
export function flashWrong(root: HTMLElement): void {
  // Se reinicia la clase en el siguiente frame para que la señal se repita en cada intento.
  root.classList.remove('panel-wrong');
  window.requestAnimationFrame(() => {
    root.classList.add('panel-wrong');
  });
}

/** Señal visible de acierto; avisa al terminar para cerrar el panel. */
export function flashRight(root: HTMLElement, done: () => void): void {
  root.classList.add('panel-right');
  window.setTimeout(() => {
    root.classList.remove('panel-right');
    done();
  }, SOLVED_CLOSE_MS);
}

/** Atiende una tecla con un mapa de acciones; evita la acción del navegador si la usa. */
export function handleKey(event: KeyboardEvent, keys: Readonly<Record<string, () => void>>): void {
  const action = Object.prototype.hasOwnProperty.call(keys, event.key)
    ? keys[event.key]
    : undefined;
  if (!action) return;
  event.preventDefault();
  action();
}
