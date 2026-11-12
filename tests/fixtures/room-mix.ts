/**
 * Sala de prueba (solo para tests) con los tipos de puzzle del Hito 3: combinar, interruptores,
 * diales y cerradura de símbolos. Cadena: dos piezas → combinar herramienta → caja →
 * interruptores (orden en la nota) → nota de diales → caja fuerte → nota de símbolos →
 * vitrina → llave → salida.
 */
import type { InteractableDef, RoomDef } from '../../src/game/room';

const at = (x: number, z: number): Pick<InteractableDef, 'position' | 'size' | 'approach'> => ({
  position: { x, y: 0.9, z },
  size: { x: 0.3, y: 0.3, z: 0.3 },
  approach: { x, z: z + 1 },
});

export const ROOM_MIX: RoomDef = {
  id: 'room-mix',
  titleKey: 'study',
  width: 6,
  depth: 6,
  height: 2.8,
  wallThickness: 0.2,
  spawn: { x: 0, z: 2, yaw: 0 },
  furniture: [],
  items: [
    { id: 'part-a', nameKey: 'smallKey', icon: 'key' },
    { id: 'part-b', nameKey: 'smallKey', icon: 'key' },
    { id: 'tool', nameKey: 'smallKey', icon: 'key' },
    { id: 'exit-key', nameKey: 'doorKey', icon: 'doorKey' },
  ],
  puzzles: [
    { id: 'p-combine', type: 'combine', inputs: ['part-a', 'part-b'], result: 'tool' },
    { id: 'p-box', type: 'key-lock', target: 'box', key: 'tool' },
    {
      id: 'p-switch',
      type: 'sequence',
      target: 'switchboard',
      switches: ['circle', 'star', 'hexagon', 'cross'],
      orderClue: 'clue-seq',
    },
    { id: 'p-dial', type: 'dial', target: 'safe', dials: 3, positions: 8, clue: 'clue-dial' },
    {
      id: 'p-symbol',
      type: 'symbol-lock',
      target: 'vitrine',
      symbols: ['star', 'hexagon', 'cross', 'arrow', 'circle'],
      wheels: 3,
      clue: 'clue-sym',
    },
    { id: 'p-exit', type: 'key-lock', target: 'exit-door', key: 'exit-key', exit: true },
  ],
  interactables: [
    {
      id: 'part-a',
      nameKey: 'book',
      prop: 'key',
      behavior: 'pickup',
      item: 'part-a',
      ...at(-2, 0),
    },
    { id: 'part-b', nameKey: 'book', prop: 'key', behavior: 'pickup', item: 'part-b', ...at(2, 0) },
    { id: 'box', nameKey: 'chest', prop: 'chest', behavior: 'toggle', lock: 'p-box', ...at(0, -1) },
    {
      id: 'switchboard',
      nameKey: 'slotPanel',
      prop: 'slotPanel',
      behavior: 'panel',
      puzzle: 'p-switch',
      insideOf: 'box',
      ...at(0, -1.2),
    },
    {
      id: 'seq-note',
      nameKey: 'orderCard',
      prop: 'orderCard',
      behavior: 'examine',
      clue: 'clue-seq',
      ...at(1, 1),
    },
    {
      id: 'dial-note',
      nameKey: 'postcard',
      prop: 'postcard',
      behavior: 'examine',
      clue: 'clue-dial',
      revealedBy: 'p-switch',
      ...at(-1, 1),
    },
    {
      id: 'safe',
      nameKey: 'chest',
      prop: 'chest',
      behavior: 'toggle',
      lock: 'p-dial',
      ...at(2, -2),
    },
    {
      id: 'sym-note',
      nameKey: 'postcard',
      prop: 'postcard',
      behavior: 'examine',
      clue: 'clue-sym',
      insideOf: 'safe',
      ...at(2, -2.1),
    },
    {
      id: 'vitrine',
      nameKey: 'cabinet',
      prop: 'cabinetDoor',
      behavior: 'toggle',
      lock: 'p-symbol',
      ...at(-2, -2),
    },
    {
      id: 'exit-key',
      nameKey: 'doorKey',
      prop: 'doorKey',
      behavior: 'pickup',
      item: 'exit-key',
      insideOf: 'vitrine',
      ...at(-2, -2.1),
    },
    {
      id: 'exit-door',
      nameKey: 'exitDoor',
      prop: 'exitDoor',
      behavior: 'toggle',
      lock: 'p-exit',
      ...at(0, -2.8),
    },
  ],
};
