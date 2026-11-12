/** Cerradura de ruedas numéricas (0 a 9). */
import type { ShapeKey } from '../../data/shapes';
import type { CodeLockDef } from '../room';

/** Gira una rueda: de 9 pasa a 0 y de 0 a 9. */
export function stepWheel(digit: number, delta: number): number {
  return (((digit + delta) % 10) + 10) % 10;
}

export function codeMatches(answer: readonly number[], attempt: readonly number[]): boolean {
  return answer.length === attempt.length && answer.every((digit, i) => attempt[i] === digit);
}

/** Contenido de una pista generada por la semilla. */
export type ClueContent =
  | { kind: 'symbolDigit'; symbol: ShapeKey; digit: number }
  | { kind: 'order'; symbols: readonly ShapeKey[] };

/**
 * Deduce el código a partir de las pistas que se conocen. Devuelve null si falta alguna o si
 * no llevan a una única respuesta (una forma sin dígito, o con dos).
 */
export function codeFromClues(
  def: CodeLockDef,
  known: (clue: string) => ClueContent | undefined,
): number[] | null {
  const order = known(def.orderClue);
  if (order?.kind !== 'order') return null;
  const digits = new Map<ShapeKey, number>();
  for (const { clue } of def.digitClues) {
    const content = known(clue);
    if (content?.kind !== 'symbolDigit') return null;
    if (digits.has(content.symbol)) return null;
    digits.set(content.symbol, content.digit);
  }
  const code: number[] = [];
  for (const symbol of order.symbols) {
    const digit = digits.get(symbol);
    if (digit === undefined) return null;
    code.push(digit);
  }
  return new Set(order.symbols).size === order.symbols.length ? code : null;
}
