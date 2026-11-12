/** Piezas comunes para construir objetos con geometría por código. */
import {
  BackSide,
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { SHAPE_POINTS, type ShapeKey } from '../data/shapes';
import type { InteractableDef } from '../game/room';
import type { TextureFactory } from './textures';

export function mat(
  textures: TextureFactory | null,
  color: number,
  kind?: 'wood',
): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
  if (kind === 'wood' && textures) material.map = textures.wood();
  return material;
}

export function metal(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
}

export function mesh(geometry: BufferGeometry, material: Material | Material[]): Mesh {
  const m = new Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Medidas locales: si el objeto está girado 90°, el ancho y el fondo del mundo se cruzan. */
export function localSize(def: InteractableDef): { w: number; h: number; d: number } {
  const turned = Math.abs(Math.sin(def.rotationY ?? 0)) > 0.7;
  return turned
    ? { w: def.size.z, h: def.size.y, d: def.size.x }
    : { w: def.size.x, h: def.size.y, d: def.size.z };
}

/** Caras de una caja: +x, -x, +y, -y, +z, -z (el mismo orden que BoxGeometry). */
export type BoxFace = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';
const FACE_INDEX: Readonly<Record<BoxFace, number>> = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 };

/**
 * Material de los interiores: más oscuro que el exterior para que se lea la profundidad.
 * Se dibuja por la cara de atrás (BackSide): sobre la geometría exterior solo se ven las
 * paredes que quedan al fondo del hueco, nunca las que tapan desde fuera.
 */
export function interiorMaterial(color = 0x2e1c10): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, side: BackSide });
}

/** Caja sin una de sus caras, como un solo grupo de dibujo (una llamada por material). */
function boxWithoutFace(w: number, h: number, d: number, face: BoxFace): BoxGeometry {
  const geometry = new BoxGeometry(w, h, d);
  const index = geometry.getIndex();
  if (index === null) return geometry;
  const kept: number[] = [];
  for (const group of geometry.groups) {
    if (group.materialIndex === FACE_INDEX[face]) continue;
    for (let i = group.start; i < group.start + group.count; i++) kept.push(index.getX(i));
  }
  geometry.setIndex(kept);
  geometry.clearGroups();
  return geometry;
}

/**
 * Caja hueca con la cara `openFace` abierta, centrada en el origen. El exterior usa `outer` y
 * el interior `inner` sobre la misma geometría: en cada pared solo se ve uno de los dos, así que
 * no hay parpadeo y cuesta dos llamadas de dibujo. `floor` (opcional, solo con la cara de
 * arriba abierta) añade un forro en el fondo.
 */
export function buildOpenBox(
  w: number,
  h: number,
  d: number,
  openFace: BoxFace,
  outer: Material,
  inner: MeshStandardMaterial,
  floor?: Material,
): Group {
  const group = new Group();
  const geometry = boxWithoutFace(w, h, d, openFace);
  group.add(mesh(geometry, outer), mesh(geometry, inner));
  if (floor && openFace === 'py') {
    const lining = new Mesh(new PlaneGeometry(w * 0.98, d * 0.98), floor);
    lining.rotation.x = -Math.PI / 2;
    lining.position.y = -h / 2 + 0.002;
    lining.receiveShadow = true;
    group.add(lining);
  }
  return group;
}

/**
 * Pieza con el contorno de una forma, de `size` de lado y `depth` de grosor, centrada en el
 * origen: el contorno queda en el plano XY y el grosor a lo largo de z.
 */
export function shapeGeometry(shape: ShapeKey, size: number, depth: number): ExtrudeGeometry {
  const outline = new Shape();
  if (shape === 'circle') {
    outline.absarc(0, 0, size * 0.44, 0, Math.PI * 2, false);
  } else {
    // Los puntos están en un cuadro de 0 a 1 con y hacia abajo: se centran y se invierte y.
    SHAPE_POINTS[shape].forEach(([x, y], i) => {
      const px = (x - 0.5) * size;
      const py = (0.5 - y) * size;
      if (i === 0) outline.moveTo(px, py);
      else outline.lineTo(px, py);
    });
    outline.closePath();
  }
  const geometry = new ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 24 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Recorre las mallas de un objeto (para resaltar o liberar memoria). */
export function forEachMesh(root: Object3D, fn: (m: Mesh) => void): void {
  root.traverse((child) => {
    if (child instanceof Mesh) fn(child as Mesh);
  });
}
