/**
 * Construcción de la interfaz del juego y conexión de sus eventos con el controlador (App).
 * Aquí solo se crean piezas y se enlazan llamadas; las decisiones las toma el controlador.
 */
import type { ActionIntent, InputState } from './core/input';
import { INSPECT, type Settings } from './data/config';
import type { Mode, ModeEvent } from './game/mode';
import type { ItemDef } from './game/room';
import type { World } from './game/world';
import type { GameView } from './render/game-view';
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
  selectSlot(index: number): void;
  endInspect(): void;
  play(): void;
  replay(): void;
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
  binding: InputBinding;
}

export function buildGameUi(
  stage: HTMLElement,
  view: GameView,
  input: InputState,
  items: readonly ItemDef[],
  app: UiController,
): GameUi {
  const hud = new Hud(() => {
    app.endInspect();
  });
  const menus = new Menus({
    onPlay: () => {
      app.play();
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
    onHome: () => {
      app.dispatch('home');
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
  });
  const inventoryBar = new InventoryBar(items, (index) => {
    app.selectSlot(index);
  });
  const panels = new PuzzlePanels(
    () => app.currentWorld,
    items,
    () => {
      app.dispatch('closePanel');
    },
  );
  stage.append(hud.root, inventoryBar.root, touch.root, panels.root, menus.root);
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
    onTouchDetected: () => {
      app.enableTouch();
    },
    onFocusLost: () => {
      app.dispatch('focusLost');
    },
    slotsActive: () => app.currentMode === 'playing',
    onSlot: (index) => {
      app.selectSlot(index);
    },
  });
  return { hud, menus, touch, inventoryBar, panels, binding };
}
