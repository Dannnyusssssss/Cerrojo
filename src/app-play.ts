/**
 * Acciones del jugador dentro de la sala, para el controlador: el objeto señalado, interactuar,
 * el inventario (tomar en la mano y combinar) y las pistas. Solo traduce resultados de la
 * lógica en respuestas visibles; las reglas están en World y GameState.
 */
import type { Settings } from './data/config';
import { TEXTS } from './data/texts';
import type { Outcome } from './game/game-state';
import { chooseHintPuzzle } from './game/hints';
import type { Mode, ModeEvent } from './game/mode';
import type { PuzzleDef, RoomDef } from './game/room';
import type { World } from './game/world';
import type { GameView } from './render/game-view';
import { combineMessage, focusTexts, itemName, outcomeMessage } from './ui/feedback';
import type { HintPanel, HintView } from './ui/hint-panel';
import { hintView } from './ui/hint-text';
import type { Hud } from './ui/hud';
import type { PuzzlePanels } from './ui/puzzle-panels';

/** Lo que estas acciones necesitan del controlador. */
export interface PlayHost {
  world(): World;
  room(): RoomDef;
  mode(): Mode;
  settings(): Settings;
  dispatch(event: ModeEvent): void;
  /** Se abrió la puerta de salida. */
  onExitOpened(): void;
}

export interface PlayUi {
  hud: Hud;
  view: GameView;
  panels: PuzzlePanels;
  hintPanel: HintPanel;
}

export class PlayActions {
  private readonly host: PlayHost;
  private readonly ui: PlayUi;
  private focusId: string | null = null;
  private focusKey = '';
  /** Esperando el segundo objeto para combinar. */
  private combiningFlag = false;
  /** Puzzle del que trata el panel de pistas abierto (se elige al abrirlo). */
  private hintPuzzle: PuzzleDef | null = null;

  constructor(host: PlayHost, ui: PlayUi) {
    this.host = host;
    this.ui = ui;
  }

  get combining(): boolean {
    return this.combiningFlag;
  }

  /** Partida nueva o recuperada: nada señalado, nada a medias. */
  reset(): void {
    this.combiningFlag = false;
    this.hintPuzzle = null;
    this.clearFocus();
  }

  /** Olvida el objeto señalado (al cambiar la calidad se reconstruye la sala). */
  clearFocus(): void {
    this.focusId = null;
    this.focusKey = '';
  }

  /** Resalta el objeto señalado y muestra su nombre con la acción posible. */
  updateFocus(id: string | null): void {
    const world = this.host.world();
    const room = this.host.room();
    const texts = id === null ? null : focusTexts(world.state, id, room.items);
    const key = `${id ?? ''}|${texts?.action ?? ''}`;
    if (key === this.focusKey) return;
    this.focusKey = key;
    this.focusId = id;
    this.ui.view.highlight(id);
    this.ui.hud.setFocus(texts?.name ?? null, texts?.action ?? null);
  }

  /** Interactúa con el objeto señalado por la retícula, si hay alguno. */
  interactWithFocus(): void {
    if (this.focusId !== null) this.interactWith(this.focusId);
  }

  interactWith(id: string): void {
    this.respond(this.host.world().interact(id));
  }

  /** Respuesta visible a cada resultado de una acción. Nada se pierde al equivocarse. */
  private respond(outcome: Outcome): void {
    const world = this.host.world();
    const room = this.host.room();
    const settings = this.host.settings();
    const message = outcomeMessage(outcome, room.items);
    if (message !== null) this.ui.hud.showToast(message);
    if (outcome.kind === 'inspect') {
      if (this.ui.view.openInspect(outcome.id, settings.reduceMotion))
        this.host.dispatch('inspect');
    } else if (outcome.kind === 'panel') {
      const puzzle = world.state.puzzle(outcome.puzzle);
      if (!puzzle) return;
      this.host.dispatch('openPanel');
      // Cada panel lleva el foco a su primer control útil (la primera rueda, el primer bloque).
      this.ui.panels.open(puzzle, world.state.inventory.selectedItem);
    } else if (outcome.kind === 'unlocked' && outcome.finished) {
      this.host.onExitOpened();
    }
  }

  /** Esc mientras se explora: cancela combinar o suelta el objeto. Devuelve true si hizo algo. */
  back(): boolean {
    const inventory = this.host.world().state.inventory;
    if (this.combiningFlag) {
      this.toggleCombine();
      return true;
    }
    if (inventory.selectedItem !== null) {
      inventory.clearSelection();
      return true;
    }
    return false;
  }

  /** Combinar se cancela solo si se deja de explorar o se suelta el objeto. */
  checkCombining(): void {
    const idle = this.host.mode() !== 'playing';
    if (this.combiningFlag && (idle || this.host.world().state.inventory.selectedItem === null)) {
      this.combiningFlag = false;
    }
  }

  selectSlot(index: number): void {
    const inventory = this.host.world().state.inventory;
    if (this.combiningFlag) {
      this.combineWith(index);
      return;
    }
    inventory.select(index);
    const selected = inventory.selectedItem;
    if (selected !== null) {
      this.ui.hud.showToast(
        TEXTS.messages.selected(itemName(this.host.room().items, selected)),
        2500,
      );
    }
  }

  toggleCombine(): void {
    const selected = this.host.world().state.inventory.selectedItem;
    if (this.combiningFlag) {
      this.combiningFlag = false;
      this.ui.hud.showToast(TEXTS.messages.combineCancelled, 1500);
      return;
    }
    if (selected === null) {
      this.ui.hud.showToast(TEXTS.messages.combineNeedItem, 2500);
      return;
    }
    this.combiningFlag = true;
    const name = itemName(this.host.room().items, selected);
    this.ui.hud.showToast(TEXTS.messages.combineChoose(name), 4000);
  }

  /** Combina el objeto en la mano con el de la casilla `index`. Si no encajan, no se pierde nada. */
  private combineWith(index: number): void {
    this.combiningFlag = false;
    const world = this.host.world();
    const room = this.host.room();
    const first = world.state.inventory.selectedItem;
    const second = world.state.inventory.items[index];
    if (first === null || second === undefined) return;
    this.ui.hud.showToast(combineMessage(world.combine(first, second), room.items));
  }

  /** Abre el panel de pistas con el puzzle más próximo a resolverse (no cuenta nada aún). */
  requestHint(): void {
    if (this.host.mode() !== 'playing') return;
    this.combiningFlag = false;
    this.hintPuzzle = chooseHintPuzzle(this.host.world().state);
    this.host.dispatch('openPanel');
    this.ui.hintPanel.open();
  }

  hintView(): HintView {
    return hintView(this.host.room(), this.host.world().state, this.hintPuzzle);
  }

  revealHint(): void {
    if (this.hintPuzzle !== null) this.host.world().revealHint(this.hintPuzzle.id);
  }
}
