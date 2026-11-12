/**
 * Objetos del taller (Sala 2), con geometría por código: caja de herramientas, cuadro eléctrico
 * con su tapa, interruptores, esquema, caja de luz, caja fuerte de diales y las piezas sueltas.
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
import { TEXTS } from '../data/texts';
import type { InteractableDef } from '../game/room';
import {
  buildOpenBox,
  interiorMaterial,
  localSize,
  mat,
  mesh,
  metal,
  shapeGeometry,
} from './prop-kit';
import { PropView, type PropContext } from './prop-view';

const noop = (): void => undefined;

/** Puerta con bisagra a la izquierda (vista desde delante); `extras` le añade piezas. */
function hinged(
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

/** Caja de herramientas metálica con tapa de bisagra trasera, asa y cerradura. */
function buildToolbox(def: InteractableDef): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const paint = new MeshStandardMaterial({ color: 0xb4432f, roughness: 0.5, metalness: 0.3 });
  const base = buildOpenBox(w, h * 0.75, d, 'py', paint, interiorMaterial(0x2a2422));
  base.position.y = -h * 0.125;
  const hinge = new Group();
  hinge.position.set(0, h * 0.25, -d / 2);
  const lid = mesh(new BoxGeometry(w * 1.02, h * 0.18, d * 1.02), paint);
  lid.position.set(0, h * 0.09, d / 2);
  const grip = mesh(new BoxGeometry(w * 0.4, 0.02, 0.03), metal(0x3a3a3a));
  grip.position.set(0, h * 0.2, d / 2);
  hinge.add(lid, grip);
  const lock = mesh(new BoxGeometry(0.05, 0.05, 0.01), metal(0xc9a85b));
  lock.position.set(0, h * 0.1, d / 2 + 0.006);
  const keyhole = mesh(new BoxGeometry(0.008, 0.022, 0.004), mat(null, 0x111111));
  keyhole.position.z = 0.006;
  lock.add(keyhole);
  body.add(base, hinge, lock);
  return new PropView(def, body, (t) => {
    hinge.rotation.x = -1.9 * t;
  });
}

/**
 * Tapa del cuadro eléctrico con su carcasa detrás (hasta la pared). La tapa lleva cuatro
 * tornillos y una señal triangular; se abre hacia delante.
 */
function buildFuseCover(def: InteractableDef): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const grey = new MeshStandardMaterial({ color: 0x8d9496, roughness: 0.45, metalness: 0.5 });
  const casingDepth = 0.18;
  const casing = buildOpenBox(
    w * 1.04,
    h * 1.04,
    casingDepth,
    'pz',
    grey,
    interiorMaterial(0x26292a),
  );
  casing.position.z = -d / 2 - casingDepth / 2;
  const { group, hinge } = hinged(w, h, d, grey, (panel) => {
    const screwGeo = new CylinderGeometry(0.012, 0.012, 0.01, 10);
    const screwMat = metal(0x5a5f62);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const screw = mesh(screwGeo, screwMat);
        screw.rotation.x = Math.PI / 2;
        screw.position.set(sx * (w / 2 - 0.04), sy * (h / 2 - 0.04), d / 2 + 0.005);
        panel.add(screw);
      }
    }
    const sign = mesh(shapeGeometry('triangle', 0.14, 0.006), mat(null, 0xe8c547));
    sign.position.set(0, 0.06, d / 2 + 0.004);
    panel.add(sign);
  });
  body.add(casing, group);
  return new PropView(def, body, (t) => {
    hinge.rotation.y = (-Math.PI / 2) * t;
  });
}

