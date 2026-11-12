/**
 * Mundo de juego: reúne la sala, el jugador, el estado de la partida y el cronómetro, y
 * declara en un solo lugar el orden de los sistemas de cada paso de lógica.
 */
import type { Axes, InputState } from '../core/input';
import { lookDirection, type Vec3 } from '../core/math';
import { INTERACTION, PLAYER } from '../data/config';
import type { Rect } from './collision';
import { GameState, type CombineResult, type Outcome } from './game-state';
import { pickInteractable, type PickResult, type PickTarget, type Ray } from './interaction';
import type { PlaceResult } from './puzzles/placement';
import type { PressResult } from './puzzles/sequence';
import { createPlayer, stepPlayer, type PlayerState } from './player';
import { interactableBox, roomColliders, roomOccluders, type Aabb, type RoomDef } from './room';
import type { RoomAnswers } from './seeded';
import { Timer } from './timer';

const TUNING = { radius: PLAYER.radius, walkSpeed: PLAYER.walkSpeed, maxPitch: PLAYER.maxPitch };

export class World {
  readonly room: RoomDef;
  readonly state: GameState;
  readonly player: PlayerState;
  readonly timer = new Timer();
  private readonly colliders: Rect[];
  private readonly occluders: Aabb[];
  private targets: PickTarget[] = [];
  private targetsVersion = -1;
  private readonly move: Axes = { x: 0, z: 0 };
  private readonly viewRay: Ray = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } };

  constructor(room: RoomDef, answers: RoomAnswers) {
    this.room = room;
    this.state = new GameState(room, answers);
    this.player = createPlayer(room.spawn);
    this.colliders = roomColliders(room);
    this.occluders = roomOccluders(room);
    this.refreshTargets();
  }

  /** Un paso de lógica mientras se explora. Orden: 1) movimiento del jugador. */
  step(input: InputState, dt: number): void {
    input.moveAxes(this.move);
    if (this.move.x !== 0 || this.move.z !== 0) this.timer.start();
    stepPlayer(this.player, this.move, dt, this.colliders, TUNING);
  }

  /** Un paso de reloj (lo llama el bucle en los modos en que el cronómetro avanza). */
  tickClock(): void {
    this.timer.tick();
  }

  /** Rayo desde los ojos en la dirección de la mirada (la retícula). */
  viewRayFromPlayer(): Ray {
    this.viewRay.origin.x = this.player.x;
    this.viewRay.origin.y = PLAYER.eyeHeight;
    this.viewRay.origin.z = this.player.z;
    lookDirection(this.player.yaw, this.player.pitch, this.viewRay.dir);
    return this.viewRay;
  }

  /** Objeto visible que señala un rayo (de la retícula o de un toque), o null. */
  pick(ray: Ray): PickResult | null {
    this.refreshTargets();
    return pickInteractable(ray, this.targets, this.occluders, INTERACTION.reach);
  }

  /** Rayo desde los ojos hacia una dirección dada (toque en pantalla). */
  rayToward(dir: Vec3): Ray {
    return { origin: { x: this.player.x, y: PLAYER.eyeHeight, z: this.player.z }, dir };
  }

  interact(id: string): Outcome {
    this.timer.start();
    const outcome = this.state.interact(id, this.state.inventory.selectedItem);
    this.afterChange();
    return outcome;
  }

  tryCode(puzzle: string, code: readonly number[]): boolean {
    this.timer.start();
    const ok = this.state.tryCode(puzzle, code);
    this.afterChange();
    return ok;
  }

  place(puzzle: string, slot: number, item: string): PlaceResult {
    this.timer.start();
    const result = this.state.place(puzzle, slot, item);
    this.afterChange();
    return result;
  }

  pressSwitch(puzzle: string, index: number): PressResult {
    this.timer.start();
    const result = this.state.pressSwitch(puzzle, index);
    this.afterChange();
    return result;
  }

  combine(a: string, b: string): CombineResult {
    this.timer.start();
    const result = this.state.combine(a, b);
    this.afterChange();
    return result;
  }

  private afterChange(): void {
    if (this.state.finished) this.timer.stop();
    this.refreshTargets();
  }

  /** Recalcula las cajas de selección si cambió algo (aperturas, objetos recogidos). */
  private refreshTargets(): void {
    if (this.targetsVersion === this.state.version) return;
    this.targetsVersion = this.state.version;
    this.targets = this.state.visibleIds().flatMap((id) => {
      const def = this.state.def(id);
      return def ? [{ id, box: interactableBox(def, this.state.isOpen(id)) }] : [];
    });
  }
}
