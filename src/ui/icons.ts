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

/**
 * Dial con aguja: un círculo con marcas en cada posición, la de arriba más larga, y la aguja
 * apuntando a `position` (0 es arriba, en el sentido de las agujas del reloj).
 */
export function dialIcon(position: number, positions: number): SVGSVGElement {
  const svg = frame();
  const line = { stroke: 'currentColor', 'stroke-linecap': 'round' };
  svg.appendChild(
    svgEl('circle', { cx: '50', cy: '50', r: '44', fill: 'none', 'stroke-width': '5', ...line }),
  );
  for (let i = 0; i < positions; i++) {
    const a = (i / positions) * Math.PI * 2;
    const inner = i === 0 ? 26 : 34;
    svg.appendChild(
      svgEl('line', {
        x1: String(50 + Math.sin(a) * inner),
        y1: String(50 - Math.cos(a) * inner),
        x2: String(50 + Math.sin(a) * 42),
        y2: String(50 - Math.cos(a) * 42),
        'stroke-width': i === 0 ? '6' : '3',
        ...line,
      }),
    );
  }
  const a = (position / positions) * Math.PI * 2;
  svg.appendChild(
    svgEl('line', {
      x1: '50',
      y1: '50',
      x2: String(50 + Math.sin(a) * 32),
      y2: String(50 - Math.cos(a) * 32),
      'stroke-width': '8',
      ...line,
    }),
  );
  svg.appendChild(svgEl('circle', { cx: '50', cy: '50', r: '7', fill: 'currentColor' }));
  return svg;
}

/** Trazo de los iconos de objetos (sin relleno). */
function strokeStyle(width: string): Record<string, string> {
  return {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
}

/** Llave: anillo, caña y dientes; la de la puerta es más gruesa y grande. */
function keyIcon(svg: SVGSVGElement, big: boolean): void {
  const stroke = strokeStyle(big ? '9' : '7');
  svg.appendChild(svgEl('circle', { cx: '28', cy: '50', r: big ? '18' : '14', ...stroke }));
  svg.appendChild(svgEl('line', { x1: '44', y1: '50', x2: '88', y2: '50', ...stroke }));
  svg.appendChild(svgEl('line', { x1: '74', y1: '50', x2: '74', y2: '66', ...stroke }));
  svg.appendChild(svgEl('line', { x1: '86', y1: '50', x2: '86', y2: '62', ...stroke }));
}

/**
 * Icono de un objeto de inventario. Cada objeto tiene una silueta distinta (no solo un color):
 * llaves con anillo, mango grueso, punta fina, destornillador (mango y punta), brazo en L,
 * empuñadura redonda y manivela (L con empuñadura).
 */
export function itemIcon(icon: ItemIcon, shape?: ShapeKey): SVGSVGElement {
  if (icon === 'block' && shape !== undefined) return shapeIcon(shape, true);
  const svg = frame();
  const thin = strokeStyle('7');
  const solid = { fill: 'currentColor' };
  switch (icon) {
    case 'key':
    case 'block':
      keyIcon(svg, false);
      break;
    case 'doorKey':
      keyIcon(svg, true);
      break;
    case 'handle':
      svg.appendChild(
        svgEl('rect', { x: '12', y: '36', width: '56', height: '28', rx: '12', ...solid }),
      );
      svg.appendChild(svgEl('rect', { x: '68', y: '42', width: '16', height: '16', ...thin }));
      break;
    case 'bit':
      svg.appendChild(svgEl('line', { x1: '14', y1: '50', x2: '76', y2: '50', ...thin }));
      svg.appendChild(svgEl('polygon', { points: '76,40 90,50 76,60', ...solid }));
      break;
    case 'screwdriver':
      svg.appendChild(
        svgEl('rect', { x: '8', y: '38', width: '38', height: '24', rx: '10', ...solid }),
      );
      svg.appendChild(svgEl('line', { x1: '46', y1: '50', x2: '82', y2: '50', ...thin }));
      svg.appendChild(svgEl('polygon', { points: '82,42 94,50 82,58', ...solid }));
      break;
    case 'crankArm':
      svg.appendChild(svgEl('polyline', { points: '14,30 70,30 70,76', ...strokeStyle('10') }));
      break;
    case 'crankGrip':
      svg.appendChild(svgEl('circle', { cx: '50', cy: '44', r: '22', ...solid }));
      svg.appendChild(svgEl('line', { x1: '50', y1: '66', x2: '50', y2: '88', ...thin }));
      break;
    case 'crank':
      svg.appendChild(svgEl('polyline', { points: '10,28 62,28 62,70', ...strokeStyle('10') }));
      svg.appendChild(svgEl('circle', { cx: '62', cy: '78', r: '14', ...solid }));
      break;
  }
  return svg;
}
