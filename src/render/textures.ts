/**
 * Texturas dibujadas con Canvas (sin archivos externos). El ruido usa core/rng con semillas
 * fijas, así que cada textura se ve igual en cada partida.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { Rng } from '../core/rng';
import type { ShapeKey } from '../data/shapes';
import { traceShape } from './canvas-shapes';

/** Papel y tinta de las pistas: contraste alto para que se lean bien. */
const PAPER = '#f3e8cf';
const INK = '#22160c';

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

export class TextureFactory {
  private readonly size: number;
  private readonly cache = new Map<string, Texture>();

  constructor(size: number) {
    this.size = size;
  }

  private make(key: string, draw: Draw, repeat?: { x: number; y: number }): Texture {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = this.size;
    canvas.height = this.size;
    const ctx = canvas.getContext('2d');
    if (ctx) draw(ctx, this.size);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    if (repeat) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeat.x, repeat.y);
    }
    this.cache.set(key, texture);
    return texture;
  }

  wood(repeat = { x: 1, y: 1 }): Texture {
    return this.make(
      `wood-${repeat.x}-${repeat.y}`,
      (ctx, s) => {
        const rng = new Rng(11);
        ctx.fillStyle = '#8a5a34';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 70; i++) {
          const y = rng.next() * s;
          ctx.strokeStyle = rng.next() > 0.5 ? 'rgba(60,35,18,0.25)' : 'rgba(170,120,75,0.2)';
          ctx.lineWidth = 1 + rng.next() * 3;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(s * 0.3, y + rng.next() * 8 - 4, s * 0.7, y - 4, s, y + rng.next() * 6);
          ctx.stroke();
        }
      },
      repeat,
    );
  }

  floor(repeat: { x: number; y: number }): Texture {
    return this.make(
      'floor',
      (ctx, s) => {
        const rng = new Rng(23);
        const planks = 6;
        const h = s / planks;
        for (let i = 0; i < planks; i++) {
          const shade = 120 + Math.floor(rng.next() * 30);
          ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.7)}, ${Math.floor(shade * 0.45)})`;
          ctx.fillRect(0, i * h, s, h);
          ctx.fillStyle = 'rgba(40,25,15,0.6)';
          ctx.fillRect(0, i * h, s, 2);
          const cut = rng.next() * s;
          ctx.fillRect(cut, i * h, 2, h);
        }
      },
      repeat,
    );
  }

  wallpaper(repeat: { x: number; y: number }): Texture {
    return this.make(
      'wallpaper',
      (ctx, s) => {
        ctx.fillStyle = '#c9b38f';
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = 'rgba(120,95,60,0.25)';
        ctx.lineWidth = Math.max(1, s / 128);
        const stripes = 8;
        for (let i = 0; i < stripes; i++) {
          const x = (i + 0.5) * (s / stripes);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, s);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(140,105,65,0.22)';
        for (let i = 0; i < stripes; i++) {
          for (let j = 0; j < stripes; j++) {
            ctx.beginPath();
            ctx.arc(i * (s / stripes), (j + 0.5) * (s / stripes), s / 64, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      repeat,
    );
  }

  /** Ladrillo visto (paredes del taller). */
  brick(repeat: { x: number; y: number }): Texture {
    return this.make(
      'brick',
      (ctx, s) => {
        const rng = new Rng(31);
        ctx.fillStyle = '#b9ad9c';
        ctx.fillRect(0, 0, s, s);
        const rows = 8;
        const cols = 4;
        const h = s / rows;
        const w = s / cols;
        const gap = Math.max(1, s / 128);
        for (let r = 0; r < rows; r++) {
          const shift = r % 2 === 0 ? 0 : w / 2;
          for (let c = -1; c < cols; c++) {
            const tone = 130 + Math.floor(rng.next() * 35);
            ctx.fillStyle = `rgb(${tone + 25}, ${Math.floor(tone * 0.62)}, ${Math.floor(tone * 0.48)})`;
            ctx.fillRect(c * w + shift + gap, r * h + gap, w - gap * 2, h - gap * 2);
          }
        }
      },
      repeat,
    );
  }

  ceiling(): Texture {
    return this.make('ceiling', (ctx, s) => {
      const rng = new Rng(5);
      ctx.fillStyle = '#e8e0d2';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(150,140,120,${rng.next() * 0.15})`;
        ctx.fillRect(rng.next() * s, rng.next() * s, 2, 2);
      }
    });
  }

  clockFace(): Texture {
    return this.make('clock-face', (ctx, s) => {
      const c = s / 2;
      ctx.fillStyle = '#f3ead8';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#2b2118';
      ctx.lineWidth = s / 40;
      ctx.beginPath();
      ctx.arc(c, c, s * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const inner = i % 3 === 0 ? 0.34 : 0.39;
        ctx.lineWidth = i % 3 === 0 ? s / 40 : s / 80;
        ctx.beginPath();
        ctx.moveTo(c + Math.sin(a) * s * inner, c - Math.cos(a) * s * inner);
        ctx.lineTo(c + Math.sin(a) * s * 0.43, c - Math.cos(a) * s * 0.43);
        ctx.stroke();
      }
      // Manecillas fijas (en el Hito 2 la hora vendrá de la semilla).
      const hand = (angle: number, length: number, width: number): void => {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + Math.sin(angle) * s * length, c - Math.cos(angle) * s * length);
        ctx.stroke();
      };
      hand((10 / 12) * Math.PI * 2, 0.22, s / 30);
      hand((2 / 12) * Math.PI * 2, 0.33, s / 50);
    });
  }

  bookCover(): Texture {
    return this.make('book-cover', (ctx, s) => {
      ctx.fillStyle = '#5b2a2a';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#c9a85b';
      ctx.lineWidth = s / 40;
      ctx.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /**
   * Pista de dígito: una forma y su número, en tinta oscura sobre papel claro, a tamaño grande
   * para que se lea en la vista de examen. `background` es el color del objeto alrededor.
   * `aspect` es ancho / alto de la cara donde se pega: se compensa para que el círculo no salga
   * ovalado (y no se confunda con un cero).
   */
  digitClue(symbol: ShapeKey, digit: number, background: string, aspect = 1): Texture {
    return this.make(`digit-${symbol}-${digit}-${background}-${aspect.toFixed(2)}`, (ctx, s) => {
      // Se dibuja en un lienzo virtual de W × s que, al estirarse sobre la cara, queda sin deformar.
      ctx.scale(1 / aspect, 1);
      const W = s * aspect;
      const u = Math.min(W, s);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, s);
      ctx.fillStyle = PAPER;
      ctx.fillRect(W * 0.05, s / 2 - u * 0.32, W * 0.9, u * 0.64);
      // Tres columnas que no se tocan: forma, signo igual y dígito.
      const size = u * 0.36;
      ctx.strokeStyle = INK;
      ctx.lineWidth = u / 30;
      traceShape(ctx, symbol, W * 0.09, s / 2 - size / 2, size);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(u * 0.22)}px Georgia, 'Times New Roman', serif`;
      ctx.fillText('=', W * 0.55, s / 2);
      ctx.font = `bold ${Math.floor(u * 0.42)}px Georgia, 'Times New Roman', serif`;
      ctx.fillText(String(digit), W * 0.78, s / 2 + u * 0.02);
    });
  }

  /** Tarjeta de orden: las cuatro formas de izquierda a derecha, numeradas. */
  orderCard(symbols: readonly ShapeKey[], title: string, aspect = 1): Texture {
    return this.make(`order-${title}-${symbols.join('-')}-${aspect.toFixed(2)}`, (ctx, s) => {
      ctx.scale(1 / aspect, 1);
      const W = s * aspect;
      const u = Math.min(W, s);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, s);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = u / 60;
      ctx.strokeRect(u * 0.04, u * 0.04, W - u * 0.08, s - u * 0.08);
      ctx.fillStyle = INK;
      ctx.font = `bold ${Math.floor(u * 0.13)}px Georgia, 'Times New Roman', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, W / 2, s * 0.2);
      // Las formas van dentro del marco, con margen a cada lado.
      const left = W * 0.08;
      const cell = (W * 0.84) / Math.max(1, symbols.length);
      const size = Math.min(cell * 0.72, s * 0.4);
      symbols.forEach((symbol, i) => {
        const cx = left + i * cell + cell / 2;
        ctx.strokeStyle = INK;
        ctx.lineWidth = u / 45;
        traceShape(ctx, symbol, cx - size / 2, s * 0.56 - size / 2, size);
        ctx.stroke();
        ctx.font = `${Math.floor(u * 0.1)}px Georgia, 'Times New Roman', serif`;
        ctx.fillText(String(i + 1), cx, s * 0.86);
      });
    });
  }

  /**
   * Ficha de calibración: un dial por columna, con sus marcas (la de arriba más larga), la
   * aguja en su posición y el número de la posición debajo, para no depender del dibujo.
   */
  dialClue(positions: readonly number[], count: number, title: string, aspect = 1): Texture {
    return this.make(`dials-${positions.join('-')}-${count}-${aspect.toFixed(2)}`, (ctx, s) => {
      ctx.scale(1 / aspect, 1);
      const W = s * aspect;
      const u = Math.min(W, s);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, s);
      ctx.fillStyle = INK;
      ctx.strokeStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(u * 0.12)}px Georgia, 'Times New Roman', serif`;
      ctx.fillText(title, W / 2, s * 0.13);
      const cell = (W * 0.9) / Math.max(1, positions.length);
      const r = Math.min(cell * 0.38, s * 0.24);
      positions.forEach((position, i) => {
        const cx = W * 0.05 + cell * (i + 0.5);
        const cy = s * 0.5;
        ctx.lineWidth = u / 70;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let m = 0; m < count; m++) {
          const a = (m / count) * Math.PI * 2;
          const inner = m === 0 ? r * 0.6 : r * 0.78;
          ctx.lineWidth = m === 0 ? u / 55 : u / 110;
          ctx.beginPath();
          ctx.moveTo(cx + Math.sin(a) * inner, cy - Math.cos(a) * inner);
          ctx.lineTo(cx + Math.sin(a) * r * 0.95, cy - Math.cos(a) * r * 0.95);
          ctx.stroke();
        }
        const a = (position / count) * Math.PI * 2;
        ctx.lineWidth = u / 40;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(a) * r * 0.75, cy - Math.cos(a) * r * 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, u / 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `bold ${Math.floor(u * 0.13)}px Georgia, 'Times New Roman', serif`;
        ctx.fillText(String(position + 1), cx, s * 0.86);
      });
    });
  }

  /** Cuadro: un paisaje sencillo de colinas y sol. */
  painting(): Texture {
    return this.make('painting', (ctx, s) => {
      const sky = ctx.createLinearGradient(0, 0, 0, s);
      sky.addColorStop(0, '#9cc3d8');
      sky.addColorStop(1, '#f1dfb3');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#f6c65b';
      ctx.beginPath();
      ctx.arc(s * 0.72, s * 0.3, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      const hill = (color: string, base: number, amp: number, phase: number): void => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, s);
        for (let x = 0; x <= s; x += s / 32) {
          ctx.lineTo(x, base + Math.sin(x / (s / 3) + phase) * amp);
        }
        ctx.lineTo(s, s);
        ctx.closePath();
        ctx.fill();
      };
      hill('#7d9b5e', s * 0.66, s * 0.06, 0.4);
      hill('#56703f', s * 0.8, s * 0.05, 2.1);
    });
  }

  /** Frente de la postal: una casa con un árbol. */
  postcardFront(): Texture {
    return this.make('postcard-front', (ctx, s) => {
      ctx.fillStyle = '#e9dcc0';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#c96a4a';
      ctx.fillRect(s * 0.2, s * 0.45, s * 0.35, s * 0.35);
      ctx.fillStyle = '#7a3a2a';
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.47);
      ctx.lineTo(s * 0.375, s * 0.25);
      ctx.lineTo(s * 0.6, s * 0.47);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a7a44';
      ctx.beginPath();
      ctx.arc(s * 0.75, s * 0.5, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(s * 0.73, s * 0.6, s * 0.04, s * 0.2);
    });
  }

  /** Lomos de libros para la estantería (decorado, no interactuable). */
  bookSpines(): Texture {
    return this.make('book-spines', (ctx, s) => {
      const rng = new Rng(31);
      const colors = ['#6b3b2a', '#2f4a5a', '#5a5a2f', '#7a5a2a', '#3a2f4a', '#4a2f2f'];
      let x = 0;
      while (x < s) {
        const w = s * (0.05 + rng.next() * 0.06);
        ctx.fillStyle = colors[Math.floor(rng.next() * colors.length)] ?? '#6b3b2a';
        const top = s * (0.05 + rng.next() * 0.2);
        ctx.fillRect(x, top, w - 2, s - top);
        ctx.fillStyle = 'rgba(230,210,160,0.5)';
        ctx.fillRect(x + w * 0.2, top + s * 0.1, w * 0.5, s * 0.03);
        x += w;
      }
    });
  }

  dispose(): void {
    for (const texture of this.cache.values()) texture.dispose();
    this.cache.clear();
  }
}
