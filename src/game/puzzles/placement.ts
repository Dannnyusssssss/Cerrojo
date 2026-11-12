/** Colocación: cada objeto encaja solo en el hueco de su silueta. */
import type { PlacementDef } from '../room';

export type Slots = readonly (string | null)[];

export function emptySlots(def: PlacementDef): (string | null)[] {
  return def.slots.map(() => null);
}

export type PlaceResult = 'placed' | 'wrong' | 'occupied' | 'invalid';

/** Intenta poner `item` en el hueco `index`. Un objeto que no encaja no se pierde. */
export function placeResult(
  def: PlacementDef,
  slots: Slots,
  index: number,
  item: string,
): PlaceResult {
  const slot = def.slots[index];
  if (!slot || !Number.isInteger(index)) return 'invalid';
  if (slots[index] !== null) return 'occupied';
  return slot.item === item ? 'placed' : 'wrong';
}

export function placementComplete(def: PlacementDef, slots: Slots): boolean {
  return def.slots.every((slot, i) => slots[i] === slot.item);
}
