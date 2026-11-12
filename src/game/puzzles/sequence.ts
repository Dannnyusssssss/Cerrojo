/**
 * Interruptores en orden: hay que accionarlos en el orden que indica una pista. Equivocarse
 * solo reinicia la secuencia (si el interruptor equivocado es el primero de la secuencia,
 * cuenta como el primer paso de un intento nuevo).
 */
import type { SequenceDef } from '../room';
import type { KnownClue } from './clue';

export type PressResult = 'right' | 'wrong' | 'solved' | 'invalid';

/**
 * Avance tras accionar el interruptor `index`, dado el orden correcto (`answer`, índices de
 * los interruptores) y cuántos se llevan bien (`progress`).
 */
export function pressSwitch(
  answer: readonly number[],
  progress: number,
  index: number,
): { progress: number; result: PressResult } {
  if (!Number.isInteger(index) || index < 0 || answer.length === 0) {
    return { progress, result: 'invalid' };
  }
  if (answer[progress] === index) {
    const next = progress + 1;
    return { progress: next, result: next === answer.length ? 'solved' : 'right' };
  }
  return { progress: answer[0] === index ? 1 : 0, result: 'wrong' };
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
