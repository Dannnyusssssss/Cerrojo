/**
 * Progreso entre salas para el controlador: qué sala se juega, con qué semilla, y qué se
 * guarda (partida en curso y marcas). Prepara los datos de los menús de salas y de continuar.
 */
import { ROOMS } from './data/rooms';
import { TEXTS } from './data/texts';
import { isRoomUnlocked } from './game/progress';
import type { RoomDef } from './game/room';
import type { World } from './game/world';
import { SessionKeeper, type RestoredGame } from './save/session-keeper';
import type { SaveStore } from './save/storage';
import type { Menus } from './ui/menus';
import { roomEntries } from './ui/room-select';

export class Progress {
  private readonly store: SaveStore;
  private readonly keeper: SessionKeeper;
  /** Con ayudas de depuración: todas las salas abiertas y nada de la partida se guarda. */
  private readonly withAids: boolean;
  /** Índice en ROOMS de la sala en juego. */
  roomIndex: number;
  seed: number;

  constructor(store: SaveStore, withAids: boolean, roomIndex: number, seed: number) {
    this.store = store;
    this.withAids = withAids;
    this.keeper = new SessionKeeper(store, withAids);
    this.roomIndex = Math.min(Math.max(0, roomIndex), ROOMS.length - 1);
    this.seed = seed;
  }

  get room(): RoomDef {
    return ROOMS[this.roomIndex] ?? (ROOMS[0] as RoomDef);
  }

  get hasSaved(): boolean {
    return this.keeper.pendingRoom !== null;
  }

  /** Nombre visible de la sala de la partida guardada, o null. */
  savedRoomName(): string | null {
    const room = ROOMS.find((r) => r.id === this.keeper.pendingRoom);
    return room ? TEXTS.rooms[room.titleKey].name : null;
  }

  isUnlocked(index: number): boolean {
    if (index < 0 || index >= ROOMS.length) return false;
    return this.withAids || isRoomUnlocked(ROOMS, index, this.store.getRecords());
  }

  /** Hay una sala siguiente y ya está abierta. */
  hasNext(): boolean {
    return this.isUnlocked(this.roomIndex + 1);
  }

  /** Refleja en los menús las salas, sus marcas y la partida guardada. */
  refreshMenus(menus: Menus): void {
    menus.setRooms(roomEntries(ROOMS, this.store.getRecords(), this.withAids));
    menus.setContinue(this.savedRoomName());
  }

  /**
   * Comprueba al arrancar la partida guardada, para no ofrecer «Continuar» si no sirve.
   * Devuelve true si había una y se descartó.
   */
  dropInvalidSaved(): boolean {
    if (!this.hasSaved) return false;
    return this.keeper.restore(ROOMS) === null;
  }

  /** Empieza una sala desde cero: se olvida cualquier partida guardada. */
  begin(index: number, seed: number): void {
    this.keeper.discard();
    this.roomIndex = index;
    this.seed = seed;
  }

  /** Recupera la partida guardada, o null si no era válida (y entonces se borra). */
  restore(): RestoredGame | null {
    const restored = this.keeper.restore(ROOMS);
    if (restored === null) return null;
    this.roomIndex = ROOMS.indexOf(restored.room);
    this.seed = restored.seed;
    return restored;
  }

  maybeSave(world: World): void {
    this.keeper.maybeSave(this.room, this.seed, world);
  }

  saveNow(world: World): void {
    this.keeper.save(this.room, this.seed, world);
  }

  /** Sala terminada. Devuelve true si es una marca nueva. */
  finish(world: World): boolean {
    return this.keeper.finish(this.room, world.timer.steps, world.state.hints.used);
  }

  clearData(): void {
    this.store.clearProgress();
    this.keeper.discard();
  }
}
