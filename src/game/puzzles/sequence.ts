/**
 * Interruptores en orden: hay que accionarlos todos, cada uno una vez, en el orden que indica
 * una pista. El panel no dice si cada pulsación va bien: solo se comprueba al accionar el
 * último. Así el orden no se puede descubrir probando pulsación a pulsación y hace falta la
 * pista. Si el orden no es el correcto, los interruptores vuelven a su sitio sin más.
 */
import type { SequenceDef } from '../room';
import type { KnownClue } from './clue';

/**
 * pressed: accionado, faltan más. solved: era el último y el orden es correcto.
 * wrong: era el último y el orden no es correcto (todo vuelve a su sitio).
 * invalid: interruptor inexistente o ya accionado en este intento (no cambia nada).
 */
export type PressResult = 'pressed' | 'wrong' | 'solved' | 'invalid';

/**
 * Resultado de accionar el interruptor `index`, dado el orden correcto (`answer`, índices de
 * los interruptores) y los ya accionados en este intento (`pressed`, en orden).
 */
export function pressSwitch(
  answer: readonly number[],
  pressed: readonly number[],
  index: number,
): { pressed: number[]; result: PressResult } {
  const valid = Number.isInteger(index) && index >= 0 && index < answer.length;
  if (!valid || pressed.includes(index)) return { pressed: [...pressed], result: 'invalid' };
  const next = [...pressed, index];
  if (next.length < answer.length) return { pressed: next, result: 'pressed' };
  const right = next.every((value, i) => answer[i] === value);
  return right ? { pressed: next, result: 'solved' } : { pressed: [], result: 'wrong' };
}

/**
 * Deduce el orden de pulsación (índices de los interruptores) a partir de la pista. Devuelve
 * null si no se conoce la pista o si no lleva a un único orden.
 */
export function sequenceFromClue(def: SequenceDef, known: KnownClue): number[] | null {
  const content = known(def.orderClue);
  if (content?.kind !== 'order' || content.symbols.length !== def.switches.length) return null;
  if (new Set(def.switches).size !== def.switches.length) return null;
  const order = content.symbols.map((symbol) => def.switches.indexOf(symbol));
  if (order.some((i) => i < 0) || new Set(order).size !== order.length) return null;
  return order;
}
