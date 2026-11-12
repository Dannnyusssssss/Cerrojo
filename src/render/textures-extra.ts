/**
 * Texturas del observatorio (Sala 3), dibujadas con Canvas: pared nocturna y globo terráqueo.
 * Usan la caché de TextureFactory, así que se liberan con ella al cambiar de sala.
 */
import type { Texture } from 'three';
import { Rng } from '../core/rng';
import type { TextureFactory } from './textures';

/** Pared azul noche con estrellas pequeñas y tenues (sin parpadeos: es una textura fija). */
export function nightWall(tx: TextureFactory, repeat: { x: number; y: number }): Texture {
  return tx.custom(
    'night-wall',
    (ctx, s) => {
      const rng = new Rng(47);
      ctx.fillStyle = '#26305a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(240, 230, 190, ${0.25 + rng.next() * 0.45})`;
        const r = Math.max(1, (s / 512) * (1 + rng.next() * 1.8));
        ctx.beginPath();
        ctx.arc(rng.next() * s, rng.next() * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    repeat,
  );
}

/** Globo terráqueo: océano azul con continentes inventados (manchas verdes) y meridianos. */
export function globeSurface(tx: TextureFactory): Texture {
  return tx.custom('globe-surface', (ctx, s) => {
    const rng = new Rng(59);
    ctx.fillStyle = '#3f74a8';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#7fa65a';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.ellipse(
        rng.next() * s,
        s * 0.15 + rng.next() * s * 0.7,
        s * (0.04 + rng.next() * 0.08),
        s * (0.03 + rng.next() * 0.06),
        rng.next() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(240, 230, 200, 0.35)';
    ctx.lineWidth = Math.max(1, s / 256);
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 8) * s, 0);
      ctx.lineTo((i / 8) * s, s);
      ctx.stroke();
    }
  });
}
