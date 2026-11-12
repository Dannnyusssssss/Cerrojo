/**
 * Controlador de la aplicación: une la lógica (game/), el render (render/game-view) y la
 * interfaz (ui/), y ejecuta el bucle principal. No contiene reglas de juego: las aplican
 * World, GameState y mode.ts.
 */
import { errorKindOf, logError, type ErrorKind } from './core/errors';
import { InputState, type ActionIntent, type Axes } from './core/input';
import { FixedStepLoop } from './core/loop';
import { buildGameUi, type UiController } from './app-ui';
import { INSPECT, LOOP, PLAYER, type Settings } from './data/config';
import { ROOM_1 } from './data/rooms/room-1';
import { TEXTS } from './data/texts';
import type { Outcome } from './game/game-state';
import {
  INITIAL_MODE,
  isClockRunning,
  isWorldRunning,
  nextMode,
  type Mode,
  type ModeEvent,
  type ModeState,
} from './game/mode';
import { turnPlayer } from './game/player';
import { generateAnswers } from './game/seeded';
import { formatTime } from './game/timer';
import { World } from './game/world';
import { GameView } from './render/game-view';
import type { SaveStore } from './save/storage';
import { DebugOverlay } from './ui/debug-overlay';
import { el } from './ui/dom';
import { focusTexts, itemName, outcomeMessage } from './ui/feedback';
import type { Hud } from './ui/hud';
import type { InputBinding } from './ui/input-binding';
import type { InventoryBar } from './ui/inventory-bar';
import type { Menus } from './ui/menus';
import type { PuzzlePanels } from './ui/puzzle-panels';
import type { TouchControls } from './ui/touch-controls';
import type { DebugParams } from './validation/url-params';

export interface BootOptions {
  seed: number;
  debug: DebugParams;
  store: SaveStore;
  /** Crea una semilla nueva para «Repetir» (con crypto.getRandomValues). */
  newSeed: () => number;
}

/** Espera entre abrir la puerta de salida y mostrar el resultado, para ver cómo se abre. */
const FINISH_DELAY_MS = 1200;

const ROOM = ROOM_1;

export class App implements UiController {
  private readonly root: HTMLElement;
  private readonly store: SaveStore;
  private readonly options: BootOptions;
  private settings: Settings;
  /** Partida con ayudas de depuración: no guardará marcas (desde el Hito 3). */
  readonly withAids: boolean;
  private readonly input = new InputState();
  private readonly loop = new FixedStepLoop(LOOP.stepSeconds, LOOP.maxFrameSeconds);
  private world!: World;
  private mode: ModeState = INITIAL_MODE;
  private view!: GameView;
  private hud!: Hud;
  private menus!: Menus;
  private touch!: TouchControls;
  private inventoryBar!: InventoryBar;
  private panels!: PuzzlePanels;
  private binding!: InputBinding;
  private debugOverlay: DebugOverlay | null = null;
  private focusId: string | null = null;
  private focusKey = '';
  private touchMode = false;
  private expectingUnlock = false;
  private saveWarned = false;
  private tutorialDone = false;
  private finishTimer: number | undefined;
  private lastTime = 0;
  private stopped = false;
  private readonly turn: Axes = { x: 0, z: 0 };
  private readonly look = { yaw: 0, pitch: 0 };

  constructor(root: HTMLElement, options: BootOptions) {
    this.root = root;
    this.options = options;
    this.store = options.store;
    this.settings = options.store.getSettings();
    this.withAids = options.debug.debug;
    if (options.debug.debug) this.debugOverlay = new DebugOverlay(options.seed);
  }

  /** Construye la interfaz y arranca el bucle. Si falla (sin WebGL), muestra un mensaje claro. */
  start(): void {
    const stage = el('div', { className: 'stage' });
    this.root.appendChild(stage);
    try {
      this.view = new GameView(stage, this.settings.quality, this.settings.fov);
    } catch (error) {
      logError('render.init', error);
      this.showFatal(errorKindOf(error));
      return;
    }
    this.buildUi(stage);
    this.newGame(this.options.seed);
    this.applySettings();
    this.menus.setSettings(this.settings);
    this.view.render(this.world.player, 1);
    this.renderMode(null);
    requestAnimationFrame(this.frame);
  }

