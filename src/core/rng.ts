/**
 * Generador pseudoaleatorio con semilla (mulberry32). Toda la aleatoriedad de la lógica pasa
 * por aquí: la misma semilla produce siempre la misma secuencia.
 */

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Número en [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max], ambos incluidos. */
  nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError('Rango inválido');
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/** Convierte una palabra de 32 bits (de crypto.getRandomValues en el arranque) en semilla. */
export function seedFromWord(word: number): number {
  return word >>> 0;
}
