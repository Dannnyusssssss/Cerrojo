/**
 * Objetos interactuables construidos con geometría por código. Cada uno sabe animar su
 * apertura; el estado (abierto o cerrado) lo decide la lógica.
 */
import {
  BackSide,
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  type Material,
  type Object3D,
} from 'three';
import type { InteractableDef } from '../game/room';
import { TEXTS } from '../data/texts';
import type { TextureFactory } from './textures';

const OPEN_SPEED = 4; // fracciones de apertura por segundo

export class PropView {
  readonly def: InteractableDef;
  /** Raíz colocada en el mundo. */
  readonly root = new Group();
  /** Parte visual (lo que se clona para examinar y lo que se resalta). */
  readonly body = new Group();
  private readonly applyOpen: (t: number) => void;
  private progress = 0;
  private target = 0;

  constructor(def: InteractableDef, body: Group, applyOpen: (t: number) => void) {
    this.def = def;
    this.body = body;
    this.applyOpen = applyOpen;
    this.root.position.set(def.position.x, def.position.y, def.position.z);
    this.root.rotation.y = def.rotationY ?? 0;
    this.root.add(body);
  }

  setOpen(open: boolean, instant: boolean): void {
    this.target = open ? 1 : 0;
    if (instant) {
      this.progress = this.target;
      this.applyOpen(this.progress);
    }
  }

  update(dt: number): void {
    if (this.progress === this.target) return;
    const step = OPEN_SPEED * dt;
    this.progress =
      this.target > this.progress
        ? Math.min(this.target, this.progress + step)
        : Math.max(this.target, this.progress - step);
    // Suavizado de entrada y salida.
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    this.applyOpen(t);
  }
}

function mat(textures: TextureFactory | null, color: number, kind?: 'wood'): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
  if (kind === 'wood' && textures) material.map = textures.wood();
  return material;
}

function mesh(geometry: BufferGeometry, material: Material | Material[]): Mesh {
  const m = new Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Medidas locales: si el objeto está girado 90°, el ancho y el fondo del mundo se cruzan. */
function localSize(def: InteractableDef): { w: number; h: number; d: number } {
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

function buildBox(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const wood = mat(tx, 0xb88a5a, 'wood');
  // Caja hueca con forro de tela oscura en el fondo.
  const lining = new MeshStandardMaterial({ color: 0x8a3636, roughness: 1 });
  const base = buildOpenBox(w, h * 0.8, d, 'py', wood, interiorMaterial(0x4a301c), lining);
  base.position.y = -h * 0.1;
  const hinge = new Group();
  hinge.position.set(0, h * 0.3, -d / 2);
  const lid = mesh(new BoxGeometry(w * 1.02, h * 0.2, d * 1.02), wood);
  lid.position.set(0, h * 0.1, d / 2);
  hinge.add(lid);
  const clasp = mesh(new BoxGeometry(w * 0.12, h * 0.25, 0.01), mat(null, 0xc9a85b));
  // El cierre va en el borde delantero de la tapa (la tapa está centrada a d/2 de la bisagra).
  clasp.position.set(0, -h * 0.05, d * 0.51 + 0.005);
  lid.add(clasp);
  body.add(base, hinge);
  return new PropView(def, body, (t) => {
    hinge.rotation.x = -1.9 * t;
  });
}

function buildBook(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const cover = new MeshStandardMaterial({ map: tx.bookCover(), roughness: 0.8 });
  const back = new MeshStandardMaterial({
    map: tx.bookBack(TEXTS.inscriptions.book),
    roughness: 0.8,
  });
  const pages = mat(null, 0xefe6d0);
  const spine = mat(null, 0x5b2a2a);
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z.
  body.add(mesh(new BoxGeometry(w, h, d), [pages, spine, cover, back, pages, pages]));
  return new PropView(def, body, () => undefined);
}

function buildDrawer(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const slide = new Group();
  const wood = mat(tx, 0xa0703f, 'wood');
  const front = mesh(new BoxGeometry(w, h, d), wood);
  const depth = 0.36;
  // Cuerpo del cajón hueco, abierto por arriba, detrás del frente.
  const box = buildOpenBox(
    w * 0.92,
    h * 0.8,
    depth,
    'py',
    mat(tx, 0x7a5230, 'wood'),
    interiorMaterial(),
  );
  box.position.z = -depth / 2 - d / 2;
  const knob = mesh(new CylinderGeometry(0.018, 0.018, 0.03, 12), mat(null, 0xc9a85b));
  knob.rotation.x = Math.PI / 2;
  knob.position.z = d / 2 + 0.015;
  slide.add(front, box, knob);
  body.add(slide);
  const offset = def.openOffset?.z ?? 0;
  return new PropView(def, body, (t) => {
    slide.position.z = offset * t;
  });
}

function buildClock(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, d } = localSize(def);
  const body = new Group();
  const frame = mat(tx, 0x6b4a2a, 'wood');
  const face = new MeshStandardMaterial({ map: tx.clockFace(), roughness: 0.6 });
  // Orden de grupos del cilindro: lateral, tapa superior, tapa inferior.
  const disc = mesh(new CylinderGeometry(w / 2, w / 2, d, 40), [frame, face, frame]);
  disc.rotation.x = Math.PI / 2;
  body.add(disc);
  return new PropView(def, body, () => undefined);
}

function buildCabinetDoor(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const hinge = new Group();
  hinge.position.x = -w / 2;
  const panel = mesh(new BoxGeometry(w, h, d), mat(tx, 0x9a6a3c, 'wood'));
  panel.position.x = w / 2;
  const handle = mesh(new BoxGeometry(0.03, 0.18, 0.03), mat(null, 0xc9a85b));
  // Cerca del borde libre de la puerta (posición relativa al centro del panel).
  handle.position.set(w / 2 - 0.07, 0, d / 2 + 0.02);
  hinge.add(panel);
  panel.add(handle);
  body.add(hinge);
  return new PropView(def, body, (t) => {
    hinge.rotation.y = -1.75 * t;
  });
}

export function createProp(def: InteractableDef, textures: TextureFactory): PropView {
  switch (def.prop) {
    case 'box':
      return buildBox(def, textures);
    case 'book':
      return buildBook(def, textures);
    case 'drawer':
      return buildDrawer(def, textures);
    case 'clock':
      return buildClock(def, textures);
    case 'cabinetDoor':
      return buildCabinetDoor(def, textures);
  }
}

/** Recorre las mallas de un objeto (para resaltar o liberar memoria). */
export function forEachMesh(root: Object3D, fn: (m: Mesh) => void): void {
  root.traverse((child) => {
    if (child instanceof Mesh) fn(child as Mesh);
  });
}
