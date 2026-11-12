/**
 * Mundo de juego: reúne la sala, el jugador y los objetos, y declara en un solo lugar el
 * orden de los sistemas de cada paso de lógica.
 */
import type { Axes, InputState } from '../core/input';
import { lookDirection, type Vec3 } from '../core/math';
import { INTERACTION, PLAYER } from '../data/config';
import type { Rect } from './collision';
import { pickInteractable, type PickResult, type PickTarget, type Ray } from './interaction';
import { createObjectStates, interact, type InteractionOutcome, type ObjectState } from './objects';
import { createPlayer, stepPlayer, type PlayerState } from './player';
import { interactableBox, roomColliders, roomOccluders, type Aabb, type RoomDef } from './room';

const TUNING = { radius: PLAYER.radius, walkSpeed: PLAYER.walkSpeed, maxPitch: PLAYER.maxPitch };

export class World {
  readonly room: RoomDef;
  readonly player: PlayerState;
  readonly objects: Map<string, ObjectState>;
  /** Pasos de lógica ejecutados (base del cronómetro futuro). */
  steps = 0;
  private readonly colliders: Rect[];
  private readonly occluders: Aabb[];
  private targets: PickTarget[] = [];
  private readonly move: Axes = { x: 0, z: 0 };
  private readonly viewRay: Ray = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } };

  constructor(room: RoomDef) {
    this.room = room;
    this.player = createPlayer(room.spawn);
    this.objects = createObjectStates(room);
    this.colliders = roomColliders(room);
    this.occluders = roomOccluders(room);
    this.refreshTargets();
  }

  /** Un paso de lógica. Orden: 1) movimiento del jugador. (Puzzles y cronómetro, en hitos futuros.) */
  step(input: InputState, dt: number): void {
    input.moveAxes(this.move);
    stepPlayer(this.player, this.move, dt, this.colliders, TUNING);
    this.steps += 1;
  }

  /** Rayo desde los ojos en la dirección de la mirada (la retícula). */
  viewRayFromPlayer(): Ray {
    this.viewRay.origin.x = this.player.x;
    this.viewRay.origin.y = PLAYER.eyeHeight;
    this.viewRay.origin.z = this.player.z;
    lookDirection(this.player.yaw, this.player.pitch, this.viewRay.dir);
    return this.viewRay;
  }

  /** Objeto que señala un rayo (de la retícula o de un toque), o null. */
  pick(ray: Ray): PickResult | null {
    return pickInteractable(ray, this.targets, this.occluders, INTERACTION.reach);
  }

  /** Rayo desde los ojos hacia una dirección dada (toque en pantalla). */
  rayToward(dir: Vec3): Ray {
    return { origin: { x: this.player.x, y: PLAYER.eyeHeight, z: this.player.z }, dir };
  }

  interactWith(id: string): InteractionOutcome {
    const outcome = interact(this.room, this.objects, id);
    if (outcome.kind === 'toggled') this.refreshTargets();
    return outcome;
  }

  private refreshTargets(): void {
    this.targets = this.room.interactables.map((def) => ({
      id: def.id,
      box: interactableBox(def, this.objects.get(def.id)?.open === true),
    }));
  }
}
