/**
 * Controlador de la aplicación: une la lógica (game/), el render (render/game-view) y la
 * interfaz (ui/), ejecuta el bucle principal y decide qué pantalla se ve. No contiene reglas de
 * juego: las aplican World, GameState y mode.ts. Las acciones dentro de la sala están en
 * app-play.ts y el progreso entre salas (y el guardado) en app-progress.ts.
 */
import { errorKindOf, logError, type ErrorKind } from './core/errors';
import { InputState, type ActionIntent, type Axes } from './core/input';
import { FixedStepLoop } from './core/loop';
import { ScreenFlow } from './app-screens';
import { Progress } from './app-progress';
import { buildGameUi, type GameUi, type UiController } from './app-ui';
import { AudioEngine } from './audio/engine';
import { INSPECT, LOOP, PLAYER, type Settings } from './data/config';
import { TEXTS } from './data/texts';
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
import type { RoomDef } from './game/room';
import { generateAnswers } from './game/seeded';
import { formatTime } from './game/timer';
import { World } from './game/world';
import { GameView } from './render/game-view';
import type { SaveStore } from './save/storage';
import { DebugOverlay } from './ui/debug-overlay';
import { el } from './ui/dom';
import type { DebugParams } from './validation/url-params';

export interface BootOptions {
  seed: number;
  debug: DebugParams;
  store: SaveStore;
  /** Crea una semilla nueva para cada partida (con crypto.getRandomValues). */
  newSeed: () => number;
}

/** Espera entre abrir la puerta de salida y mostrar el resultado, para ver cómo se abre. */
const FINISH_DELAY_MS = 1200;