/** Interruptores de palanca con la forma de su etiqueta encima; al resolverse, todos arriba. */
function buildSwitchboard(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.puzzle);
  const shapes: readonly ShapeKey[] = puzzle?.type === 'sequence' ? puzzle.switches : [];
  const body = new Group();
  body.add(mesh(new BoxGeometry(w, h, d), mat(null, 0x2f3437)));
  const cell = w / Math.max(1, shapes.length);
  const labelMat = mat(null, 0xf1e6c8);
  const leverMat = mat(null, 0x1b1b1b);
  const baseMat = metal(0xa7adb0);
  const levers = shapes.map((shape, i) => {
    const x = -w / 2 + cell * (i + 0.5);
    const label = mesh(shapeGeometry(shape, cell * 0.5, 0.006), labelMat);
    label.position.set(x, h * 0.25, d / 2 + 0.004);
    const base = mesh(new BoxGeometry(cell * 0.4, cell * 0.5, 0.02), baseMat);
    base.position.set(x, -h * 0.15, d / 2 + 0.01);
    const pivot = new Group();
    pivot.position.set(x, -h * 0.15, d / 2 + 0.02);
    const lever = mesh(new BoxGeometry(0.018, 0.08, 0.018), leverMat);
    lever.position.y = 0.04;
    pivot.add(lever);
    body.add(label, base, pivot);
    return pivot;
  });
  return new PropView(def, body, (t) => {
    for (const pivot of levers) pivot.rotation.x = 0.7 - 1.4 * t;
  });
}

/** Esquema clavado en la pared: el orden de encendido, con chinchetas en las esquinas. */
function buildDiagram(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const face =
    content?.kind === 'order'
      ? new MeshStandardMaterial({
          map: ctx.textures.orderCard(content.symbols, TEXTS.clues.switchOrderTitle, w / h),
          roughness: 0.9,
        })
      : mat(null, 0xf3e8cf);
  const edge = mat(null, 0xf3e8cf);
  body.add(mesh(new BoxGeometry(w, h, Math.min(d, 0.004)), [edge, edge, edge, edge, face, edge]));
  const tackMat = mat(null, 0xb83a2e);
  const tackGeo = new CylinderGeometry(0.008, 0.008, 0.008, 8);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const tack = mesh(tackGeo, tackMat);
      tack.rotation.x = Math.PI / 2;
      tack.position.set(sx * (w / 2 - 0.02), sy * (h / 2 - 0.02), 0.006);
      body.add(tack);
    }
  }
  return new PropView(def, body, noop);
}

/**
 * Caja de luz: el marco está siempre; la pantalla con la calibración solo se enciende (y se
 * puede examinar) después de los interruptores.
 */
function buildLightBox(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  body.add(mesh(new BoxGeometry(w, h, d), metal(0x4a4f52)));
  const dark = new Mesh(
    new PlaneGeometry(w * 0.88, h * 0.82),
    new MeshStandardMaterial({ color: 0x1e2224, roughness: 0.3 }),
  );
  dark.position.z = d / 2 + 0.001;
  const puzzle = ctx.room.puzzles.find((p) => p.type === 'dial' && p.clue === def.clue);
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const map =
    content?.kind === 'positions' && puzzle?.type === 'dial'
      ? ctx.textures.dialClue(content.positions, puzzle.positions, TEXTS.clues.dialsTitle, w / h)
      : null;
  const screen = new Mesh(
    new PlaneGeometry(w * 0.88, h * 0.82),
    new MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: 0xffffff,
      emissiveIntensity: 0.55,
      roughness: 0.6,
    }),
  );
  screen.position.z = d / 2 + 0.002;
  body.add(dark, screen);
  const view = new PropView(def, body, noop);
  view.onVisible = (lit) => {
    screen.visible = lit;
    dark.visible = !lit;
  };
  return view;
}

