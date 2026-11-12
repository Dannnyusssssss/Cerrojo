/**
 * Formas geométricas propias de los puzzles. Se distinguen por su contorno (no por su color),
 * y se dibujan igual en las texturas (Canvas) y en la interfaz (SVG).
 */

export type ShapeKey =
  'circle' | 'triangle' | 'square' | 'diamond' | 'star' | 'hexagon' | 'cross' | 'arrow';

export const SHAPES: readonly ShapeKey[] = [
  'circle',
  'triangle',
  'square',
  'diamond',
  'star',
  'hexagon',
  'cross',
  'arrow',
];

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
  star: [
    [0.5, 0.06],
    [0.612, 0.366],
    [0.937, 0.378],
    [0.681, 0.579],
    [0.77, 0.892],
    [0.5, 0.71],
    [0.23, 0.892],
    [0.319, 0.579],
    [0.063, 0.378],
    [0.388, 0.366],
  ],
  hexagon: [
    [0.89, 0.725],
    [0.5, 0.95],
    [0.11, 0.725],
    [0.11, 0.275],
    [0.5, 0.05],
    [0.89, 0.275],
  ],
  cross: [
    [0.36, 0.06],
    [0.64, 0.06],
    [0.64, 0.36],
    [0.94, 0.36],
    [0.94, 0.64],
    [0.64, 0.64],
    [0.64, 0.94],
    [0.36, 0.94],
    [0.36, 0.64],
    [0.06, 0.64],
    [0.06, 0.36],
    [0.36, 0.36],
  ],
  arrow: [
    [0.5, 0.06],
    [0.94, 0.5],
    [0.68, 0.5],
    [0.68, 0.94],
    [0.32, 0.94],
    [0.32, 0.5],
    [0.06, 0.5],
  ],
};
