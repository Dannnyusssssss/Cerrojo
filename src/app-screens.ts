/**
 * Qué se ve en cada modo del juego (HUD, inventario, paneles, menús) y la captura del puntero.
 * Solo muestra el modo que decide mode.ts; no cambia el estado de la partida.
 */
import type { InputState } from './core/input';
import type { FixedStepLoop } from './core/loop';
import type { PlayActions } from './app-play';
import type { GameUi } from './app-ui';
import type { ModeState } from './game/mode';
import type { World } from './game/world';
import type { GameView } from './render/game-view';
import type { Screen } from './ui/menus';

export class ScreenFlow {
  private readonly root: HTMLElement;
  private readonly ui: GameUi;
  private readonly view: GameView;
  private readonly input: InputState;
  private readonly loop: FixedStepLoop;
  private readonly play: PlayActions;
  private touchMode = false;
  private expectingUnlock = false;
  /** Pantalla del menú al volver al modo de inicio (el inicio o la selección de salas). */
  private titleScreen: Screen = 'start';

  constructor(
    root: HTMLElement,
    ui: GameUi,
    parts: { view: GameView; input: InputState; loop: FixedStepLoop; play: PlayActions },
  ) {
    this.root = root;
    this.ui = ui;
    this.view = parts.view;
    this.input = parts.input;
    this.loop = parts.loop;
    this.play = parts.play;
  }

  get isTouch(): boolean {
    return this.touchMode;
  }

  /** La próxima vez que se vuelva al inicio se mostrará la selección de salas. */
  showRoomsNext(): void {
    this.titleScreen = 'rooms';
  }

  /** Primer toque detectado: controles táctiles a partir de ahora. Devuelve true si cambió. */
  enableTouch(): boolean {
    if (this.touchMode) return false;
    this.touchMode = true;
    this.root.classList.add('touch-mode');
    return true;
  }

  /** True si la captura se perdió sin que la soltara el juego (Esc del navegador). */
  lockLostByPlayer(locked: boolean): boolean {
    if (locked) return false;
    if (this.expectingUnlock) {
      this.expectingUnlock = false;
      return false;
    }
    return true;
  }

  private releaseLock(): void {
    if (this.ui.binding.pointerLocked) {
      this.expectingUnlock = true;
      this.ui.binding.releasePointerLock();
    }
  }

  /** Muestra la interfaz que corresponde al modo actual. */
  render(
    state: ModeState,
    previous: ModeState | null,
    world: World,
    options: { lockLost?: boolean } = {},
  ): void {
    const { hud, inventoryBar, touch, panels, hintPanel, menus } = this.ui;
    const mode = state.mode;
    hud.setVisible(mode === 'playing' || mode === 'inspecting');
    inventoryBar.setVisible(mode === 'playing');
    touch.setVisible(this.touchMode && mode === 'playing');
    hud.setInspecting(mode === 'inspecting');
    if (mode !== 'panel') {
      panels.hide();
      hintPanel.hide();
    }
    if (mode !== 'playing') {
      this.play.updateFocus(null);
      this.input.releaseAll();
    }
    switch (mode) {
      case 'title':
        this.view.inspect.close(true);
        menus.show(this.titleScreen);
        this.titleScreen = 'start';
        break;
      case 'finished':
        this.releaseLock();
        menus.show('result');
        break;
      case 'paused':
        this.releaseLock();
        if (state.resumeTo === 'playing') this.view.inspect.close(true);
        menus.show('pause', options);
        break;
      case 'inspecting':
      case 'panel':
        menus.show(null);
        this.releaseLock();
        break;
      case 'playing':
        menus.show(null);
        this.loop.reset();
        world.player.prevX = world.player.x;
        world.player.prevZ = world.player.z;
        // Se vuelve a pedir la captura con el gesto que reanudó (clic, Enter, E o Esc).
        if (!this.touchMode && previous !== null) this.ui.binding.requestPointerLock();
        this.view.canvas.focus();
        break;
    }
  }
}
