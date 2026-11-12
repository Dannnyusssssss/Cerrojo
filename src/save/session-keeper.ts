/**
 * Guarda y recupera la partida en curso y las marcas. Decide cuándo escribir: tras cada acción
 * acertada y cada pocos segundos de juego. Con ayudas de depuración no guarda nada de la
 * partida (ni marcas ni partida en curso).
 */
import { SAVE_LIMITS } from '../data/config';
import type { RoomDef } from '../game/room';
import { generateAnswers } from '../game/seeded';
import { restoreSession, SessionLog } from '../game/session';
import { World } from '../game/world';
import type { SaveStore } from './storage';

export interface RestoredGame {
  room: RoomDef;
  seed: number;
  world: World;
}

export class SessionKeeper {
  private readonly store: SaveStore;
  private readonly withAids: boolean;
  private savedVersion = -1;
  private savedSteps = 0;

  constructor(store: SaveStore, withAids: boolean) {
    this.store = store;
    this.withAids = withAids;
  }

  /** Hay una partida guardada que ofrecer con «Continuar» (aún sin comprobar). */
  get pendingRoom(): string | null {
    return this.withAids ? null : (this.store.getCurrent()?.room ?? null);
  }

  /** Guarda si hubo una acción nueva o pasaron unos segundos desde la última vez. */
  maybeSave(room: RoomDef, seed: number, world: World): void {
    const steps = world.timer.steps;
    const changed = world.log.version !== this.savedVersion;
    if (changed || steps - this.savedSteps >= SAVE_LIMITS.saveEverySteps) {
      this.save(room, seed, world);
    }
  }

  /** Guarda ya (al pausar o al ocultar la pestaña). Una partida sin empezar no se guarda. */
  save(room: RoomDef, seed: number, world: World): void {
    if (this.withAids || world.state.finished || !world.timer.started) return;
    this.savedVersion = world.log.version;
    this.savedSteps = world.timer.steps;
    this.store.saveCurrent({
      room: room.id,
      seed,
      steps: world.timer.steps,
      actions: [...world.log.actions],
    });
  }

  /** Olvida la partida en curso guardada (reiniciar, empezar otra o terminar). */
  discard(): void {
    this.savedVersion = -1;
    this.savedSteps = 0;
    if (this.store.getCurrent() !== null) this.store.saveCurrent(null);
  }

  /**
   * Sala terminada: borra la partida en curso y, sin ayudas de depuración, anota la marca.
   * Devuelve true si es una marca nueva.
   */
  finish(room: RoomDef, steps: number, hints: number): boolean {
    this.discard();
    if (this.withAids) return false;
    return this.store.saveRecord(room.id, steps, hints);
  }

  /**
   * Recupera la partida guardada repitiendo sus acciones con la lógica real. Si no es válida
   * (acciones ilegales, sala terminada o sin solución), se borra y devuelve null.
   */
  restore(rooms: readonly RoomDef[]): RestoredGame | null {
    if (this.withAids) return null;
    const saved = this.store.getCurrent();
    if (saved === null) return null;
    const room = rooms.find((r) => r.id === saved.room);
    const answers = room ? generateAnswers(room, saved.seed) : null;
    const state = room && answers ? restoreSession(room, answers, saved.actions) : null;
    if (!room || !answers || !state) {
      this.discard();
      return null;
    }
    const log = new SessionLog(saved.actions);
    const world = new World(room, answers, { state, log, steps: saved.steps });
    this.savedVersion = log.version;
    this.savedSteps = saved.steps;
    return { room, seed: saved.seed, world };
  }
}
