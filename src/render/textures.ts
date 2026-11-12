/**
 * Texturas dibujadas con Canvas (sin archivos externos). El ruido usa core/rng con semillas
 * fijas, así que cada textura se ve igual en cada partida.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { Rng } from '../core/rng';

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

  /** Contratapa con una inscripción legible en la vista de examen. */
  bookBack(text: string): Texture {
    return this.make(`book-back-${text}`, (ctx, s) => {
      ctx.fillStyle = '#5b2a2a';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#f0e3c0';
      ctx.fillRect(s * 0.08, s * 0.3, s * 0.84, s * 0.4);
      ctx.fillStyle = '#2b1a10';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapText(ctx, text, s / 2, s / 2, s * 0.78, Math.floor(s / 11));
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): void {
  ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line.length === 0 ? word : `${line} ${word}`;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line.length > 0) lines.push(line);
  const lineHeight = fontSize * 1.25;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}
