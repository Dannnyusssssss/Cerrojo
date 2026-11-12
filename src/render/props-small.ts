/**
 * Objetos pequeños sin mecanismo: libro, reloj, cuadro, llaves, bloques, postal y tarjeta.
 * Los que llevan pista la muestran en su reverso, generada a partir de la semilla.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  type Texture,
} from 'three';
import { TEXTS } from '../data/texts';
import type { InteractableDef } from '../game/room';
import type { PropContext } from './prop-view';
import { localSize, mat, mesh, metal, shapeGeometry } from './prop-kit';
import type { TextureFactory } from './textures';

/**
 * Textura de la pista de dígito que lleva el objeto, sobre un fondo del color del objeto.
 * `aspect` es ancho / alto de la cara donde se pega (para que las formas no se deformen).
 */
function clueTexture(
  def: InteractableDef,
  ctx: PropContext,
  background: string,
  aspect: number,
): Texture | null {
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  if (content?.kind !== 'symbolDigit') return null;
  return ctx.textures.digitClue(content.symbol, content.digit, background, aspect);
}

function textured(map: Texture | null, fallback: number): MeshStandardMaterial {
  return map ? new MeshStandardMaterial({ map, roughness: 0.8 }) : mat(null, fallback);
}

function buildBook(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const cover = new MeshStandardMaterial({ map: ctx.textures.bookCover(), roughness: 0.8 });
  // La contratapa (-y) tiene el ancho a lo largo de x y el alto a lo largo de z.
  const back = textured(clueTexture(def, ctx, '#5b2a2a', w / d), 0x5b2a2a);
  const pages = mat(null, 0xefe6d0);
  const spine = mat(null, 0x5b2a2a);
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z.
  body.add(mesh(new BoxGeometry(w, h, d), [pages, spine, cover, back, pages, pages]));
  return body;
}

function buildClock(def: InteractableDef, ctx: PropContext): Group {
  const { w, d } = localSize(def);
  const tx = ctx.textures;
  const body = new Group();
  const frame = mat(tx, 0x6b4a2a, 'wood');
  const face = new MeshStandardMaterial({ map: tx.clockFace(), roughness: 0.6 });
  // Orden de grupos del cilindro: lateral, tapa superior (esfera), tapa inferior (reverso).
  const disc = mesh(new CylinderGeometry(w / 2, w / 2, d, 40), [frame, face, frame]);
  disc.rotation.x = Math.PI / 2;
  // La pista va en un papel plano pegado detrás (la tapa del cilindro deformaría el texto).
  const paper = new Mesh(
    new PlaneGeometry(w * 0.66, w * 0.5),
    textured(clueTexture(def, ctx, '#f3e8cf', 0.66 / 0.5), 0xf3e8cf),
  );
  paper.position.z = -d / 2 - 0.001;
  paper.rotation.y = Math.PI;
  body.add(disc, paper);
  return body;
}

/** Cuadro con marco: el paisaje delante y la pista pegada en el reverso. */
function buildPicture(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const tx = ctx.textures;
  const body = new Group();
  body.add(mesh(new BoxGeometry(w, h, d), mat(tx, 0x5a3a1e, 'wood')));
  const front = new Mesh(
    new PlaneGeometry(w * 0.84, h * 0.8),
    new MeshStandardMaterial({ map: tx.painting(), roughness: 0.9 }),
  );
  front.position.z = d / 2 + 0.001;
  const back = new Mesh(
    new PlaneGeometry(w * 0.6, w * 0.6 * 0.66),
    textured(clueTexture(def, ctx, '#f3e8cf', 1 / 0.66), 0xf3e8cf),
  );
  back.position.z = -d / 2 - 0.001;
  back.rotation.y = Math.PI;
  body.add(front, back);
  return body;
}

/** Llave: anilla, caña y dientes. `scale` agranda la de la puerta. */
function buildKey(material: MeshStandardMaterial, scale: number): Group {
  const body = new Group();
  const ring = mesh(new TorusGeometry(0.022 * scale, 0.006 * scale, 8, 20), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.x = -0.045 * scale;
  const shaft = mesh(new CylinderGeometry(0.005 * scale, 0.005 * scale, 0.07 * scale, 8), material);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.012 * scale;
  const teeth = mesh(new BoxGeometry(0.02 * scale, 0.004 * scale, 0.02 * scale), material);
  teeth.position.set(0.04 * scale, 0, 0.01 * scale);
  body.add(ring, shaft, teeth);
  return body;
}

function buildBlock(def: InteractableDef, tx: TextureFactory): Group {
  const body = new Group();
  if (def.shape === undefined) return body;
  const size = Math.min(def.size.x, def.size.y);
  body.add(mesh(shapeGeometry(def.shape, size, size * 0.5), mat(tx, 0xd8b07a, 'wood')));
  return body;
}

/** Postal apoyada: dibujo delante y la pista escrita detrás. */
function buildPostcard(def: InteractableDef, ctx: PropContext): Group {
  const { w, h, d } = localSize(def);
  const body = new Group();
  const front = new MeshStandardMaterial({ map: ctx.textures.postcardFront(), roughness: 0.9 });
  const back = textured(clueTexture(def, ctx, '#e9dcc0', w / h), 0xe9dcc0);
  const edge = mat(null, 0xe9dcc0);
  const card = mesh(new BoxGeometry(w, h, Math.min(d, 0.006)), [
    edge,
    edge,
    edge,
    edge,
    front,
    back,
  ]);
  // Ligeramente inclinada hacia atrás, como apoyada en el fondo del armario.
  card.rotation.x = -0.12;
  body.add(card);
  return body;
}

function buildOrderCard(def: InteractableDef, ctx: PropContext): Group {
  const { w, d } = localSize(def);
  const body = new Group();
  const content = def.clue === undefined ? undefined : ctx.answers.clues.get(def.clue);
  const face =
    content?.kind === 'order'
      ? new MeshStandardMaterial({
          // La cara de arriba tiene el ancho a lo largo de x y el alto a lo largo de z.
          map: ctx.textures.orderCard(content.symbols, TEXTS.clues.orderTitle, w / d),
          roughness: 0.9,
        })
      : mat(null, 0xf3e8cf);
  const edge = mat(null, 0xf3e8cf);
  body.add(mesh(new BoxGeometry(w, 0.006, d), [edge, edge, face, edge, edge, edge]));
  return body;
}

export function buildSmallProp(def: InteractableDef, ctx: PropContext): Group {
  switch (def.prop) {
    case 'book':
      return buildBook(def, ctx);
    case 'clock':
      return buildClock(def, ctx);
    case 'picture':
      return buildPicture(def, ctx);
    case 'key':
      return buildKey(metal(0xd4b05a), 1);
    case 'doorKey':
      return buildKey(metal(0x6a6a72), 1.6);
    case 'block':
      return buildBlock(def, ctx.textures);
    case 'postcard':
      return buildPostcard(def, ctx);
    case 'orderCard':
      return buildOrderCard(def, ctx);
    default:
      return new Group();
  }
}
