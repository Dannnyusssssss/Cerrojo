/**
 * Formas geométricas propias de los puzzles. Se distinguen por su contorno (no por su color),
 * y se dibujan igual en las texturas (Canvas) y en la interfaz (SVG).
 */

export type ShapeKey = 'circle' | 'triangle' | 'square' | 'diamond';

export const SHAPES: readonly ShapeKey[] = ['circle', 'triangle', 'square', 'diamond'];

/**
 * Contorno de cada forma en un cuadro de 0 a 1 (y hacia abajo). El círculo se dibuja como
 * círculo; los demás, como polígonos con estos vértices.
 */
export const SHAPE_POINTS: Readonly<
  Record<Exclude<ShapeKey, 'circle'>, readonly [number, number][]>
> = {
  triangle: [
    [0.5, 0.08],
    [0.94, 0.88],
    [0.06, 0.88],
  ],
  square: [
    [0.12, 0.12],
    [0.88, 0.12],
    [0.88, 0.88],
    [0.12, 0.88],
  ],
  diamond: [
    [0.5, 0.04],
    [0.94, 0.5],
    [0.5, 0.96],
    [0.06, 0.5],
  ],
};
