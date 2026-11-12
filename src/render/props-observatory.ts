/**
 * Objetos del observatorio (Sala 3), con geometría por código: tubo de mapas, globo, carta
 * estelar, almanaque, puerta de la cúpula con diales, telescopio, visor, planetario y las
 * piezas sueltas (esferas, lente y tubo del ocular).
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
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
import { globeSurface } from './textures-extra';

const noop = (): void => undefined;
const BRASS = 0xc9a85b;

/** Tubo de mapas: estuche de cuero con tapa de bisagra trasera y tres ruedas al frente. */
function buildMapCase(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const leather = new MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.85 });
  const base = buildOpenBox(w, h * 0.8, d, 'py', leather, interiorMaterial(0x2a1a10));
  base.position.y = -h * 0.1;
  const hinge = new Group();
  hinge.position.set(0, h * 0.3, -d / 2);
  const lid = mesh(new BoxGeometry(w * 1.02, h * 0.2, d * 1.02), leather);
  lid.position.set(0, h * 0.1, d / 2);
  hinge.add(lid);
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.lock);
  const wheels = puzzle?.type === 'code-lock' ? puzzle.symbols.length : 3;
  const plate = mesh(new BoxGeometry(w * 0.42, h * 0.3, 0.01), metal(BRASS));
  // La placa queda 4 mm por delante de la pared: si su cara trasera coincidiera con la pared
  // (de grosor cero), desde dentro parpadearían una contra otra al mover la cámara.
  plate.position.set(0, -h * 0.08, d / 2 + 0.009);
  const wheelGeo = new CylinderGeometry(0.014, 0.014, 0.02, 12);
  const wheelMat = mat(null, 0x2a1d12);
  for (let i = 0; i < wheels; i++) {
    const wheel = mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set((i - (wheels - 1) / 2) * w * 0.1, 0, 0.012);
    plate.add(wheel);
  }
  body.add(base, hinge, plate);
  return new PropView(def, body, (t) => {
    hinge.rotation.x = -1.9 * t;
  });
}

/** Globo terráqueo sobre su soporte, con una placa de latón al frente que lleva la pista. */
function buildGlobe(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const r = Math.min(w, d) * 0.42;
  const sphere = mesh(
    new SphereGeometry(r, 24, 16),
    new MeshStandardMaterial({ map: globeSurface(ctx.textures), roughness: 0.6 }),
  );
  sphere.position.y = h / 2 - r - 0.01;
  sphere.rotation.z = 0.4;
  const ring = mesh(new TorusGeometry(r * 1.08, 0.006, 6, 32), metal(BRASS));
  ring.position.copy(sphere.position);
  ring.rotation.z = 0.4;
  const stem = mesh(new CylinderGeometry(0.012, 0.012, h * 0.3, 8), metal(BRASS));
  stem.position.y = -h / 2 + h * 0.15 + 0.02;
  const foot = mesh(
    new CylinderGeometry(w * 0.4, w * 0.45, 0.04, 20),
    mat(ctx.textures, 0x6b4426, 'wood'),
  );
  foot.position.y = -h / 2 + 0.02;
  body.add(sphere, ring, stem, foot);
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  if (content?.kind === 'symbolDigit') {
    const pw = w * 0.5;
    const ph = 0.07;
    const face = new MeshStandardMaterial({
      map: ctx.textures.digitClue(content.symbol, content.digit, '#c9a85b', pw / ph),
      roughness: 0.5,
    });
    const edge = metal(BRASS);
    const plaque = mesh(new BoxGeometry(pw, ph, 0.006), [edge, edge, edge, edge, face, edge]);
    plaque.position.set(0, -h / 2 + 0.07, w * 0.42);
    plaque.rotation.x = -0.35;
    body.add(plaque);
  }
  return body;
}

/** Hoja apoyada en plano con una pista de formas en orden en la cara de arriba. */
function buildSheet(def: InteractableDef, ctx: PropContext, title: string): Group {
  const { w, d } = localSize(def);
  const body = new Group();
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const face =
    content?.kind === 'order'
      ? new MeshStandardMaterial({
          map: ctx.textures.orderCard(content.symbols, title, w / d),
          roughness: 0.9,
        })
      : mat(null, 0xe8dcc0);
  const edge = mat(null, 0xe8dcc0);
  body.add(mesh(new BoxGeometry(w, 0.006, d), [edge, edge, face, edge, edge, edge]));
  return body;
}

/** Almanaque: librito cerrado con la calibración de los diales en la tapa. */
function buildAlmanac(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const puzzle = ctx.room.puzzles.find((p) => p.type === 'dial' && p.clue === def.clue);
  const cover =
    content?.kind === 'positions' && puzzle?.type === 'dial'
      ? new MeshStandardMaterial({
          map: ctx.textures.dialClue(
            content.positions,
            puzzle.positions,
            TEXTS.clues.almanacTitle,
            w / d,
          ),
          roughness: 0.85,
        })
      : mat(null, 0x2e4a6a);
  const spine = mat(null, 0x2e4a6a);
  const pages = mat(null, 0xefe6d0);
  body.add(mesh(new BoxGeometry(w, h, d), [pages, spine, cover, spine, pages, pages]));
  return body;
}

