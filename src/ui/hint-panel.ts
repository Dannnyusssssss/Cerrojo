/**
 * Panel de pistas. Abrirlo no cuenta nada: muestra las pistas ya vistas del paso actual y pide
 * confirmar antes de enseñar la siguiente, que sí cuenta. Las ya vistas se releen gratis.
 */
import { HINT_LEVELS } from '../game/hints';
import { TEXTS } from '../data/texts';
import { button, el, setHidden } from './dom';
import { panelShell, type PanelShell } from './panel-shell';

/** Lo que muestra el panel: textos ya vistos y el siguiente nivel (o null si no quedan). */
export interface HintView {
  texts: readonly string[];
  next: number | null;
  /** No queda ningún puzzle por resolver. */
  none: boolean;
}

export interface HintCallbacks {
  view(): HintView;
  /** Confirma y muestra el siguiente nivel (lo cuenta quien llama). */
  reveal(): void;
  onClose(): void;
}

export class HintPanel {
  readonly root: HTMLDivElement;
  private readonly shell: PanelShell;
  private readonly cb: HintCallbacks;

  constructor(callbacks: HintCallbacks) {
    this.cb = callbacks;
    this.shell = panelShell(TEXTS.hintPanel.title, '');
    this.shell.root.classList.add('hint-panel');
    // Las pistas vistas van primero; la pregunta, junto a los botones.
    setHidden(this.shell.help, true);
    this.root = el('div', { className: 'menus panel-layer' }, [this.shell.root]);
    setHidden(this.root, true);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    setHidden(this.root, false);
    setHidden(this.shell.root, false);
    this.render(true);
  }

  /** Cierra y avisa al controlador. */
  close(): void {
    if (!this.isOpen) return;
    this.hide();
    this.cb.onClose();
  }

  /** Cierra sin avisar. */
  hide(): void {
    setHidden(this.root, true);
  }

  /** `askFirst`: el foco va a «Ver la pista»; tras ver una, va a «Cerrar» (así un Enter de más no gasta otra). */
  private render(askFirst: boolean): void {
    const view = this.cb.view();
    const t = TEXTS.hintPanel;
    const list = view.texts.map((text, i) =>
      el('div', { className: 'hint-item' }, [
        el('h3', { className: 'hint-level', text: t.level(i + 1, HINT_LEVELS) }),
        el('p', { text }),
      ]),
    );
    this.shell.body.replaceChildren(...list);
    if (view.none) this.shell.message.textContent = t.none;
    else if (view.next !== null) this.shell.message.textContent = t.ask(view.next, HINT_LEVELS);
    else this.shell.message.textContent = t.allSeen;
    const actions: HTMLButtonElement[] = [];
    if (!view.none && view.next !== null) {
      actions.push(
        button(
          t.reveal(view.next),
          () => {
            this.cb.reveal();
            this.render(false);
          },
          'btn btn-primary',
        ),
      );
    }
    actions.push(
      button(t.close, () => {
        this.close();
      }),
    );
    this.shell.actions.replaceChildren(...actions);
    (askFirst ? actions[0] : actions[actions.length - 1])?.focus();
  }
}
