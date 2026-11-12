/**
 * Modelo de sala: tipos de los datos de src/data/rooms/ y funciones puras que derivan de ellos
 * los obstáculos de colisión (plano) y de línea de visión (3D).
 */
import type { Vec3 } from '../core/math';
import type { ShapeKey } from '../data/shapes';
import type { ObjectNameKey } from '../data/texts';
import type { Rect } from './collision';

export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export type FurnitureKind = 'desk' | 'table' | 'shelf' | 'cabinet';

/** Mueble: un bloque apoyado en el suelo. (x, z) es el centro; w, d, h las medidas. */
export interface FurnitureDef {
  id: string;
  kind: FurnitureKind;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /**
   * Cara abierta de un mueble hueco (-x). Para la línea de visión, el mueble son sus paredes y
   * se puede ver lo que hay dentro; para el movimiento sigue siendo un bloque.
   */
  hollow?: 'nx';
}

export type PropKind =
  | 'chest'
  | 'book'
  | 'drawer'
  | 'clock'
  | 'cabinetDoor'
  | 'picture'
  | 'exitDoor'
  | 'slotPanel'
  | 'key'
  | 'doorKey'
  | 'block'
  | 'postcard'
  | 'orderCard';

/**
 * examine: abre la vista de examen (y descubre su pista, si la tiene).
 * toggle: se abre y se cierra; con `lock`, solo después de resolver ese puzzle.
 * pickup: se recoge al inventario.
 * panel: abre el panel de su puzzle.
 */
export type InteractableBehavior = 'examine' | 'toggle' | 'pickup' | 'panel';

export interface InteractableDef {
  id: string;
  nameKey: ObjectNameKey;
  prop: PropKind;
  behavior: InteractableBehavior;
  /** Centro de la caja de selección en estado cerrado. */
  position: Vec3;
  /** Medidas completas de la caja de selección. */
  size: Vec3;
  /** Desplazamiento de la caja de selección al abrirse (un cajón que sale). */
  openOffset?: Vec3;
  /** Medidas de la caja de selección al abrirse, si cambian (una puerta que gira). */
  openSize?: Vec3;
  /** Rotación del objeto alrededor del eje vertical, en radianes. */
  rotationY?: number;
  /** Puzzle que hay que resolver antes de poder abrirlo. */
  lock?: string;
  /** Puzzle cuyo panel se abre (comportamiento panel). */
  puzzle?: string;
  /** Pista que se descubre al examinarlo. */
  clue?: string;
  /** Objeto de inventario que se recoge (comportamiento pickup). */
  item?: string;
  /** Contenedor que tiene que estar abierto para verlo y alcanzarlo. */
  insideOf?: string;
  /** Puzzle que tiene que estar resuelto para que aparezca. */
  revealedBy?: string;
  /** Forma, para los objetos que la llevan (bloques). */
  shape?: ShapeKey;
  /** Punto del suelo desde el que se alcanza (lo usan los tests de alcance). */
  approach: { x: number; z: number };
}

export type ItemIcon = 'key' | 'doorKey' | 'block';

export interface ItemDef {
  id: string;
  nameKey: ObjectNameKey;
  icon: ItemIcon;
  shape?: ShapeKey;
}

export interface KeyLockDef {
  id: string;
  type: 'key-lock';
  /** Objeto de la sala que abre. */
  target: string;
  /** Objeto de inventario que lo abre (se gasta al usarlo bien). */
  key: string;
  /** Resolverlo termina la sala. */
  exit?: boolean;
}

export interface CodeLockDef {
  id: string;
  type: 'code-lock';
  target: string;
  /**
   * Cada forma tiene un dígito (decidido por la semilla) escrito en un objeto de la sala, y una
   * tarjeta indica en qué orden van las formas. El código es esos dígitos en ese orden.
   */
  symbols: readonly ShapeKey[];
  digitClues: readonly { symbol: ShapeKey; clue: string }[];
  orderClue: string;
}

