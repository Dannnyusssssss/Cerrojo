/** Dibujo de las formas de los puzzles en Canvas (texturas de pistas y del panel). */
import { SHAPE_POINTS, type ShapeKey } from '../data/shapes';

/**
 * Traza el contorno de una forma en el cuadro (x, y, size). Quien llama decide si rellenar
 * o trazar el borde.
 */
export function traceShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeKey,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x + size / 2, y + size / 2, size * 0.44, 0, Math.PI * 2);
    return;
  }
  SHAPE_POINTS[shape].forEach(([px, py], i) => {
    const cx = x + px * size;
    const cy = y + py * size;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.closePath();
}