  private buildUi(stage: HTMLElement): void {
    const ui = buildGameUi(stage, this.view, this.input, ROOM.items, this);
    ({
      hud: this.hud,
      menus: this.menus,
      touch: this.touch,
      inventoryBar: this.inventoryBar,
      panels: this.panels,
      binding: this.binding,
    } = ui);
    if (this.debugOverlay) stage.appendChild(this.debugOverlay.root);
    this.view.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.dispatch('focusLost');
      this.hud.showToast(TEXTS.errors.contextLost, 6000);
    });
  }

  get currentMode(): Mode {
    return this.mode.mode;
  }

  get currentSettings(): Settings {
    return this.settings;
  }

  get currentWorld(): World {
    return this.world;
  }

  /** «Jugar»: una partida ya empezada no se reutiliza, siempre se empieza limpio. */
  play(): void {
    if (this.world.timer.started) this.newGame(this.nextSeed());
    this.dispatch('start');
  }

  /** «Repetir»: partida nueva con otra semilla. */
  replay(): void {
    this.newGame(this.nextSeed());
    this.dispatch('start');
  }

  private nextSeed(): number {
    // Con una semilla fija de depuración, «Repetir» la conserva para poder reproducir.
    return this.options.debug.seed ?? this.options.newSeed();
  }

  /** Empieza una partida nueva en la sala: estado, jugador y vista desde cero. */
  private newGame(seed: number): void {
    window.clearTimeout(this.finishTimer);
    this.finishTimer = undefined;
    const answers = generateAnswers(ROOM, seed);
    this.world = new World(ROOM, answers);
    this.tutorialDone = false;
    this.focusId = null;
    this.focusKey = '';
    this.debugOverlay?.setSeed(seed);
    this.view.load(ROOM, answers, this.world.state, this.settings.quality);
  }

  private readonly frame = (now: number): void => {
    if (this.stopped) return;
    const dt =
      this.lastTime === 0 ? 0 : Math.min((now - this.lastTime) / 1000, LOOP.maxFrameSeconds);
    this.lastTime = now;
    try {
      this.tick(dt);
    } catch (error) {
      logError('loop', error);
      this.showFatal('generic');
      return;
    }
    requestAnimationFrame(this.frame);
  };

  private tick(dt: number): void {
    let alpha = 1;
    const mode = this.mode.mode;
    this.input.consumeLook(this.look);
    if (isClockRunning(mode)) {
      this.input.turnAxes(this.turn);
      if (isWorldRunning(mode)) {
        // El giro se aplica en cada frame de render para que no haya retraso perceptible.
        const player = this.world.player;
        const keyTurn = PLAYER.keyTurnSpeed * this.settings.sensitivity * dt;
        const turning =
          this.look.yaw !== 0 || this.look.pitch !== 0 || this.turn.x !== 0 || this.turn.z !== 0;
        if (turning) this.world.timer.start();
        turnPlayer(player, this.look.yaw, this.look.pitch, PLAYER.maxPitch);
        turnPlayer(player, this.turn.x * keyTurn, this.turn.z * keyTurn, PLAYER.maxPitch);
      } else if (mode === 'inspecting') {
        const speed = INSPECT.keyRotateSpeed * dt;
        this.view.inspect.rotate(-this.turn.x * speed, -this.turn.z * speed);
      }
      const advance = this.loop.advance(dt);
      for (let i = 0; i < advance.steps; i++) {
        if (isWorldRunning(mode)) this.world.step(this.input, this.loop.stepSeconds);
        this.world.tickClock();
      }
      if (isWorldRunning(mode)) alpha = advance.alpha;
    }
    if (mode === 'playing') {
      this.updateFocus(this.world.pick(this.world.viewRayFromPlayer())?.id ?? null);
    }
    this.view.sync(this.world.state);
    this.updateHud();
    this.view.update(dt);
    const calls = this.view.render(this.world.player, alpha);
    const p = this.world.player;
    this.debugOverlay?.setPose(p.x, p.z, p.yaw, p.pitch);
    this.debugOverlay?.update(dt, calls);
  }

  private updateHud(): void {
    const state = this.world.state;
    this.hud.setTime(formatTime(this.world.timer.steps, LOOP.stepSeconds));
    this.inventoryBar.update(state.inventory.items, state.inventory.selected);
    const target = ROOM.tutorialTarget;
    if (target !== undefined && state.isOpen(target)) this.tutorialDone = true;
    const showHint = target !== undefined && !this.tutorialDone && this.mode.mode === 'playing';
    this.hud.setHint(showHint ? TEXTS.messages.tutorial : null);
  }

  /** Resalta el objeto señalado y muestra su nombre con la acción posible. */
  private updateFocus(id: string | null): void {
    const texts = id === null ? null : focusTexts(this.world.state, id, ROOM.items);
    const key = `${id ?? ''}|${texts?.action ?? ''}`;
    if (key === this.focusKey) return;
    this.focusKey = key;
    this.focusId = id;
    this.view.highlight(id);
    this.hud.setFocus(texts?.name ?? null, texts?.action ?? null);
  }

  onAction(action: ActionIntent): void {
    const mode = this.mode.mode;
    const inventory = this.world.state.inventory;
    switch (action) {
      case 'interact':
        if (mode === 'playing' && this.focusId !== null) this.interactWith(this.focusId);
        else if (mode === 'inspecting') this.endInspect();
        break;
      case 'pause':
        if (mode !== 'title' && mode !== 'finished') this.dispatch('togglePause');
        break;
      case 'back':
        if (mode === 'inspecting') this.endInspect();
        else if (mode === 'panel') this.panels.close();
        else if (mode === 'playing' && inventory.selectedItem !== null) inventory.clearSelection();
        else if (mode === 'playing') this.dispatch('pause');
        else if (this.menus.screen === 'settings') this.menus.closeSettings();
        else if (mode === 'paused') this.dispatch('resume');
        break;
      case 'mute':
        this.updateSettings({ ...this.settings, muted: !this.settings.muted });
        this.menus.setSettings(this.settings);
        this.hud.showToast(this.settings.muted ? TEXTS.hud.mutedOn : TEXTS.hud.mutedOff, 1500);
        break;
    }
  }

  selectSlot(index: number): void {
    const inventory = this.world.state.inventory;
    inventory.select(index);
    const selected = inventory.selectedItem;
    if (selected !== null) {
      this.hud.showToast(TEXTS.messages.selected(itemName(ROOM.items, selected)), 2500);
    }
  }

  private interactWith(id: string): void {
    this.respond(this.world.interact(id));
  }

  /** Respuesta visible a cada resultado de una acción. Nada se pierde al equivocarse. */
  private respond(outcome: Outcome): void {
    const message = outcomeMessage(outcome, ROOM.items);
    if (message !== null) this.hud.showToast(message);
    if (outcome.kind === 'inspect') {
      if (this.view.openInspect(outcome.id, this.settings.reduceMotion)) this.dispatch('inspect');
    } else if (outcome.kind === 'panel') {
      const puzzle = this.world.state.puzzle(outcome.puzzle);
      if (!puzzle) return;
      this.dispatch('openPanel');
      // Cada panel lleva el foco a su primer control útil (la primera rueda, el primer bloque).
      this.panels.open(puzzle, this.world.state.inventory.selectedItem);
    } else if (outcome.kind === 'unlocked' && outcome.finished) {
      this.scheduleFinish();
    }
  }

  private scheduleFinish(): void {
    if (this.finishTimer !== undefined) return;
    this.finishTimer = window.setTimeout(() => {
      this.finishTimer = undefined;
      this.menus.setResult(formatTime(this.world.timer.steps, LOOP.stepSeconds), this.withAids);
      this.dispatch('finish');
    }, FINISH_DELAY_MS);
  }

  endInspect(): void {
    this.view.inspect.close(this.settings.reduceMotion);
    this.dispatch('endInspect');
  }

  onTap(clientX: number, clientY: number): void {
    if (this.mode.mode !== 'playing') return;
    const hit = this.world.pick(this.world.rayToward(this.view.directionAt(clientX, clientY)));
    if (hit) this.interactWith(hit.id);
  }

  onPointerLockChange(locked: boolean): void {
    if (locked) return;
    if (this.expectingUnlock) {
      this.expectingUnlock = false;
      return;
    }
    // Perder la captura durante la exploración (Esc del navegador) pausa el juego.
    if (this.mode.mode === 'playing') this.dispatch('focusLost', { lockLost: true });
  }

  private releaseLock(): void {
    if (this.binding.pointerLocked) {
      this.expectingUnlock = true;
      this.binding.releasePointerLock();
    }
  }

  enableTouch(): void {
    if (this.touchMode) return;
    this.touchMode = true;
    this.root.classList.add('touch-mode');
    this.renderMode(null);
  }

  dispatch(event: ModeEvent, options: { lockLost?: boolean } = {}): void {
    const previous = this.mode;
    this.mode = nextMode(this.mode, event);
    if (this.mode !== previous) this.renderMode(previous, options);
  }

  /** Muestra la interfaz que corresponde al modo actual. */
  private renderMode(previous: ModeState | null, options: { lockLost?: boolean } = {}): void {
    const mode = this.mode.mode;
    this.hud.setVisible(mode === 'playing' || mode === 'inspecting');
    this.inventoryBar.setVisible(mode === 'playing');
    this.touch.setVisible(this.touchMode && mode === 'playing');
    this.hud.setInspecting(mode === 'inspecting');
    if (mode !== 'panel') this.panels.hide();
    if (mode !== 'playing') {
      this.updateFocus(null);
      this.input.releaseAll();
    }
    switch (mode) {
      case 'title':
        this.view.inspect.close(true);
        this.menus.show('start');
        break;
      case 'finished':
        this.releaseLock();
        this.menus.show('result');
        break;
      case 'paused':
        this.releaseLock();
        if (this.mode.resumeTo === 'playing') this.view.inspect.close(true);
        this.menus.show('pause', options);
        break;
      case 'inspecting':
      case 'panel':
        this.menus.show(null);
        this.releaseLock();
        break;
      case 'playing':
        this.menus.show(null);
        this.loop.reset();
        this.world.player.prevX = this.world.player.x;
        this.world.player.prevZ = this.world.player.z;
        // Se vuelve a pedir la captura con el gesto que reanudó (clic, Enter, E o Esc).
        if (!this.touchMode && previous !== null) this.binding.requestPointerLock();
        this.view.canvas.focus();
        break;
    }
  }

  updateSettings(values: Settings): void {
    const previousQuality = this.settings.quality;
    const saved = this.store.saveSettings(values);
    this.settings = this.store.getSettings();
    if (!saved && !this.saveWarned) {
      this.saveWarned = true;
      this.hud.showToast(TEXTS.errors.saveUnavailable, 5000);
    }
    this.applySettings();
    // Cambiar la calidad reconstruye la sala (tamaño de texturas y sombras).
    if (this.settings.quality !== previousQuality) {
      this.focusId = null;
      this.focusKey = '';
      this.view.rebuild(this.world.state, this.settings.quality);
    }
  }

  private applySettings(): void {
    this.view.applySettings(this.settings.fov, this.settings.quality);
    this.root.classList.toggle('reduce-motion', this.settings.reduceMotion);
  }

  private showFatal(kind: ErrorKind): void {
    this.stopped = true;
    const message = kind === 'noWebgl' ? TEXTS.errors.noWebgl : TEXTS.errors.generic;
    this.root.replaceChildren(
      el('section', { className: 'screen screen-fatal', attrs: { role: 'alert' } }, [
        el('h1', { className: 'title', text: TEXTS.title }),
        el('p', { text: message }),
      ]),
    );
  }
}
