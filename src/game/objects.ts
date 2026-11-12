/** Estado de los objetos interactuables y efecto de interactuar con ellos. */
import type { InteractableDef, RoomDef } from './room';

export interface ObjectState {
  open: boolean;
}

export type InteractionOutcome =
  | { kind: 'inspect'; id: string }
  | { kind: 'toggled'; id: string; open: boolean }
  | { kind: 'none' };

/** Acción que se muestra junto al nombre del objeto señalado. */
export type ActionLabel = 'examine' | 'open' | 'close';

export function createObjectStates(room: RoomDef): Map<string, ObjectState> {
  const states = new Map<string, ObjectState>();
  for (const def of room.interactables) states.set(def.id, { open: false });
  return states;
}

export function actionLabel(def: InteractableDef, state: ObjectState | undefined): ActionLabel {
  if (def.behavior === 'examine') return 'examine';
  return state?.open === true ? 'close' : 'open';
}

/**
 * Aplica la interacción con un objeto. Examinar no cambia el estado; abrir y cerrar lo
 * alterna. Un id desconocido no hace nada.
 */
export function interact(
  room: RoomDef,
  states: Map<string, ObjectState>,
  id: string,
): InteractionOutcome {
  const def = room.interactables.find((item) => item.id === id);
  const state = states.get(id);
  if (!def || !state) return { kind: 'none' };
  if (def.behavior === 'examine') return { kind: 'inspect', id };
  state.open = !state.open;
  return { kind: 'toggled', id, open: state.open };
}
