/**
 * Manejo central de errores. Al jugador solo se le muestra un mensaje genérico de texts.ts;
 * el detalle técnico queda en el registro interno (consola).
 */

export type ErrorKind = 'generic' | 'noWebgl' | 'contextLost' | 'saveUnavailable';

export class GameError extends Error {
  readonly kind: ErrorKind;

  constructor(kind: ErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GameError';
    this.kind = kind;
  }
}

/** Devuelve el tipo de mensaje que debe ver el jugador para cualquier error. */
export function errorKindOf(error: unknown): ErrorKind {
  return error instanceof GameError ? error.kind : 'generic';
}

/** Registro interno. No se envía a ningún servidor. */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}