/** Puerta de la cúpula: marco, puerta con tres diales y tirador; se abre hacia la sala. */
function buildInnerDoor(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const wood = mat(ctx.textures, 0x3e3552, 'wood');
  const hinge = new Group();
  hinge.position.x = -w / 2;
  const panel = mesh(new BoxGeometry(w, h, d), wood);
  panel.position.x = w / 2;
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.lock);
  const dials = puzzle?.type === 'dial' ? puzzle.dials : 3;
  const dialGeo = new CylinderGeometry(0.05, 0.05, 0.02, 24);
  const dialMat = metal(0xd9d2b8);
  const needleMat = mat(null, 0x1a1a1a);
  for (let i = 0; i < dials; i++) {
    const dial = mesh(dialGeo, dialMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set((i - (dials - 1) / 2) * 0.14, 0.15, d / 2 + 0.01);
    const needle = mesh(new BoxGeometry(0.008, 0.012, 0.04), needleMat);
    needle.position.set(0, 0.012, -0.018);
    dial.add(needle);
    panel.add(dial);
  }
  const handle = mesh(new CylinderGeometry(0.03, 0.03, 0.06, 16), metal(BRASS));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(w / 2 - 0.1, -0.05, d / 2 + 0.03);
  panel.add(handle);
  hinge.add(panel);
  const frameMat = mat(ctx.textures, 0x2a2238, 'wood');
  for (const sx of [-1, 1]) {
    const post = mesh(new BoxGeometry(0.06, h + 0.06, d + 0.2), frameMat);
    post.position.set(sx * (w / 2 + 0.03), 0.03, 0);
    body.add(post);
  }
  const top = mesh(new BoxGeometry(w + 0.12, 0.06, d + 0.2), frameMat);
  top.position.y = h / 2 + 0.03;
  body.add(hinge, top);
  return new PropView(def, body, (t) => {
    hinge.rotation.y = (-Math.PI / 2) * t;
  });
}

/** Telescopio: tubo inclinado sobre una montura; con el ocular puesto se ve en su extremo. */
function buildTelescope(def: InteractableDef): PropView {
  const { h, d } = localSize(def);
  const body = new Group();
  const paint = new MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.4, metalness: 0.3 });
  const tilt = new Group();
  tilt.rotation.x = 0.35;
  const tube = mesh(new CylinderGeometry(0.07, 0.08, d * 0.95, 20), paint);
  tube.rotation.x = Math.PI / 2;
  const ring = mesh(new TorusGeometry(0.075, 0.01, 6, 20), metal(BRASS));
  ring.position.z = -d * 0.47;
  const eyepiece = mesh(new CylinderGeometry(0.02, 0.025, 0.08, 12), metal(0x2a2a2a));
  eyepiece.rotation.x = Math.PI / 2;
  eyepiece.position.z = d * 0.5;
  eyepiece.visible = false;
  tilt.add(tube, ring, eyepiece);
  const mount = mesh(new BoxGeometry(0.08, h * 0.4, 0.08), metal(0x4a4a50));
  mount.position.y = -h / 2 + h * 0.2;
  body.add(tilt, mount);
  return new PropView(def, body, (t) => {
    eyepiece.visible = t > 0.5;
  });
}

/** Visor del telescopio: placa con la constelación (formas en orden) en la cara delantera. */
function buildSkyView(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const map =
    content?.kind === 'order'
      ? ctx.textures.orderCard(content.symbols, TEXTS.clues.skyTitle, w / h)
      : null;
  // El brillo sigue al propio dibujo (emissiveMap) para que la tinta siga oscura y se lea.
  const face = map
    ? new MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: 0xffffff,
        emissiveIntensity: 0.35,
        roughness: 0.6,
      })
    : mat(null, 0x1e2440);
  const rim = metal(0x2a2a2a);
  body.add(mesh(new BoxGeometry(w, h, d * 0.4), [rim, rim, rim, rim, face, rim]));
  return body;
}

/** Esfera con la forma de su marca en relieve, delante (para el planetario). */
function orbMesh(shape: ShapeKey | undefined, radius: number): Group {
  const group = new Group();
  group.add(mesh(new SphereGeometry(radius, 20, 14), mat(null, 0x8fa3c7)));
  if (shape !== undefined) {
    const mark = mesh(shapeGeometry(shape, radius * 1.1, 0.01), mat(null, 0xf3e8cf));
    mark.position.z = radius * 0.95;
    group.add(mark);
  }
  return group;
}

/**
 * Planetario: base redonda, sol en el centro y tres brazos con un hueco de silueta cada uno.
 * Al colocar una esfera aparece en su hueco; resuelto, los brazos giran un poco.
 */
