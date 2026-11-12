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
import {
  blockerRect,
  interactableBox,
  roomColliders,
  roomOccluders,
  type Aabb,
  type InteractableDef,
  type RoomDef,
} from './room';
import type { RoomAnswers } from './seeded';
import { SessionLog } from './session';
import {
  codeSignal,
  combineSignal,
  outcomeSignal,
  placeSignal,
  pressSignal,
  STEP_DISTANCE,
  STEP_SIGNAL,
  type Signal,
} from './signals';
import { Timer } from './timer';

const TUNING = { radius: PLAYER.radius, walkSpeed: PLAYER.walkSpeed, maxPitch: PLAYER.maxPitch };

export class World {
  readonly room: RoomDef;
  readonly state: GameState;
  readonly player: PlayerState;
  readonly timer = new Timer();
  /** Acciones acertadas de la partida (para guardarla y poder continuarla). */
  readonly log: SessionLog;
  /** Obstáculos fijos (paredes, tabiques y muebles). */
  private readonly fixedColliders: Rect[];
  /** Objetos que bloquean el paso mientras están cerrados (puertas entre zonas). */
  private readonly blockers: InteractableDef[];
  /** Obstáculos de este momento: los fijos más las puertas cerradas. */
  private colliders: Rect[] = [];
  private collidersVersion = -1;
  private readonly occluders: Aabb[];
  private targets: PickTarget[] = [];
  private targetsVersion = -1;
  private readonly move: Axes = { x: 0, z: 0 };
  /** Señales pendientes de reproducir (sonido); las recoge el controlador cada frame. */
  private readonly signals: Signal[] = [];
  /** Distancia caminada desde el último paso. */
  private stride = 0;
  private readonly viewRay: Ray = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } };

  /**
   * Partida nueva, o restaurada si se pasa un estado ya repetido (`restored`) con su registro.
   */
  constructor(
    room: RoomDef,
    answers: RoomAnswers,
    restored?: { state: GameState; log: SessionLog; steps: number },
  ) {
    this.room = room;
    this.state = restored?.state ?? new GameState(room, answers);
    this.log = restored?.log ?? new SessionLog();
    if (restored) this.timer.resume(restored.steps);
    this.player = createPlayer(room.spawn);
    this.fixedColliders = roomColliders(room);
    this.blockers = room.interactables.filter((d) => d.blocks === true);
    this.refreshColliders();
    this.occluders = roomOccluders(room);
    this.refreshTargets();
  }

  /** Un paso de lógica mientras se explora. Orden: 1) movimiento del jugador. */
  step(input: InputState, dt: number): void {
    input.moveAxes(this.move);
    if (this.move.x !== 0 || this.move.z !== 0) this.timer.start();
    this.refreshColliders();
    stepPlayer(this.player, this.move, dt, this.colliders, TUNING);
    this.stride += Math.hypot(this.player.x - this.player.prevX, this.player.z - this.player.prevZ);
    if (this.stride >= STEP_DISTANCE) {
      this.stride -= STEP_DISTANCE;
      this.emit(STEP_SIGNAL);
    }
  }

  /** Entrega y vacía las señales pendientes. */
  drainSignals(): Signal[] {
    return this.signals.splice(0, this.signals.length);
  }

  private emit(signal: Signal): void {
    // Con un tope, por si nadie las recoge (pruebas): nunca crece sin límite.
    if (signal.sound !== null && this.signals.length < 32) this.signals.push(signal);
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
    const clue = this.state.def(id)?.clue;
    const newClue = clue !== undefined && !this.state.hasSeen(clue);
    const outcome = this.state.interact(id, this.state.inventory.selectedItem);
    switch (outcome.kind) {
      case 'inspect':
        if (newClue) this.log.add({ k: 'look', id });
        break;
      case 'toggled':
        if (outcome.open) this.log.add({ k: 'open', id });
        break;
      case 'picked':
        this.log.add({ k: 'take', id });
        break;
      case 'unlocked':
        this.log.add({ k: 'use', id, item: outcome.item });
        break;
      default:
        break;
    }
    this.emit(outcomeSignal(outcome));
    this.afterChange();
    return outcome;
  }

  tryCode(puzzle: string, code: readonly number[]): boolean {
    this.timer.start();
    const already = this.state.isSolved(puzzle);
    const ok = this.state.tryCode(puzzle, code);
    if (ok && !already) this.log.add({ k: 'code', puzzle, values: [...code] });
    if (!already) this.emit(codeSignal(ok));
    this.afterChange();
    return ok;
  }

  place(puzzle: string, slot: number, item: string): PlaceResult {
    this.timer.start();
    const result = this.state.place(puzzle, slot, item);
    if (result === 'placed') this.log.add({ k: 'place', puzzle, slot, item });
    this.emit(placeSignal(result, this.state.isSolved(puzzle)));
    this.afterChange();
    return result;
  }

  pressSwitch(puzzle: string, index: number): PressResult {
    this.timer.start();
    const already = this.state.isSolved(puzzle);
    const result = this.state.pressSwitch(puzzle, index);
    if (result === 'solved' && !already) {
      this.log.add({ k: 'switches', puzzle, order: [...this.state.pressedSwitches(puzzle)] });
    }
    if (!already) this.emit(pressSignal(result));
    this.afterChange();
    return result;
  }

  combine(a: string, b: string): CombineResult {
    this.timer.start();
    const result = this.state.combine(a, b);
    if (result.kind === 'combined') this.log.add({ k: 'combine', a, b });
    this.emit(combineSignal(result));
    this.afterChange();
    return result;
  }

  /** Muestra y cuenta el siguiente nivel de pista de un puzzle. */
  revealHint(puzzle: string): number | null {
    const level = this.state.hints.reveal(puzzle);
    if (level !== null) this.log.add({ k: 'hint', puzzle });
    return level;
  }

  private afterChange(): void {
    if (this.state.finished) this.timer.stop();
    this.refreshTargets();
  }

  /** Rehace la lista de obstáculos solo cuando cambió el estado (se abrió una puerta). */
  private refreshColliders(): void {
    if (this.collidersVersion === this.state.version) return;
    this.collidersVersion = this.state.version;
    const closed = this.blockers.filter((d) => !this.state.isOpen(d.id)).map(blockerRect);
    this.colliders =
      closed.length === 0 ? this.fixedColliders : [...this.fixedColliders, ...closed];
  }

  /** Recalcula las cajas de selección si cambió algo (aperturas, objetos recogidos). */
  private refreshTargets(): void {
    if (this.targetsVersion === this.state.version) return;
    this.targetsVersion = this.state.version;
    this.targets = this.state.visibleIds().flatMap((id) => {
      const def = this.state.def(id);
      if (!def) return [];
      const open = this.state.isOpen(id);
      // Lo que ya no se cierra deja de señalarse una vez abierto.
      if (open && def.staysOpen === true) return [];
      return [{ id, box: interactableBox(def, open) }];
    });
  }
}
