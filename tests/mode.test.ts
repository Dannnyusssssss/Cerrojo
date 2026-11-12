import { describe, expect, it } from 'vitest';
import {
  INITIAL_MODE,
  isClockRunning,
  isWorldRunning,
  nextMode,
  type ModeEvent,
  type ModeState,
} from '../src/game/mode';
import { formatTime, Timer } from '../src/game/timer';

const playing: ModeState = { mode: 'playing', resumeTo: 'playing' };
const inspecting: ModeState = { mode: 'inspecting', resumeTo: 'inspecting' };
const panel: ModeState = { mode: 'panel', resumeTo: 'panel' };

describe('modos del juego', () => {
  it('empieza en la pantalla de inicio y Jugar pasa a jugar', () => {
    expect(INITIAL_MODE.mode).toBe('title');
    expect(nextMode(INITIAL_MODE, 'start').mode).toBe('playing');
  });

  it('perder el foco pausa mientras se juega, se examina o hay un panel abierto', () => {
    expect(nextMode(playing, 'focusLost')).toEqual({ mode: 'paused', resumeTo: 'playing' });
    expect(nextMode(inspecting, 'focusLost')).toEqual({ mode: 'paused', resumeTo: 'inspecting' });
    expect(nextMode(panel, 'focusLost')).toEqual({ mode: 'paused', resumeTo: 'panel' });
  });

  it('perder el foco en el inicio o en el resultado no hace nada', () => {
    expect(nextMode(INITIAL_MODE, 'focusLost')).toBe(INITIAL_MODE);
    const finished = nextMode(playing, 'finish');
    expect(nextMode(finished, 'focusLost')).toBe(finished);
  });

  it('reanudar vuelve al modo anterior a la pausa', () => {
    expect(nextMode(nextMode(inspecting, 'pause'), 'resume').mode).toBe('inspecting');
    expect(nextMode(nextMode(panel, 'pause'), 'resume').mode).toBe('panel');
    expect(nextMode(nextMode(playing, 'pause'), 'resume').mode).toBe('playing');
  });

  it('P alterna la pausa', () => {
    const paused = nextMode(playing, 'togglePause');
    expect(paused.mode).toBe('paused');
    expect(nextMode(paused, 'togglePause').mode).toBe('playing');
  });

  it('examinar y los paneles solo se abren jugando y se cierran volviendo a jugar', () => {
    expect(nextMode(playing, 'inspect').mode).toBe('inspecting');
    expect(nextMode(playing, 'openPanel').mode).toBe('panel');
    expect(nextMode(INITIAL_MODE, 'inspect')).toBe(INITIAL_MODE);
    expect(nextMode(inspecting, 'openPanel')).toBe(inspecting);
    expect(nextMode(inspecting, 'endInspect').mode).toBe('playing');
    expect(nextMode(panel, 'closePanel').mode).toBe('playing');
  });

  it('cerrar el examen o el panel durante la pausa hace que al reanudar se vuelva a jugar', () => {
    const closed = nextMode(nextMode(inspecting, 'pause'), 'endInspect');
    expect(closed.mode).toBe('paused');
    expect(nextMode(closed, 'resume').mode).toBe('playing');
    const closedPanel = nextMode(nextMode(panel, 'pause'), 'closePanel');
    expect(nextMode(closedPanel, 'resume').mode).toBe('playing');
  });

  it('terminar la sala lleva al resultado; desde ahí, Repetir juega e Inicio vuelve al inicio', () => {
    const finished = nextMode(playing, 'finish');
    expect(finished.mode).toBe('finished');
    expect(nextMode(finished, 'start').mode).toBe('playing');
    expect(nextMode(finished, 'home').mode).toBe('title');
    expect(nextMode(nextMode(playing, 'pause'), 'home').mode).toBe('title');
  });

  it('la lógica del mundo solo avanza jugando; el reloj, también examinando o con un panel', () => {
    expect(isWorldRunning('playing')).toBe(true);
    expect(isWorldRunning('panel')).toBe(false);
    for (const mode of ['playing', 'inspecting', 'panel'] as const)
      expect(isClockRunning(mode)).toBe(true);
    for (const mode of ['paused', 'title', 'finished'] as const)
      expect(isClockRunning(mode)).toBe(false);
  });
});

describe('cronómetro', () => {
  /** Simula `steps` pasos de lógica en el modo actual, como hace el bucle principal. */
  const run = (timer: Timer, mode: ModeState, steps: number): void => {
    for (let i = 0; i < steps; i++) if (isClockRunning(mode.mode)) timer.tick();
  };

  it('no arranca hasta la primera acción', () => {
    const timer = new Timer();
    run(timer, playing, 120);
    expect(timer.steps).toBe(0);
    timer.start();
    run(timer, playing, 120);
    expect(timer.steps).toBe(120);
  });

  it('no avanza en pausa ni con la pestaña oculta (pierde el foco)', () => {
    const timer = new Timer();
    timer.start();
    let mode = playing;
    run(timer, mode, 60);
    for (const event of ['pause', 'focusLost'] as ModeEvent[]) {
      mode = nextMode(playing, event);
      run(timer, mode, 600);
    }
    expect(timer.steps).toBe(60);
    mode = nextMode(mode, 'resume');
    run(timer, mode, 30);
    expect(timer.steps).toBe(90);
  });

  it('sigue avanzando mientras se examina o se usa un panel', () => {
    const timer = new Timer();
    timer.start();
    run(timer, inspecting, 10);
    run(timer, panel, 10);
    expect(timer.steps).toBe(20);
  });

  it('se detiene al terminar y no vuelve a arrancar', () => {
    const timer = new Timer();
    timer.start();
    run(timer, playing, 5);
    timer.stop();
    timer.start();
    run(timer, playing, 100);
    expect(timer.steps).toBe(5);
  });

  it('formato m:ss y h:mm:ss', () => {
    expect(formatTime(0, 1 / 60)).toBe('0:00');
    expect(formatTime(60 * 65, 1 / 60)).toBe('1:05');
    expect(formatTime(60 * 3725, 1 / 60)).toBe('1:02:05');
    expect(formatTime(-5, 1 / 60)).toBe('0:00');
  });
});