function buildOrrery(def: InteractableDef, ctx: PropContext): PropView {
  const { w, h, d } = localSize(def);
  const puzzle = ctx.room.puzzles.find((p) => p.id === def.puzzle);
  const shapes: readonly ShapeKey[] =
    puzzle?.type === 'placement' ? puzzle.slots.map((s) => s.shape) : [];
  const body = new Group();
  const radius = Math.min(w, d) * 0.47;
  const base = mesh(
    new CylinderGeometry(radius, radius, 0.04, 32),
    mat(ctx.textures, 0x4a3426, 'wood'),
  );
  base.position.y = -h / 2 + 0.02;
  const sun = mesh(
    new SphereGeometry(0.05, 20, 14),
    new MeshStandardMaterial({ color: 0xf2c86b, emissive: 0xf2a83b, emissiveIntensity: 0.4 }),
  );
  sun.position.y = 0.02;
  const post = mesh(new CylinderGeometry(0.01, 0.01, h * 0.55, 8), metal(BRASS));
  post.position.y = -h / 2 + 0.04 + h * 0.275;
  const arms = new Group();
  const rimMat = mat(null, 0xe0c89a);
  const hollowMat = new MeshStandardMaterial({ color: 0x1e1309, roughness: 1 });
  const orbs = shapes.map((shape, i) => {
    // Los huecos se reparten hacia delante (+z local, de cara al jugador) en abanico.
    const angle = (i - (shapes.length - 1) / 2) * 0.9;
    const x = Math.sin(angle) * radius * 0.72;
    const z = Math.cos(angle) * radius * 0.72;
    const arm = mesh(new BoxGeometry(0.008, 0.008, radius * 0.72), metal(BRASS));
    arm.position.set(x / 2, -0.06, z / 2);
    arm.rotation.y = angle;
    const pad = mesh(new CylinderGeometry(0.05, 0.05, 0.012, 20), metal(BRASS));
    pad.position.set(x, -0.07, z);
    const rim = mesh(shapeGeometry(shape, 0.075, 0.004), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, -0.062, z);
    const hollow = mesh(shapeGeometry(shape, 0.06, 0.004), hollowMat);
    hollow.rotation.x = -Math.PI / 2;
    hollow.position.set(x, -0.06, z);
    const orb = orbMesh(shape, 0.04);
    orb.position.set(x, -0.02, z);
    orb.visible = false;
    arms.add(arm, pad, rim, hollow, orb);
    return orb;
  });
  arms.position.y = 0.02;
  body.add(base, post, sun, arms);
  return new PropView(
    def,
    body,
    (t) => {
      arms.rotation.y = t * 0.6;
    },
    (filled) => {
      orbs.forEach((orb, i) => {
        orb.visible = filled[i] === true;
      });
    },
  );
}

/** Piezas sueltas: esfera con marca, lente y tubo del ocular. */
function buildPiece(def: InteractableDef): Group {
  const { w, d } = localSize(def);
  switch (def.prop) {
    case 'orb':
      return orbMesh(def.shape, Math.min(w, d) * 0.45);
    case 'lens': {
      const body = new Group();
      const glass = new MeshStandardMaterial({
        color: 0xbfe3f2,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7,
      });
      const disc = mesh(new CylinderGeometry(w * 0.4, w * 0.4, 0.012, 24), glass);
      disc.rotation.x = Math.PI / 2;
      const rim = mesh(new TorusGeometry(w * 0.4, 0.006, 6, 24), metal(BRASS));
      body.add(disc, rim);
      return body;
    }
    case 'eyepieceTube': {
      const body = new Group();
      const tube = mesh(new CylinderGeometry(0.018, 0.018, w * 0.9, 12), metal(BRASS));
      tube.rotation.z = Math.PI / 2;
      for (const x of [-w * 0.3, w * 0.3]) {
        const ring = mesh(new TorusGeometry(0.019, 0.004, 6, 16), metal(0x6a5430));
        ring.rotation.y = Math.PI / 2;
        ring.position.x = x;
        body.add(ring);
      }
      body.add(tube);
      return body;
    }
    default:
      return new Group();
  }
}

/** Construye un objeto del observatorio, o null si el tipo no es de esta sala. */
export function createObservatoryProp(def: InteractableDef, ctx: PropContext): PropView | null {
  switch (def.prop) {
    case 'mapCase':
      return buildMapCase(def, ctx);
    case 'globe':
      return new PropView(def, buildGlobe(def, ctx), noop);
    case 'starChart':
      return new PropView(def, buildSheet(def, ctx, TEXTS.clues.starChartTitle), noop);
    case 'almanac':
      return new PropView(def, buildAlmanac(def, ctx), noop);
    case 'innerDoor':
      return buildInnerDoor(def, ctx);
    case 'telescope':
      return buildTelescope(def);
    case 'skyView':
      return new PropView(def, buildSkyView(def, ctx), noop);
    case 'orrery':
      return buildOrrery(def, ctx);
    case 'orb':
    case 'lens':
    case 'eyepieceTube':
      return new PropView(def, buildPiece(def), noop);
    default:
      return null;
  }
}