export interface PlacementDef {
  id: string;
  type: 'placement';
  target: string;
  /** Huecos en el orden en que se ven, con la forma de su silueta y el objeto que encaja. */
  slots: readonly { shape: ShapeKey; item: string }[];
}

export type PuzzleDef = KeyLockDef | CodeLockDef | PlacementDef;

export interface RoomDef {
  id: string;
  /** Medidas interiores en metros. La sala ocupa x ∈ [-width/2, width/2], z ∈ [-depth/2, depth/2]. */
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  spawn: { x: number; z: number; yaw: number };
  furniture: readonly FurnitureDef[];
  interactables: readonly InteractableDef[];
  items: readonly ItemDef[];
  puzzles: readonly PuzzleDef[];
  /** Objeto que enseña a jugar: se muestra una ayuda hasta abrirlo. */
  tutorialTarget?: string;
}

/** Rectángulo en planta de un mueble. */
export function furnitureRect(f: FurnitureDef): Rect {
  return { minX: f.x - f.w / 2, maxX: f.x + f.w / 2, minZ: f.z - f.d / 2, maxZ: f.z + f.d / 2 };
}

/** Rectángulos de las cuatro paredes, por fuera del espacio interior. */
export function wallRects(room: RoomDef): Rect[] {
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const t = room.wallThickness;
  return [
    { minX: -hw - t, maxX: hw + t, minZ: -hd - t, maxZ: -hd },
    { minX: -hw - t, maxX: hw + t, minZ: hd, maxZ: hd + t },
    { minX: -hw - t, maxX: -hw, minZ: -hd, maxZ: hd },
    { minX: hw, maxX: hw + t, minZ: -hd, maxZ: hd },
  ];
}

/** Obstáculos de movimiento: paredes y muebles. */
export function roomColliders(room: RoomDef): Rect[] {
  return [...wallRects(room), ...room.furniture.map(furnitureRect)];
}

/** Grosor de las paredes de un mueble hueco a efectos de línea de visión. */
const HOLLOW_WALL = 0.03;

/** Obstáculos de línea de visión de un mueble: un bloque, o sus paredes si es hueco. */
export function furnitureOccluders(f: FurnitureDef): Aabb[] {
  const r = furnitureRect(f);
  const solid = { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, minY: 0, maxY: f.h };
  if (f.hollow !== 'nx') return [solid];
  const t = HOLLOW_WALL;
  return [
    { ...solid, minX: r.maxX - t },
    { ...solid, maxZ: r.minZ + t },
    { ...solid, minZ: r.maxZ - t },
    { ...solid, minY: f.h - t },
    { ...solid, maxY: 0.1 },
  ];
}

/** Obstáculos de línea de visión en 3D: paredes a toda altura y muebles. */
export function roomOccluders(room: RoomDef): Aabb[] {
  const walls = wallRects(room).map((r) => ({
    minX: r.minX,
    maxX: r.maxX,
    minZ: r.minZ,
    maxZ: r.maxZ,
    minY: 0,
    maxY: room.height,
  }));
  return [...walls, ...room.furniture.flatMap(furnitureOccluders)];
}

/** Caja de selección de un objeto según esté abierto o cerrado. */
export function interactableBox(def: InteractableDef, open: boolean): Aabb {
  const offset = open && def.openOffset ? def.openOffset : { x: 0, y: 0, z: 0 };
  const size = open && def.openSize ? def.openSize : def.size;
  const cx = def.position.x + offset.x;
  const cy = def.position.y + offset.y;
  const cz = def.position.z + offset.z;
  return {
    minX: cx - size.x / 2,
    maxX: cx + size.x / 2,
    minY: cy - size.y / 2,
    maxY: cy + size.y / 2,
    minZ: cz - size.z / 2,
    maxZ: cz + size.z / 2,
  };
}

export function aabbIntersects(a: Aabb, b: Aabb): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}
