/**
 * Objetos interactuables construidos con geometría por código. Cada uno sabe animar su
 * apertura y mostrar lo colocado en él; el estado lo decide la lógica (GameState).
 * Aquí están los contenedores y mecanismos; los objetos pequeños, en props-small.ts.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import type { ShapeKey } from '../data/shapes';
import type { InteractableDef, RoomDef } from '../game/room';
import type { RoomAnswers } from '../game/seeded';
import {
  buildOpenBox,
  interiorMaterial,
  localSize,
  mat,
  mesh,
  metal,
  shapeGeometry,
} from './prop-kit';
import { buildSmallProp } from './props-small';
import type { TextureFactory } from './textures';

const OPEN_SPEED = 4; // fracciones de apertura por segundo

export class PropView {
  readonly def: InteractableDef;
  /** Raíz colocada en el mundo. */
  readonly root = new Group();
  /** Parte visual (lo que se clona para examinar y lo que se resalta). */
  readonly body: Group;
  private readonly applyOpen: (t: number) => void;
  private readonly applySlots: ((filled: readonly boolean[]) => void) | undefined;
  private progress = 0;
  private target = 0;

  constructor(
    def: InteractableDef,
    body: Group,
    applyOpen: (t: number) => void,
    applySlots?: (filled: readonly boolean[]) => void,
  ) {
    this.def = def;
    this.body = body;
    this.applyOpen = applyOpen;
    this.applySlots = applySlots;
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

  /** Muestra qué huecos están ocupados (solo el panel de huecos lo usa). */
  setSlots(filled: readonly boolean[]): void {
    this.applySlots?.(filled);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
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

/** Lo que necesitan los constructores de objetos además de su definición. */
export interface PropContext {
  textures: TextureFactory;
  answers: RoomAnswers;
  room: RoomDef;
}

const noop = (): void => undefined;

/** Cofre hueco con tapa y una placa de cuatro ruedas al frente. */
function buildChest(def: InteractableDef, tx: TextureFactory): PropView {
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
  // Placa de la cerradura con cuatro ruedas, en el frente de la caja.
  const brass = metal(0xc9a85b);
  const plate = mesh(new BoxGeometry(w * 0.5, h * 0.3, 0.01), brass);
  plate.position.set(0, -h * 0.08, d / 2 + 0.005);
  const wheelGeo = new CylinderGeometry(0.014, 0.014, 0.02, 12);
  const wheelMat = mat(null, 0x3a2a1a);
  for (let i = 0; i < 4; i++) {
    const wheel = mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set((i - 1.5) * w * 0.1, 0, 0.012);
    plate.add(wheel);
  }
  body.add(base, hinge, plate);
  return new PropView(def, body, (t) => {
    hinge.rotation.x = -1.9 * t;
  });
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
  const knob = mesh(new CylinderGeometry(0.018, 0.018, 0.03, 12), metal(0xc9a85b));
  knob.rotation.x = Math.PI / 2;
  knob.position.z = d / 2 + 0.015;
  slide.add(front, box, knob);
  body.add(slide);
  const offset = def.openOffset?.z ?? 0;
  return new PropView(def, body, (t) => {
    slide.position.z = offset * t;
  });
}

/** Puerta con bisagra a la izquierda (vista desde delante) que se abre hacia delante. */
function hingedDoor(
  w: number,
  h: number,
  d: number,
  material: MeshStandardMaterial,
  extras: (panel: Mesh) => void,
): { group: Group; hinge: Group } {
  const group = new Group();
  const hinge = new Group();
  hinge.position.x = -w / 2;
  const panel = mesh(new BoxGeometry(w, h, d), material);
  panel.position.x = w / 2;
  extras(panel);
  hinge.add(panel);
  group.add(hinge);
  return { group, hinge };
}

function buildCabinetDoor(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const { group, hinge } = hingedDoor(w, h, d, mat(tx, 0x9a6a3c, 'wood'), (panel) => {
    const brass = metal(0xc9a85b);
    // Tirador y cerradura cerca del borde libre (posiciones relativas al centro del panel).
    const handle = mesh(new BoxGeometry(0.03, 0.18, 0.03), brass);
    handle.position.set(w / 2 - 0.07, 0, d / 2 + 0.02);
    const lockPlate = mesh(new CylinderGeometry(0.02, 0.02, 0.01, 16), brass);
    lockPlate.rotation.x = Math.PI / 2;
    lockPlate.position.set(w / 2 - 0.07, -0.16, d / 2 + 0.006);
    panel.add(handle, lockPlate);
  });
  return new PropView(def, group, (t) => {
    hinge.rotation.y = (-Math.PI / 2) * t;
  });
}

/** Puerta de salida con marco; detrás, una luz cálida que se ve al abrirla. */
function buildExitDoor(def: InteractableDef, tx: TextureFactory): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const { group, hinge } = hingedDoor(w, h, d, mat(tx, 0x7a4e2c, 'wood'), (panel) => {
    const brass = metal(0xc9a85b);
    const handle = mesh(new CylinderGeometry(0.03, 0.03, 0.06, 16), brass);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(w / 2 - 0.1, 0, d / 2 + 0.03);
    const keyhole = mesh(new BoxGeometry(0.05, 0.1, 0.008), metal(0x8a7040));
    keyhole.position.set(w / 2 - 0.1, -0.12, d / 2 + 0.004);
    // Molduras para que se lea como puerta y no como una tabla.
    const trim = mat(tx, 0x5e3a1e, 'wood');
    for (const y of [h * 0.22, -h * 0.22]) {
      const moulding = mesh(new BoxGeometry(w * 0.7, h * 0.32, 0.012), trim);
      moulding.position.set(0, y, d / 2 + 0.006);
      panel.add(moulding);
    }
    panel.add(handle, keyhole);
  });
  const frameMat = mat(tx, 0x4a2e18, 'wood');
  const side = new BoxGeometry(0.08, h + 0.08, d + 0.04);
  for (const sx of [-1, 1]) {
    const post = mesh(side, frameMat);
    post.position.set(sx * (w / 2 + 0.04), 0.04, 0);
    body.add(post);
  }
  const top = mesh(new BoxGeometry(w + 0.16, 0.08, d + 0.04), frameMat);
  top.position.y = h / 2 + 0.04;
  // Luz de fuera: solo se ve con la puerta abierta (queda detrás de ella).
  const outside = new Mesh(
    new PlaneGeometry(w, h),
    new MeshStandardMaterial({ color: 0xfff2d6, emissive: 0xffe3b0, emissiveIntensity: 1.2 }),
  );
  outside.position.z = -d / 2 - 0.004;
  body.add(group, top, outside);
  return new PropView(def, body, (t) => {
    hinge.rotation.y = -1.45 * t;
  });
}

/** Panel con tres huecos de silueta y un compartimento que se abre al completarlo. */
function buildSlotPanel(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const tx = ctx.textures;
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.puzzle);
  const shapes: ShapeKey[] = puzzle?.type === 'placement' ? puzzle.slots.map((s) => s.shape) : [];
  const body = new Group();
  const wood = mat(tx, 0x8a5f38, 'wood');
  const upperH = h * 0.62;
  const board = mesh(new BoxGeometry(w, upperH, d), wood);
  board.position.y = h / 2 - upperH / 2;
  // Cada hueco: una silueta oscura con borde claro, y encima el bloque cuando se coloca.
  // Silueta y bloque comparten centro, así que el bloque la tapa exactamente.
  const cell = w / Math.max(1, shapes.length);
  const size = Math.min(cell * 0.62, upperH * 0.8);
  const hollowMat = new MeshStandardMaterial({ color: 0x1e1309, roughness: 1 });
  const rimMat = new MeshStandardMaterial({ color: 0xe0c89a, roughness: 0.7 });
  const blockMat = mat(tx, 0xd8b07a, 'wood');
  const placed = shapes.map((shape, i) => {
    const x = -w / 2 + cell * (i + 0.5);
    const rim = mesh(shapeGeometry(shape, size * 1.14, 0.004), rimMat);
    rim.position.set(x, 0, d / 2 + 0.002);
    const hollow = mesh(shapeGeometry(shape, size, 0.004), hollowMat);
    hollow.position.set(x, 0, d / 2 + 0.004);
    const block = mesh(shapeGeometry(shape, size * 0.96, 0.03), blockMat);
    block.position.set(x, 0, d / 2 + 0.02);
    block.visible = false;
    board.add(rim, hollow, block);
    return block;
  });
  // Compartimento: caja hueca abierta por delante y una tapa con bisagra abajo.
  const lowerH = h - upperH;
  const compartment = buildOpenBox(w, lowerH, d, 'pz', wood, interiorMaterial());
  compartment.position.y = -h / 2 + lowerH / 2;
  const flapHinge = new Group();
  flapHinge.position.set(0, -h / 2, d / 2);
  const flap = mesh(new BoxGeometry(w * 0.96, lowerH * 0.96, 0.015), mat(tx, 0x6e4626, 'wood'));
  flap.position.set(0, (lowerH * 0.96) / 2, 0.008);
  const pull = mesh(new BoxGeometry(0.08, 0.015, 0.02), metal(0xc9a85b));
  pull.position.set(0, lowerH * 0.3, 0.015);
  flap.add(pull);
  flapHinge.add(flap);
  body.add(board, compartment, flapHinge);
  return new PropView(
    def,
    body,
    (t) => {
      flapHinge.rotation.x = (Math.PI / 2) * t;
    },
    (filled) => {
      placed.forEach((block, i) => {
        block.visible = filled[i] === true;
      });
    },
  );
}

export function createProp(def: InteractableDef, ctx: PropContext): PropView {
  switch (def.prop) {
    case 'chest':
      return buildChest(def, ctx.textures);
    case 'drawer':
      return buildDrawer(def, ctx.textures);
    case 'cabinetDoor':
      return buildCabinetDoor(def, ctx.textures);
    case 'exitDoor':
      return buildExitDoor(def, ctx.textures);
    case 'slotPanel':
      return buildSlotPanel(def, ctx);
    default:
      return new PropView(def, buildSmallProp(def, ctx), noop);
  }
}