/** Caja fuerte de acero con tres diales en la puerta; se abre hacia delante. */
function buildSafe(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const steel = new MeshStandardMaterial({ color: 0x55606a, roughness: 0.4, metalness: 0.6 });
  const body = new Group();
  const doorDepth = 0.04;
  const box = buildOpenBox(w, h, d - doorDepth, 'pz', steel, interiorMaterial(0x24282b));
  box.position.z = -doorDepth / 2;
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.lock);
  const dials = puzzle?.type === 'dial' ? puzzle.dials : 3;
  const { group, hinge } = hinged(w * 0.98, h * 0.98, doorDepth, steel, (panel) => {
    const dialGeo = new CylinderGeometry(0.045, 0.045, 0.02, 24);
    const dialMat = metal(0xc9c9c2);
    const needleMat = mat(null, 0x1a1a1a);
    for (let i = 0; i < dials; i++) {
      const dial = mesh(dialGeo, dialMat);
      dial.rotation.x = Math.PI / 2;
      dial.position.set((i - (dials - 1) / 2) * w * 0.27, h * 0.15, doorDepth / 2 + 0.01);
      const needle = mesh(new BoxGeometry(0.008, 0.012, 0.035), needleMat);
      needle.position.set(0, 0.012, -0.015);
      dial.add(needle);
      panel.add(dial);
    }
    const handle = mesh(new BoxGeometry(0.12, 0.025, 0.03), metal(0x8a8a84));
    handle.position.set(0, -h * 0.2, doorDepth / 2 + 0.015);
    panel.add(handle);
  });
  group.position.z = d / 2 - doorDepth / 2;
  body.add(box, group);
  return new PropView(def, body, (t) => {
    hinge.rotation.y = (-Math.PI / 2) * t;
  });
}

/** Piezas sueltas: mango, punta, brazo y empuñadura de la manivela. */
function buildPart(def: InteractableDef): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  switch (def.prop) {
    case 'handle': {
      const grip = mesh(new CylinderGeometry(h / 2, h / 2, w * 0.8, 16), mat(null, 0xd9a33a));
      grip.rotation.z = Math.PI / 2;
      const ferrule = mesh(new CylinderGeometry(h / 3, h / 3, w * 0.2, 12), metal(0xb0b0b0));
      ferrule.rotation.z = Math.PI / 2;
      ferrule.position.x = w * 0.5;
      body.add(grip, ferrule);
      break;
    }
    case 'bit': {
      const shaft = mesh(new CylinderGeometry(0.006, 0.006, w * 0.85, 8), metal(0xc8c8c8));
      shaft.rotation.z = Math.PI / 2;
      const tip = mesh(new BoxGeometry(w * 0.15, 0.003, 0.014), metal(0xc8c8c8));
      tip.position.x = w * 0.5;
      body.add(shaft, tip);
      break;
    }
    case 'crankArm': {
      const iron = metal(0x6a6f73);
      const bar = mesh(new BoxGeometry(w, h, 0.02), iron);
      const elbow = mesh(new BoxGeometry(0.02, h, d), iron);
      elbow.position.set(w / 2 - 0.01, 0, d / 2 - 0.01);
      body.add(bar, elbow);
      break;
    }
    case 'crankGrip': {
      const knob = mesh(new CylinderGeometry(w / 2, w / 2, d * 0.7, 16), mat(null, 0x6b3a20));
      knob.rotation.x = Math.PI / 2;
      const peg = mesh(new CylinderGeometry(0.008, 0.008, d * 0.3, 8), metal(0x6a6f73));
      peg.rotation.x = Math.PI / 2;
      peg.position.z = d * 0.5;
      body.add(knob, peg);
      break;
    }
    default:
      break;
  }
  return body;
}

/** Construye un objeto del taller, o null si el tipo no es de esta sala. */
export function createWorkshopProp(def: InteractableDef, ctx: PropContext): PropView | null {
  switch (def.prop) {
    case 'toolbox':
      return buildToolbox(def);
    case 'fuseCover':
      return buildFuseCover(def);
    case 'switchboard':
      return buildSwitchboard(def, ctx);
    case 'diagram':
      return buildDiagram(def, ctx);
    case 'lightBox':
      return buildLightBox(def, ctx);
    case 'safe':
      return buildSafe(def, ctx);
    case 'handle':
    case 'bit':
    case 'crankArm':
    case 'crankGrip':
      return new PropView(def, buildPart(def), noop);
    default:
      return null;
  }
}
