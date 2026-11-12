/**
 * Cronómetro de la sala. Cuenta pasos de lógica (no tiempo de reloj): arranca con la primera
 * acción del jugador, solo avanza cuando el modo lo permite y se detiene al terminar.
 */

export class Timer {
  private stepCount = 0;
  private startedFlag = false;
  private stoppedFlag = false;

  get steps(): number {
    return this.stepCount;
  }

  get started(): boolean {
    return this.startedFlag;
  }

  get stopped(): boolean {
    return this.stoppedFlag;
  }

  /** Primera acción del jugador (moverse, girar o interactuar). */
  start(): void {
    if (!this.stoppedFlag) this.startedFlag = true;
  }

  /** Un paso de lógica en un modo con el reloj en marcha. */
  tick(): void {
    if (this.startedFlag && !this.stoppedFlag) this.stepCount += 1;
  }

  stop(): void {
    this.stoppedFlag = true;
  }
}

/** Formatea pasos como m:ss (o h:mm:ss a partir de una hora). */
export function formatTime(steps: number, stepSeconds: number): string {
  const total = Math.max(0, Math.floor(steps * stepSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}
