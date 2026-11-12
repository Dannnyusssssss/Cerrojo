/**
 * Modelo de sala: tipos de los datos de src/data/rooms/ y funciones puras que derivan de ellos
 * los obstáculos de colisión (plano) y de línea de visión (3D).
 */
import type { Vec3 } from '../core/math';
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
}

export type PropKind = 'box' | 'book' | 'drawer' | 'clock' | 'cabinetDoor';

/** examine: abre la vista de examen. toggle: se abre y se cierra. */
export type InteractableBehavior = 'examine' | 'toggle';

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
  /** Rotación del objeto alrededor del eje vertical, en radianes. */
  rotationY?: number;
}

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

/** Obstáculos de línea de visión en 3D: paredes a toda altura y muebles con su altura. */
export function roomOccluders(room: RoomDef): Aabb[] {
  const walls = wallRects(room).map((r) => ({
    minX: r.minX,
    maxX: r.maxX,
    minZ: r.minZ,
    maxZ: r.maxZ,
    minY: 0,
    maxY: room.height,
  }));
  const furniture = room.furniture.map((f) => {
    const r = furnitureRect(f);
    return { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, minY: 0, maxY: f.h };
  });
  return [...walls, ...furniture];
}

/** Caja de selección de un objeto según esté abierto o cerrado. */
export function interactableBox(def: InteractableDef, open: boolean): Aabb {
  const offset = open && def.openOffset ? def.openOffset : { x: 0, y: 0, z: 0 };
  const cx = def.position.x + offset.x;
  const cy = def.position.y + offset.y;
  const cz = def.position.z + offset.z;
  return {
    minX: cx - def.size.x / 2,
    maxX: cx + def.size.x / 2,
    minY: cy - def.size.y / 2,
    maxY: cy + def.size.y / 2,
    minZ: cz - def.size.z / 2,
    maxZ: cz + def.size.z / 2,
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
