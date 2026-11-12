/**
 * Textos de respuesta a las acciones del jugador (puro: sin DOM, para poder probarlo).
 * Cada resultado tiene un mensaje visible; equivocarse nunca es silencioso.
 */
import { TEXTS } from '../data/texts';
import type { CombineResult, GameState, Outcome } from '../game/game-state';
import type { ItemDef } from '../game/room';
import type { Piece } from './lock-panels';

export function itemName(items: readonly ItemDef[], id: string): string {
  const item = items.find((i) => i.id === id);
  return item ? TEXTS.objects[item.nameKey] : id;
}

/** Mensaje breve para un resultado, o null si la propia acción ya se ve (abrir, examinar…). */
export function outcomeMessage(outcome: Outcome, items: readonly ItemDef[]): string | null {
  switch (outcome.kind) {
    case 'locked':
      return TEXTS.messages.locked;
    case 'picked':
      return TEXTS.messages.picked(itemName(items, outcome.item));
    case 'inventoryFull':
      return TEXTS.messages.inventoryFull;
    case 'wrongItem':
      return TEXTS.messages.wrongItem;
    case 'unlocked':
      return TEXTS.messages.unlocked;
    case 'inspect':
    case 'panel':
    case 'toggled':
    case 'none':
      return null;
  }
}

/** Mensaje tras intentar combinar dos objetos (nunca silencioso). */
export function combineMessage(result: CombineResult, items: readonly ItemDef[]): string {
  switch (result.kind) {
    case 'combined':
      return TEXTS.messages.combined(itemName(items, result.item));
    case 'noMatch':
      return TEXTS.messages.combineNoMatch;
    case 'invalid':
      return TEXTS.messages.combineCancelled;
  }
}

/** Nombre y acción del objeto señalado, por ejemplo «Armario» y «Usar: Llave pequeña». */
export function focusTexts(
  state: GameState,
  id: string,
  items: readonly ItemDef[],
): { name: string; action: string } | null {
  const def = state.def(id);
  if (!def) return null;
  const selected = state.inventory.selectedItem;
  const label = state.actionLabel(id, selected);
  const base = TEXTS.actions[label];
  const action =
    label === 'use' && selected !== null ? `${base}: ${itemName(items, selected)}` : base;
  return { name: TEXTS.objects[def.nameKey], action };
}

/** Bloques con forma que lleva el jugador (las piezas del panel de huecos). */
export function piecesInInventory(state: GameState, items: readonly ItemDef[]): Piece[] {
  return state.inventory.items.flatMap((id) => {
    const item = items.find((i) => i.id === id);
    return item?.shape !== undefined
      ? [{ id, name: TEXTS.objects[item.nameKey], shape: item.shape }]
      : [];
  });
}
