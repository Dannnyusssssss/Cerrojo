/**
 * Controlador de la aplicación: une la lógica (game/), el render (render/) y la interfaz (ui/),
 * y ejecuta el bucle principal. No contiene reglas de juego: las aplica World y mode.ts.
 */
import { Raycaster, Vector2 } from 'three';
import { errorKindOf, logError, type ErrorKind } from './core/errors';
import { InputState, type ActionIntent, type Axes } from './core/input';
import { FixedStepLoop } from './core/loop';
import { INSPECT, LOOP, PLAYER, type Settings } from './data/config';
import { TEST_ROOM } from './data/rooms/test-room';
import { TEXTS } from './data/texts';
import { actionLabel } from './game/objects';
import { turnPlayer } from './game/player';
import {
  INITIAL_MODE,
  isWorldRunning,
  nextMode,
  type ModeEvent,
  type ModeState,
} from './game/mode';
import { World } from './game/world';
import { applyCamera } from './render/camera-rig';
import { Highlighter } from './render/highlight';
import { InspectView } from './render/inspect-view';
import { RoomView } from './render/room-view';
import { SceneView } from './render/scene';
import type { SaveStore } from './save/storage';
import { DebugOverlay } from './ui/debug-overlay';
import { el } from './ui/dom';
import { Hud } from './ui/hud';
import { InputBinding } from './ui/input-binding';
import { Menus } from './ui/menus';
import { TouchControls } from './ui/touch-controls';
import type { DebugParams } from './validation/url-params';

export interface BootOptions {
  seed: number;
  debug: DebugParams;
  store: SaveStore;
}

export class App {
  private readonly root: HTMLElement;
  private readonly store: SaveStore;
  private settings: Settings;
  /** Partida con ayudas de depuración: no guardará marcas (desde el Hito 3). */
  readonly withAids: boolean;
  readonly seed: number;
  private readonly input = new InputState();
  private readonly loop = new FixedStepLoop(LOOP.stepSeconds, LOOP.maxFrameSeconds);
  private readonly world = new World(TEST_ROOM);
  private mode: ModeState = INITIAL_MODE;
  private view!: SceneView;
  private roomView!: RoomView;
  private highlighter = new Highlighter();
  private readonly inspectView = new InspectView();
  private hud!: Hud;
  private menus!: Menus;
  private touch!: TouchControls;
  private binding!: InputBinding;
  private debugOverlay: DebugOverlay | null = null;
  private focusId: string | null = null;
  private touchMode = false;
  private expectingUnlock = false;
  private saveWarned = false;
  private lastTime = 0;
  private stopped = false;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly turn: Axes = { x: 0, z: 0 };
  private readonly look = { yaw: 0, pitch: 0 };

  constructor(root: HTMLElement, options: BootOptions) {
    this.root = root;
    this.store = options.store;
    this.settings = options.store.getSettings();
    this.seed = options.seed;
    this.withAids = options.debug.debug;
    if (options.debug.debug) this.debugOverlay = new DebugOverlay(options.seed);
  }

