/**
 * Bucle de paso fijo: la lógica avanza en pasos iguales (60 Hz) y el render interpola
 * entre el estado anterior y el actual con `alpha`.
 */

export interface LoopAdvance {
  /** Cuántos pasos de lógica hay que ejecutar en este frame. */
  steps: number;
  /** Fracción del siguiente paso ya transcurrida, en [0, 1), para interpolar. */
  alpha: number;
}

export class FixedStepLoop {
  private readonly step: number;
  private readonly maxFrame: number;
  private accumulator = 0;
  private readonly result: LoopAdvance = { steps: 0, alpha: 0 };

  constructor(stepSeconds: number, maxFrameSeconds: number) {
    if (!(stepSeconds > 0) || !(maxFrameSeconds >= stepSeconds)) {
      throw new RangeError('Paso de bucle inválido');
    }
    this.step = stepSeconds;
    this.maxFrame = maxFrameSeconds;
  }

  get stepSeconds(): number {
    return this.step;
  }

  /**
   * Suma el tiempo de un frame de render y devuelve los pasos a ejecutar. Un frame más largo
   * que el tope (pestaña en segundo plano, depurador) se recorta. Reutiliza el objeto devuelto.
   */
  advance(frameSeconds: number): LoopAdvance {
    const frame = Number.isFinite(frameSeconds)
      ? Math.min(Math.max(frameSeconds, 0), this.maxFrame)
      : 0;
    this.accumulator += frame;
    let steps = 0;
    // Pequeño margen para que la suma de flotantes no pierda un paso por redondeo.
    const epsilon = 1e-9;
    while (this.accumulator + epsilon >= this.step) {
      this.accumulator -= this.step;
      steps += 1;
    }
    if (this.accumulator < 0) this.accumulator = 0;
    this.result.steps = steps;
    this.result.alpha = this.accumulator / this.step;
    return this.result;
  }

  /** Descarta el tiempo acumulado (al reanudar tras una pausa). */
  reset(): void {
    this.accumulator = 0;
  }
}
