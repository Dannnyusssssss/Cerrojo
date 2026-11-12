/**
 * Esquema de las acciones de una partida guardada. Aquí solo se comprueba la forma (tipos,
 * longitudes y rangos); que cada acción sea legal en la sala lo decide después la lógica del
 * juego al repetirlas (game/session.ts). Si una sola acción no cumple, se descarta la partida
 * entera: saltársela cambiaría lo que pasó.
 */
import { SAVE_LIMITS } from '../data/config';
import { ACTION_KINDS, type SavedAction } from '../game/session';
import { isPlainObject, readOwn, type UnknownRecord } from './guards';

/** Identificadores de objetos y puzzles: minúsculas, dígitos y guiones. */
const ID_PATTERN = /^[a-z0-9-]+$/;

function readId(record: UnknownRecord, key: string): string | null {
  const value = readOwn(record, key);
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.length > SAVE_LIMITS.maxIdChars || !ID_PATTERN.test(value)) return null;
  return value;
}

function readInt(record: UnknownRecord, key: string, max: number): number | null {
  const value = readOwn(record, key);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    return null;
  }
  return value;
}

/** Lista corta de enteros pequeños (combinación u orden de interruptores). */
function readValues(record: UnknownRecord, key: string): number[] | null {
  const value = readOwn(record, key);
  if (!Array.isArray(value) || value.length === 0 || value.length > SAVE_LIMITS.maxValues) {
    return null;
  }
  const list: number[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 99) return null;
    list.push(item);
  }
  return list;
}

function readKind(record: UnknownRecord): SavedAction['k'] | null {
  const value = readOwn(record, 'k');
  return ACTION_KINDS.find((kind) => kind === value) ?? null;
}

export function parseAction(value: unknown): SavedAction | null {
  if (!isPlainObject(value)) return null;
  const k = readKind(value);
  switch (k) {
    case 'open':
    case 'take':
    case 'look': {
      const id = readId(value, 'id');
      return id === null ? null : { k, id };
    }
    case 'use': {
      const id = readId(value, 'id');
      const item = readId(value, 'item');
      return id === null || item === null ? null : { k, id, item };
    }
    case 'code': {
      const puzzle = readId(value, 'puzzle');
      const values = readValues(value, 'values');
      return puzzle === null || values === null ? null : { k, puzzle, values };
    }
    case 'place': {
      const puzzle = readId(value, 'puzzle');
      const slot = readInt(value, 'slot', 20);
      const item = readId(value, 'item');
      return puzzle === null || slot === null || item === null ? null : { k, puzzle, slot, item };
    }
    case 'switches': {
      const puzzle = readId(value, 'puzzle');
      const order = readValues(value, 'order');
      return puzzle === null || order === null ? null : { k, puzzle, order };
    }
    case 'combine': {
      const a = readId(value, 'a');
      const b = readId(value, 'b');
      return a === null || b === null ? null : { k, a, b };
    }
    case 'hint': {
      const puzzle = readId(value, 'puzzle');
      return puzzle === null ? null : { k, puzzle };
    }
    case null:
      return null;
  }
}

/** Lista de acciones válida en forma, o null si algo no cumple (se descarta la partida). */
export function parseActions(value: unknown): SavedAction[] | null {
  if (!Array.isArray(value) || value.length > SAVE_LIMITS.maxActions) return null;
  const actions: SavedAction[] = [];
  for (const item of value as unknown[]) {
    const action = parseAction(item);
    if (action === null) return null;
    actions.push(action);
  }
  return actions;
}
