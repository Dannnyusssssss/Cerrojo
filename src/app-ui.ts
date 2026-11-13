/**
 * Construcción de la interfaz del juego y conexión de sus eventos con el controlador (App) y
 * con las acciones dentro de la sala (PlayActions). Aquí solo se crean piezas y se enlazan
 * llamadas; las decisiones las toman el controlador y la lógica.
 */
import { PlayActions, type PlayHost } from './app-play';
import type { AudioEngine } from './audio/engine';
import { WHEEL_SIGNAL } from './game/signals';
import type { ActionIntent, InputState } from './core/input';
import { INSPECT, type Settings } from './data/config';
import { TEXTS } from './data/texts';
import type { Mode, ModeEvent } from './game/mode';
import type { ItemDef } from './game/room';
import type { World } from './game/world';
import type { GameView } from './render/game-view';
import { HintPanel } from './ui/hint-panel';
import { Hud } from './ui/hud';
import { InputBinding } from './ui/input-binding';
import { InventoryBar } from './ui/inventory-bar';
import { Menus } from './ui/menus';
import { PuzzlePanels } from './ui/puzzle-panels';
import { TouchControls } from './ui/touch-controls';

/** Lo que la interfaz necesita del controlador. */
export interface UiController {
  readonly currentMode: Mode;
  readonly currentSettings: Settings;
  readonly currentWorld: World;
  dispatch(event: ModeEvent): void;
  onAction(action: ActionIntent): void;
  onTap(clientX: number, clientY: number): void;
  endInspect(): void;
  chooseRoom(index: number): void;
  continueGame(): void;
  replay(): void;
  nextRoom(): void;
  restartRoom(): void;
  /** Pausa: silenciar o activar el sonido (como la tecla M). */
  toggleMute(): void;
  goRooms(): void;
  clearData(): void;
  updateSettings(values: Settings): void;
  onPointerLockChange(locked: boolean): void;
  enableTouch(): void;
}

export interface GameUi {
  hud: Hud;
  menus: Menus;
  touch: TouchControls;
  inventoryBar: InventoryBar;
  panels: PuzzlePanels;
  hintPanel: HintPanel;
  binding: InputBinding;
  play: PlayActions;
}

export function buildGameUi(
  stage: HTMLElement,
  view: GameView,
  input: InputState,
  items: readonly ItemDef[],
  app: UiController,
  host: PlayHost,
  audio: AudioEngine,
): GameUi {
  // Se crean antes que los paneles que las usan; se conectan al final.
  let play: PlayActions | null = null;
  const withPlay = (action: (p: PlayActions) => void): void => {
    if (play) action(play);
  };
  const hud = new Hud(() => {
    app.endInspect();
  });
  const menus = new Menus({
    onContinue: () => {
      app.continueGame();
    },
    onChooseRoom: (index) => {
      app.chooseRoom(index);
    },
    onNextRoom: () => {
      app.nextRoom();
    },
    onRooms: () => {
      app.goRooms();
    },
    onRestart: () => {
      app.restartRoom();
    },
    onToggleMute: () => {
      app.toggleMute();
    },
    onClearData: () => {
      app.clearData();
    },
    onResume: () => {
      app.dispatch('resume');
    },
    onSettingsChange: (values) => {
      app.updateSettings(values);
    },
    onReplay: () => {
      app.replay();
    },
  });
  const touch = new TouchControls({
    onStick: (x, z) => {
      input.setStick(x, z);
    },
    onPause: () => {
      app.dispatch('pause');
    },
    onInteract: () => {
      app.onAction('interact');
    },
    onHint: () => {
      withPlay((p) => {
        p.requestHint();
      });
    },
  });
  const inventoryBar = new InventoryBar(
    items,
    (index) => {
      withPlay((p) => {
        p.selectSlot(index);
      });
    },
    () => {
      withPlay((p) => {
        p.toggleCombine();
      });
    },
  );
  const panels = new PuzzlePanels(
    () => app.currentWorld,
    items,
    () => {
      app.dispatch('closePanel');
    },
    () => {
      audio.play(WHEEL_SIGNAL.sound);
    },
  );
  const hintPanel = new HintPanel({
    view: () => play?.hintView() ?? { texts: [], next: null, none: true },
    reveal: () => {
      withPlay((p) => {
        p.revealHint();
      });
    },
    onClose: () => {
      app.dispatch('closePanel');
    },
  });
  stage.append(hud.root, inventoryBar.root, touch.root, panels.root, hintPanel.root, menus.root);
  // Se vio un toque: a partir de ahí no se avisa de la captura del puntero.
  let touchSeen = false;
  const binding = new InputBinding(input, view.canvas, {
    inGame: () => app.currentMode === 'playing' || app.currentMode === 'inspecting',
    exploring: () => app.currentMode === 'playing',
    inspecting: () => app.currentMode === 'inspecting',
    settings: () => app.currentSettings,
    onAction: (action) => {
      app.onAction(action);
    },
    onTap: (x, y) => {
      app.onTap(x, y);
    },
    onUnlockedClick: () => {
      binding.requestPointerLock();
    },
    onInspectDrag: (dx, dy) => {
      view.inspect.rotate(dx * INSPECT.dragRadiansPerPixel, dy * INSPECT.dragRadiansPerPixel);
    },
    onPointerLockChange: (locked) => {
      app.onPointerLockChange(locked);
    },
    onPointerLockError: () => {
      // Solo importa explorando con ratón: en menús y paneles se usa el cursor libre, y en
      // táctil no hay captura que pedir.
      if (app.currentMode === 'playing' && !touchSeen) {
        hud.showToast(TEXTS.errors.pointerLock, 5000);
      }
    },
    onTouchDetected: () => {
      touchSeen = true;
      app.enableTouch();
    },
    onFocusLost: () => {
      app.dispatch('focusLost');
    },
    slotsActive: () => app.currentMode === 'playing',
    onSlot: (index) => {
      withPlay((p) => {
        p.selectSlot(index);
      });
    },
  });
  play = new PlayActions(host, { hud, view, panels, hintPanel });
  return { hud, menus, touch, inventoryBar, panels, hintPanel, binding, play };
}
