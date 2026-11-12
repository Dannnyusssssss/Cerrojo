import { describe, expect, it } from 'vitest';
import { INITIAL_MODE, isWorldRunning, nextMode, type ModeState } from '../src/game/mode';

const playing: ModeState = { mode: 'playing', resumeTo: 'playing' };
const inspecting: ModeState = { mode: 'inspecting', resumeTo: 'inspecting' };

describe('modos del juego', () => {
  it('empieza en la pantalla de inicio y Jugar pasa a jugar', () => {
    expect(INITIAL_MODE.mode).toBe('title');
    expect(nextMode(INITIAL_MODE, 'start').mode).toBe('playing');
  });

  it('perder el foco pausa mientras se juega o se examina', () => {
    expect(nextMode(playing, 'focusLost')).toEqual({ mode: 'paused', resumeTo: 'playing' });
    expect(nextMode(inspecting, 'focusLost')).toEqual({ mode: 'paused', resumeTo: 'inspecting' });
  });

  it('perder el foco en el inicio no hace nada', () => {
    expect(nextMode(INITIAL_MODE, 'focusLost')).toBe(INITIAL_MODE);
  });

  it('reanudar vuelve al modo anterior a la pausa', () => {
    const paused = nextMode(inspecting, 'pause');
    expect(nextMode(paused, 'resume').mode).toBe('inspecting');
    expect(nextMode(nextMode(playing, 'pause'), 'resume').mode).toBe('playing');
  });

  it('P alterna la pausa', () => {
    const paused = nextMode(playing, 'togglePause');
    expect(paused.mode).toBe('paused');
    expect(nextMode(paused, 'togglePause').mode).toBe('playing');
  });

  it('examinar solo se abre mientras se juega y se cierra volviendo a jugar', () => {
    expect(nextMode(playing, 'inspect').mode).toBe('inspecting');
    expect(nextMode(INITIAL_MODE, 'inspect')).toBe(INITIAL_MODE);
    expect(nextMode(inspecting, 'endInspect').mode).toBe('playing');
  });

  it('cerrar el examen durante la pausa hace que al reanudar se vuelva a jugar', () => {
    const paused = nextMode(inspecting, 'pause');
    const closed = nextMode(paused, 'endInspect');
    expect(closed.mode).toBe('paused');
    expect(nextMode(closed, 'resume').mode).toBe('playing');
  });

  it('la lógica del mundo solo avanza mientras se juega', () => {
    expect(isWorldRunning('playing')).toBe(true);
    expect(isWorldRunning('inspecting')).toBe(false);
    expect(isWorldRunning('paused')).toBe(false);
    expect(isWorldRunning('title')).toBe(false);
  });
});
