/**
 * Contenido de las pistas generadas por la semilla. Una misma clase de pista sirve a varios
 * tipos de puzzle: una lista de formas en orden vale para la cerradura de ruedas (orden de los
 * dígitos), para los interruptores (orden de pulsación) y para la cerradura de símbolos.
 */
import type { ShapeKey } from '../../data/shapes';

export type ClueContent =
  /** Una forma y su dígito («el triángulo es un 4»). */
  | { kind: 'symbolDigit'; symbol: ShapeKey; digit: number }
  /** Formas en orden, de izquierda a derecha. */
  | { kind: 'order'; symbols: readonly ShapeKey[] }
  /** Posición de cada dial (0 es arriba, en el sentido de las agujas del reloj). */
  | { kind: 'positions'; positions: readonly number[] };

/** Busca el contenido de una pista que el jugador ya conoce (o undefined). */
export type KnownClue = (clue: string) => ClueContent | undefined;
