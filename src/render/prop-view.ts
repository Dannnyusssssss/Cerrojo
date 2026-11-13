/**
 * Vista de un objeto interactuable: raíz colocada en el mundo, parte visual, animación de
 * apertura y huecos. El estado lo decide la lógica (GameState); aquí solo se refleja.
 */
import { Group } from 'three';
import type { InteractableDef, RoomDef } from '../game/room';
import type { RoomAnswers } from '../game/seeded';
import type { TextureFactory } from './textures';

const OPEN_SPEED = 4; // fracciones de apertura por segundo

export class PropView {
  readonly def: InteractableDef;
  /** Raíz colocada en el mundo. */
  readonly root = new Group();
  /** Parte visual (lo que se clona para examinar y lo que se resalta). */
  readonly body: Group;
  private readonly applyOpen: (t: number) => void;
  private readonly applySlots: ((filled: readonly boolean[]) => void) | undefined;
  private progress = 0;
  private target = 0;

  constructor(
    def: InteractableDef,
    body: Group,
    applyOpen: (t: number) => void,
    applySlots?: (filled: readonly boolean[]) => void,
  ) {
    this.def = def;
    this.body = body;
    this.applyOpen = applyOpen;
    this.applySlots = applySlots;
    this.root.position.set(def.position.x, def.position.y, def.position.z);
    this.root.rotation.y = def.rotationY ?? 0;
    this.root.add(body);
  }

  setOpen(open: boolean, instant: boolean): void {
    this.target = open ? 1 : 0;
    if (instant) {
      this.progress = this.target;
      this.applyOpen(this.progress);
    }
  }

  /** Muestra qué huecos están ocupados (solo el panel de huecos lo usa). */
  setSlots(filled: readonly boolean[]): void {
    this.applySlots?.(filled);
  }

  /**
   * Si se define, el objeto no desaparece al quedar oculto para la lógica: decide él qué
   * mostrar (la caja de luz conserva el marco y apaga la pantalla).
   */
  onVisible: ((visible: boolean) => void) | null = null;

  setVisible(visible: boolean): void {
    if (this.onVisible) {
      this.root.visible = true;
      this.onVisible(visible);
      return;
    }
    this.root.visible = visible;
  }

  /** Avanza la animación de apertura. Devuelve true si el objeto se movió en este paso. */
  update(dt: number): boolean {
    if (this.progress === this.target) return false;
    const step = OPEN_SPEED * dt;
    this.progress =
      this.target > this.progress
        ? Math.min(this.target, this.progress + step)
        : Math.max(this.target, this.progress - step);
    // Suavizado de entrada y salida.
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    this.applyOpen(t);
    return true;
  }
}

/** Lo que necesitan los constructores de objetos además de su definición. */
export interface PropContext {
  textures: TextureFactory;
  answers: RoomAnswers;
  room: RoomDef;
}
