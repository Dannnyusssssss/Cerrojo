/**
 * Progreso entre salas (puro): marcas por sala y desbloqueo en orden. Cada sala guarda dos
 * marcas separadas: mejor tiempo sin pistas y mejor tiempo con pistas.
 */
import type { RoomDef } from './room';

/** Mejores tiempos de una sala, en pasos de lógica (null si aún no hay). */
export interface RoomRecord {
  clean: number | null;
  hinted: number | null;
}

export type Records = ReadonlyMap<string, RoomRecord>;

/** La primera sala siempre está abierta; las demás, al terminar la anterior. */
export function isRoomUnlocked(
  rooms: readonly RoomDef[],
  index: number,
  records: Records,
): boolean {
  if (index === 0) return rooms.length > 0;
  const previous = rooms[index - 1];
  return index > 0 && index < rooms.length && previous !== undefined && records.has(previous.id);
}

/**
 * Marca de una sala tras terminarla en `steps` pasos con `hints` pistas. `improved` dice si es
 * una marca nueva (o la primera) en su categoría.
 */
export function updateRecord(
  previous: RoomRecord | undefined,
  steps: number,
  hints: number,
): { record: RoomRecord; improved: boolean } {
  const base: RoomRecord = previous ?? { clean: null, hinted: null };
  const key = hints > 0 ? 'hinted' : 'clean';
  const best = base[key];
  if (best !== null && best <= steps) return { record: { ...base }, improved: false };
  return { record: { ...base, [key]: steps }, improved: true };
}
