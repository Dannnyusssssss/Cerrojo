/**
 * Iconos SVG creados con nodos (nunca con HTML como texto): las formas de los puzzles y los
 * objetos del inventario. Se distinguen por su contorno, no por su color.
 */
import { SHAPE_POINTS, type ShapeKey } from '../data/shapes';
import type { ItemIcon } from '../game/room';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Readonly<Record<string, string>>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function frame(): SVGSVGElement {
  return svgEl('svg', {
    viewBox: '0 0 100 100',
    class: 'icon',
    'aria-hidden': 'true',
    focusable: 'false',
  });
}

/** Forma de un puzzle. `filled` la rellena; si no, solo el contorno (una silueta vacía). */
export function shapeIcon(shape: ShapeKey, filled: boolean): SVGSVGElement {
  const svg = frame();
  const style = filled
    ? { fill: 'currentColor', stroke: 'currentColor', 'stroke-width': '4' }
    : { fill: 'none', stroke: 'currentColor', 'stroke-width': '7', 'stroke-dasharray': '10 6' };
  if (shape === 'circle') {
    svg.appendChild(svgEl('circle', { cx: '50', cy: '50', r: '42', ...style }));
  } else {
    const points = SHAPE_POINTS[shape].map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
    svg.appendChild(svgEl('polygon', { points, ...style }));
  }
  return svg;
}

/** Icono de un objeto de inventario. */
export function itemIcon(icon: ItemIcon, shape?: ShapeKey): SVGSVGElement {
  if (icon === 'block' && shape !== undefined) return shapeIcon(shape, true);
  const svg = frame();
  const width = icon === 'doorKey' ? '9' : '7';
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': width,
    'stroke-linecap': 'round',
  };
  svg.appendChild(
    svgEl('circle', { cx: '28', cy: '50', r: icon === 'doorKey' ? '18' : '14', ...stroke }),
  );
  svg.appendChild(svgEl('line', { x1: '44', y1: '50', x2: '88', y2: '50', ...stroke }));
  svg.appendChild(svgEl('line', { x1: '74', y1: '50', x2: '74', y2: '66', ...stroke }));
  svg.appendChild(svgEl('line', { x1: '86', y1: '50', x2: '86', y2: '62', ...stroke }));
  return svg;
}