export class App implements UiController {
  private readonly root: HTMLElement;
  private readonly store: SaveStore;
  private readonly options: BootOptions;
  /** Sala en juego, semilla y guardado de la partida y de las marcas. */
  private readonly progress: Progress;
  private settings: Settings;
  /** Partida con ayudas de depuración: no guarda marcas ni partida en curso. */
  readonly withAids: boolean;
  private readonly input = new InputState();
  private readonly loop = new FixedStepLoop(LOOP.stepSeconds, LOOP.maxFrameSeconds);
  private readonly audio = new AudioEngine();
  private world!: World;
  private mode: ModeState = INITIAL_MODE;
  private view!: GameView;
  private ui!: GameUi;
  private screens!: ScreenFlow;
  private debugOverlay: DebugOverlay | null = null;
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
    this.progress = new Progress(
      options.store,
      this.withAids,
      options.debug.room ?? 0,
      options.seed,
    );
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
    // Si el navegador no deja guardar (bloqueado o lleno), se avisa una vez y se juega igual.
    this.store.onWriteFailure = (): void => {
      this.ui.hud.showToast(TEXTS.errors.saveUnavailable, 6000);
    };
    // Sala de fondo del menú; no toca la partida guardada hasta que se elija jugar.
    this.newGame(this.progress.seed);
    this.applySettings();
    this.ui.menus.setSettings(this.settings);
    if (this.progress.dropInvalidSaved()) this.ui.menus.setStartNotice(TEXTS.start.restoreFailed);
    this.progress.refreshMenus(this.ui.menus);
    // Al cerrar u ocultar la pestaña se guarda el tiempo de la partida en curso.
    window.addEventListener('pagehide', () => {
      this.saveNow();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    });
    // El audio solo se crea tras un gesto del jugador (tecla, clic o toque).
    const unlockAudio = (): void => {
      this.audio.unlock();
    };
    window.addEventListener('keydown', unlockAudio, { capture: true });
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    this.view.render(this.world.player, 1);
    this.screens.render(this.mode, null, this.world);
    requestAnimationFrame(this.frame);
  }

  private buildUi(stage: HTMLElement): void {
    const host = {
      world: (): World => this.world,
      room: (): RoomDef => this.room,
      mode: (): Mode => this.mode.mode,
      settings: (): Settings => this.settings,
      dispatch: (event: ModeEvent): void => {
        this.dispatch(event);
      },
      onExitOpened: (): void => {
        this.scheduleFinish();
      },
    };
    this.ui = buildGameUi(stage, this.view, this.input, this.room.items, this, host, this.audio);
    this.screens = new ScreenFlow(this.root, this.ui, {
      view: this.view,
      input: this.input,
      loop: this.loop,
      play: this.ui.play,
    });
    if (this.debugOverlay) stage.appendChild(this.debugOverlay.root);
    this.view.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.dispatch('focusLost');
      this.ui.hud.showToast(TEXTS.errors.contextLost, 6000);
    });
    // Al recuperar los gráficos se reconstruye la sala (texturas y sombras) y se sigue en pausa.
    this.view.canvas.addEventListener('webglcontextrestored', () => {
      this.view.rebuild(this.world.state, this.settings.quality);
      this.ui.hud.showToast(TEXTS.errors.contextRestored, 5000);
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

  private get room(): RoomDef {
    return this.progress.room;
  }

  // ---------- Salas y partidas ----------

  /** Sala elegida en la selección. Si hay una partida guardada, se pide confirmar antes. */
  chooseRoom(index: number): void {
    if (!this.progress.isUnlocked(index)) return;
    const saved = this.progress.savedRoomName();
    if (saved === null) {
      this.startRoom(index);
      return;
    }
    this.ui.menus.confirm(TEXTS.confirm.replaceSaved(saved), 'rooms', () => {
      this.startRoom(index);
    });
  }

  /** Empieza una sala desde cero (con una semilla nueva). */
  private startRoom(index: number): void {
    this.progress.begin(index, this.nextSeed());
    this.newGame(this.progress.seed);
    this.ui.menus.setStartNotice(null);
    this.dispatch('start');
  }

  /** «Continuar»: repite la partida guardada; si no es válida, se descarta y se avisa. */
  continueGame(): void {
    const restored = this.progress.restore();
    if (restored === null) {
      this.ui.menus.setStartNotice(TEXTS.start.restoreFailed);
      this.progress.refreshMenus(this.ui.menus);
      this.ui.menus.show('start');
      return;
    }
    this.ui.menus.setStartNotice(null);
    this.loadWorld(restored.world, restored.seed);
    this.dispatch('start');
  }

  /** «Repetir»: la misma sala con otra semilla. */
  replay(): void {
    this.startRoom(this.progress.roomIndex);
  }

  nextRoom(): void {
    if (this.progress.hasNext()) this.startRoom(this.progress.roomIndex + 1);
  }

  /** Pausa: «Reiniciar sala» ya confirmado. */
  restartRoom(): void {
    this.dispatch('home');
    this.startRoom(this.progress.roomIndex);
  }

  /** Vuelve a la selección de salas; la partida en curso queda guardada para continuarla. */
  goRooms(): void {
    this.saveNow();
    this.progress.refreshMenus(this.ui.menus);
    this.screens.showRoomsNext();
    this.dispatch('home');
  }

  /** «Borrar datos guardados» ya confirmado (solo desde el inicio). */
  clearData(): void {
    this.progress.clearData();
    this.progress.refreshMenus(this.ui.menus);
    this.ui.menus.setStartNotice(TEXTS.settings.cleared);
  }

  private saveNow(): void {
    const mode = this.mode.mode;
    if (mode !== 'title' && mode !== 'finished') this.progress.saveNow(this.world);
  }

  private nextSeed(): number {
    // Con una semilla fija de depuración, cada partida la conserva para poder reproducir.
    return this.options.debug.seed ?? this.options.newSeed();
  }

  /** Partida nueva en la sala actual: estado, jugador y vista desde cero. */
  private newGame(seed: number): void {
    this.loadWorld(new World(this.room, generateAnswers(this.room, seed)), seed);
  }

  /** Pone en juego un mundo (nuevo o recuperado) y reconstruye la vista de su sala. */
  private loadWorld(world: World, seed: number): void {
    window.clearTimeout(this.finishTimer);
    this.finishTimer = undefined;
    this.world = world;
    this.tutorialDone = false;
    this.ui.play.reset();
    this.ui.panels.reset(this.room.items);
    this.ui.hintPanel.hide();
    this.ui.inventoryBar.setItems(this.room.items);
    this.debugOverlay?.setSeed(seed);
    this.view.load(this.room, world.state.answers, world.state, this.settings.quality);
    this.updateAmbient();
  }

  /** Ambiente de la sala mientras corre el reloj (no en menús ni en pausa). */
  private updateAmbient(): void {
    this.audio.setAmbient(isClockRunning(this.mode.mode) ? this.progress.roomIndex : null);
  }

  toggleMute(): void {
    this.updateSettings({ ...this.settings, muted: !this.settings.muted });
    this.ui.menus.setSettings(this.settings);
    this.ui.hud.showToast(this.settings.muted ? TEXTS.hud.mutedOn : TEXTS.hud.mutedOff, 1500);
  }

  private scheduleFinish(): void {
    if (this.finishTimer !== undefined) return;
    this.finishTimer = window.setTimeout(() => {
      this.finishTimer = undefined;
      const newRecord = this.progress.finish(this.world);
      this.ui.menus.setResult(
        TEXTS.rooms[this.room.titleKey].result,
        formatTime(this.world.timer.steps, LOOP.stepSeconds),
        this.world.state.hints.used,
        this.withAids,
        newRecord,
        this.progress.hasNext(),
      );
      this.progress.refreshMenus(this.ui.menus);
      this.dispatch('finish');
    }, FINISH_DELAY_MS);
  }

  // ---------- Bucle ----------

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
      this.progress.maybeSave(this.world);
    }
    for (const signal of this.world.drainSignals()) this.audio.play(signal.sound);
    if (mode === 'playing') {
      this.ui.play.updateFocus(this.world.pick(this.world.viewRayFromPlayer())?.id ?? null);
    }
    this.view.sync(this.world.state);
    this.updateHud();
    this.view.update(dt);
    const calls = this.view.render(this.world.player, alpha);
    const p = this.world.player;
    this.debugOverlay?.setPose(p.x, p.z, p.yaw, p.pitch);
    this.debugOverlay?.update(dt, calls, this.view.resources());
  }

  private updateHud(): void {
    const state = this.world.state;
    this.ui.hud.setTime(formatTime(this.world.timer.steps, LOOP.stepSeconds));
    this.ui.play.checkCombining();
    this.ui.inventoryBar.update(
      state.inventory.items,
      state.inventory.selected,
      this.ui.play.combining,
    );
    const target = this.room.tutorialTarget;
    if (target !== undefined && state.isOpen(target)) this.tutorialDone = true;
    const showHint = target !== undefined && !this.tutorialDone && this.mode.mode === 'playing';
    this.ui.hud.setHint(showHint ? TEXTS.messages.tutorial : null);
  }

  // ---------- Entrada ----------

  onAction(action: ActionIntent): void {
    const mode = this.mode.mode;
    switch (action) {
      case 'interact':
        if (mode === 'playing') this.ui.play.interactWithFocus();
        else if (mode === 'inspecting') this.endInspect();
        break;
      case 'pause':
        if (mode !== 'title' && mode !== 'finished') this.dispatch('togglePause');
        break;
      case 'combine':
        if (mode === 'playing') this.ui.play.toggleCombine();
        break;
      case 'hint':
        this.ui.play.requestHint();
        break;
      case 'back':
        if (mode === 'playing' && this.ui.play.back()) break;
        if (mode === 'inspecting') this.endInspect();
        else if (mode === 'panel' && this.ui.hintPanel.isOpen) this.ui.hintPanel.close();
        else if (mode === 'panel') this.ui.panels.close();
        else if (mode === 'playing') this.dispatch('pause');
        else if (this.ui.menus.back()) break;
        else if (mode === 'paused') this.dispatch('resume');
        break;
      case 'mute':
        this.toggleMute();
        break;
    }
  }

  endInspect(): void {
    this.view.inspect.close(this.settings.reduceMotion);
    this.dispatch('endInspect');
  }

  onTap(clientX: number, clientY: number): void {
    if (this.mode.mode !== 'playing') return;
    const hit = this.world.pick(this.world.rayToward(this.view.directionAt(clientX, clientY)));
    if (hit) this.ui.play.interactWith(hit.id);
  }

  onPointerLockChange(locked: boolean): void {
    // Perder la captura durante la exploración (Esc del navegador) pausa el juego.
    if (this.screens.lockLostByPlayer(locked) && this.mode.mode === 'playing') {
      this.dispatch('focusLost', { lockLost: true });
    }
  }

  enableTouch(): void {
    if (this.screens.enableTouch()) this.screens.render(this.mode, null, this.world);
  }

  // ---------- Modos y pantallas ----------

  dispatch(event: ModeEvent, options: { lockLost?: boolean } = {}): void {
    const previous = this.mode;
    this.mode = nextMode(this.mode, event);
    if (this.mode === previous) return;
    if (this.mode.mode === 'paused') this.saveNow();
    this.screens.render(this.mode, previous, this.world, options);
    this.updateAmbient();
  }

  // ---------- Ajustes y errores ----------

  updateSettings(values: Settings): void {
    const previousQuality = this.settings.quality;
    this.store.saveSettings(values);
    this.settings = this.store.getSettings();
    this.applySettings();
    // Cambiar la calidad reconstruye la sala (tamaño de texturas y sombras).
    if (this.settings.quality !== previousQuality) {
      this.ui.play.clearFocus();
      this.view.rebuild(this.world.state, this.settings.quality);
    }
  }

  private applySettings(): void {
    this.view.applySettings(this.settings.fov, this.settings.quality);
    this.root.classList.toggle('reduce-motion', this.settings.reduceMotion);
    this.ui.hud.setTimerVisible(this.settings.showTimer);
    this.audio.setVolume(this.settings.volume, this.settings.muted);
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