  /** Construye la interfaz y arranca el bucle. Si falla (sin WebGL), muestra un mensaje claro. */
  start(): void {
    const stage = el('div', { className: 'stage' });
    this.root.appendChild(stage);
    try {
      this.view = new SceneView(stage, this.settings.quality, this.settings.fov);
    } catch (error) {
      logError('render.init', error);
      this.showFatal(errorKindOf(error));
      return;
    }
    this.buildRoomView();
    this.hud = new Hud(() => {
      this.endInspect();
    });
    this.menus = new Menus({
      onPlay: () => {
        this.dispatch('start');
      },
      onResume: () => {
        this.dispatch('resume');
      },
      onSettingsChange: (values) => {
        this.updateSettings(values);
      },
    });
    this.touch = new TouchControls({
      onStick: (x, z) => {
        this.input.setStick(x, z);
      },
      onPause: () => {
        this.dispatch('pause');
      },
      onInteract: () => {
        this.onAction('interact');
      },
    });
    stage.append(this.hud.root, this.touch.root, this.menus.root);
    if (this.debugOverlay) stage.appendChild(this.debugOverlay.root);
    this.binding = new InputBinding(this.input, this.view.canvas, {
      inGame: () => this.mode.mode === 'playing' || this.mode.mode === 'inspecting',
      exploring: () => this.mode.mode === 'playing',
      inspecting: () => this.mode.mode === 'inspecting',
      settings: () => this.settings,
      onAction: (action) => {
        this.onAction(action);
      },
      onTap: (x, y) => {
        this.onTap(x, y);
      },
      onUnlockedClick: () => {
        this.binding.requestPointerLock();
      },
      onInspectDrag: (dx, dy) => {
        this.inspectView.rotate(dx * INSPECT.dragRadiansPerPixel, dy * INSPECT.dragRadiansPerPixel);
      },
      onPointerLockChange: (locked) => {
        this.onPointerLockChange(locked);
      },
      onTouchDetected: () => {
        this.enableTouch();
      },
      onFocusLost: () => {
        this.dispatch('focusLost');
      },
    });
    this.view.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.dispatch('focusLost');
      this.hud.showToast(TEXTS.errors.contextLost, 6000);
    });
    this.applySettings();
    this.menus.setSettings(this.settings);
    this.render(0, 1);
    this.renderMode(null);
    requestAnimationFrame(this.frame);
  }

  private buildRoomView(): void {
    this.roomView = new RoomView(TEST_ROOM, this.settings.quality);
    for (const [id, state] of this.world.objects)
      this.roomView.props.get(id)?.setOpen(state.open, true);
    this.view.scene.add(this.roomView.group);
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
    const sens = this.settings.sensitivity;
    if (isWorldRunning(this.mode.mode)) {
      // El giro se aplica en cada frame de render para que no haya retraso perceptible.
      this.input.consumeLook(this.look);
      turnPlayer(this.world.player, this.look.yaw, this.look.pitch, PLAYER.maxPitch);
      this.input.turnAxes(this.turn);
      const keyTurn = PLAYER.keyTurnSpeed * sens * dt;
      turnPlayer(this.world.player, this.turn.x * keyTurn, this.turn.z * keyTurn, PLAYER.maxPitch);
      const advance = this.loop.advance(dt);
      for (let i = 0; i < advance.steps; i++) this.world.step(this.input, this.loop.stepSeconds);
      alpha = advance.alpha;
      this.updateFocus(this.world.pick(this.world.viewRayFromPlayer())?.id ?? null);
    } else {
      this.input.consumeLook(this.look);
      if (this.mode.mode === 'inspecting') {
        this.input.turnAxes(this.turn);
        const speed = INSPECT.keyRotateSpeed * dt;
        this.inspectView.rotate(-this.turn.x * speed, -this.turn.z * speed);
      }
    }
    this.roomView.update(dt);
    this.inspectView.update(dt);
    this.render(dt, alpha);
  }

  private render(dt: number, alpha: number): void {
    applyCamera(this.view.camera, this.world.player, alpha, PLAYER.eyeHeight);
    this.view.renderer.render(this.view.scene, this.view.camera);
    const calls = this.view.renderer.info.render.calls;
    this.inspectView.render(this.view.renderer, this.view.camera.aspect);
    this.debugOverlay?.update(dt, calls);
  }

  private updateFocus(id: string | null): void {
    if (id === this.focusId) return;
    this.focusId = id;
    const prop = id === null ? null : (this.roomView.props.get(id) ?? null);
    this.highlighter.show(prop);
    if (prop === null) {
      this.hud.setFocus(null, null);
      return;
    }
    const label = actionLabel(prop.def, this.world.objects.get(prop.def.id));
    this.hud.setFocus(TEXTS.objects[prop.def.nameKey], TEXTS.actions[label]);
  }

  private refreshFocusLabel(): void {
    const id = this.focusId;
    this.focusId = null;
    this.updateFocus(id);
  }

  private onAction(action: ActionIntent): void {
    const mode = this.mode.mode;
    switch (action) {
      case 'interact':
        if (mode === 'playing' && this.focusId !== null) this.interactWith(this.focusId);
        else if (mode === 'inspecting') this.endInspect();
        break;
      case 'pause':
        if (mode !== 'title') this.dispatch('togglePause');
        break;
      case 'back':
        if (mode === 'inspecting') this.endInspect();
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

  private interactWith(id: string): void {
    const outcome = this.world.interactWith(id);
    if (outcome.kind === 'toggled') {
      this.roomView.props.get(id)?.setOpen(outcome.open, this.settings.reduceMotion);
      this.refreshFocusLabel();
    } else if (outcome.kind === 'inspect') {
      const prop = this.roomView.props.get(id);
      if (!prop) return;
      this.dispatch('inspect');
      this.inspectView.open(prop, this.settings.reduceMotion);
    }
  }

  private endInspect(): void {
    this.inspectView.close(this.settings.reduceMotion);
    this.dispatch('endInspect');
  }

  private onTap(clientX: number, clientY: number): void {
    if (this.mode.mode !== 'playing') return;
    const rect = this.view.canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.view.camera);
    const d = this.raycaster.ray.direction;
    const hit = this.world.pick(this.world.rayToward({ x: d.x, y: d.y, z: d.z }));
    if (hit) this.interactWith(hit.id);
  }

  private onPointerLockChange(locked: boolean): void {
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

  private enableTouch(): void {
    if (this.touchMode) return;
    this.touchMode = true;
    this.root.classList.add('touch-mode');
    this.renderMode(null);
  }

  private dispatch(event: ModeEvent, options: { lockLost?: boolean } = {}): void {
    const previous = this.mode;
    this.mode = nextMode(this.mode, event);
    if (this.mode !== previous) this.renderMode(previous, options);
  }

  /** Muestra la interfaz que corresponde al modo actual. */
  private renderMode(previous: ModeState | null, options: { lockLost?: boolean } = {}): void {
    const mode = this.mode.mode;
    const inGame = mode === 'playing' || mode === 'inspecting';
    this.hud.setVisible(inGame);
    this.touch.setVisible(this.touchMode && mode === 'playing');
    this.hud.setInspecting(mode === 'inspecting');
    if (mode !== 'playing') {
      this.updateFocus(null);
      this.input.releaseAll();
    }
    switch (mode) {
      case 'title':
        this.menus.show('start');
        break;
      case 'paused':
        this.releaseLock();
        if (this.mode.resumeTo === 'playing') this.inspectView.close(true);
        this.menus.show('pause', options);
        break;
      case 'inspecting':
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

  private updateSettings(values: Settings): void {
    const previousQuality = this.settings.quality;
    const saved = this.store.saveSettings(values);
    this.settings = this.store.getSettings();
    if (!saved && !this.saveWarned) {
      this.saveWarned = true;
      this.hud.showToast(TEXTS.errors.saveUnavailable, 5000);
    }
    this.applySettings();
    if (this.settings.quality !== previousQuality) this.rebuildRoomView();
  }

  private applySettings(): void {
    this.view.setFov(this.settings.fov);
    this.view.setQuality(this.settings.quality);
    this.root.classList.toggle('reduce-motion', this.settings.reduceMotion);
  }

  /** Cambiar la calidad reconstruye la sala (tamaño de texturas y sombras). */
  private rebuildRoomView(): void {
    this.highlighter.dispose();
    this.highlighter = new Highlighter();
    this.focusId = null;
    this.roomView.dispose();
    this.buildRoomView();
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
