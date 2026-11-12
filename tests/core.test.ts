import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import { FixedStepLoop } from '../src/core/loop';
import { lookDirection, wrapAngle } from '../src/core/math';
import { Rng } from '../src/core/rng';

describe('bucle de paso fijo', () => {
  const step = 1 / 60;

  it('un frame de exactamente un paso ejecuta un paso', () => {
    const loop = new FixedStepLoop(step, 0.25);
    expect(loop.advance(step).steps).toBe(1);
  });

  it('acumula frames cortos hasta completar un paso', () => {
    const loop = new FixedStepLoop(step, 0.25);
    expect(loop.advance(step / 2).steps).toBe(0);
    expect(loop.advance(step / 2).steps).toBe(1);
  });

  it('a 30 FPS ejecuta dos pasos por frame; a 144 FPS, a veces cero', () => {
    const slow = new FixedStepLoop(step, 0.25);
    expect(slow.advance(1 / 30).steps).toBe(2);
    const fast = new FixedStepLoop(step, 0.25);
    let total = 0;
    for (let i = 0; i < 144; i++) total += fast.advance(1 / 144).steps;
    expect(total).toBe(60);
  });

  it('el total de pasos no depende de la frecuencia de render', () => {
    for (const fps of [30, 50, 60, 75, 120, 144, 240]) {
      const loop = new FixedStepLoop(step, 0.25);
      let total = 0;
      for (let i = 0; i < fps * 10; i++) total += loop.advance(1 / fps).steps;
      expect(total).toBe(600);
    }
  });

  it('alpha está en [0, 1) e indica la fracción del siguiente paso', () => {
    const loop = new FixedStepLoop(step, 0.25);
    const result = loop.advance(step * 1.5);
    expect(result.steps).toBe(1);
    expect(result.alpha).toBeCloseTo(0.5, 6);
  });

  it('recorta los frames enormes (pestaña en segundo plano)', () => {
    const loop = new FixedStepLoop(step, 0.25);
    expect(loop.advance(10).steps).toBe(15);
  });

  it('ignora tiempos negativos o no finitos', () => {
    const loop = new FixedStepLoop(step, 0.25);
    expect(loop.advance(-1).steps).toBe(0);
    expect(loop.advance(Number.NaN).steps).toBe(0);
    expect(loop.advance(Number.POSITIVE_INFINITY).steps).toBe(0);
  });

  it('reset descarta lo acumulado', () => {
    const loop = new FixedStepLoop(step, 0.25);
    loop.advance(step * 0.9);
    loop.reset();
    expect(loop.advance(step * 0.5).steps).toBe(0);
  });

  it('rechaza configuraciones inválidas', () => {
    expect(() => new FixedStepLoop(0, 1)).toThrow();
    expect(() => new FixedStepLoop(1, 0.5)).toThrow();
  });
});

describe('rng con semilla', () => {
  it('la misma semilla produce la misma secuencia', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('semillas distintas producen secuencias distintas', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next queda en [0, 1)', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 10000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('nextInt cubre el rango con ambos extremos', () => {
    const rng = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = rng.nextInt(3, 6);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('nextInt rechaza rangos inválidos', () => {
    const rng = new Rng(1);
    expect(() => rng.nextInt(5, 4)).toThrow();
    expect(() => rng.nextInt(0.5, 4)).toThrow();
  });

  it('la semilla 0 y las de 32 bits funcionan', () => {
    expect(new Rng(0).next()).toBe(new Rng(0).next());
    expect(new Rng(0xffffffff).next()).toBe(new Rng(-1).next());
  });
});

describe('estado de entrada', () => {
  const axes = { x: 0, z: 0 };

  it('las teclas de movimiento combinan ejes y se normalizan en diagonal', () => {
    const input = new InputState();
    input.press('forward');
    input.press('right');
    input.moveAxes(axes);
    expect(Math.hypot(axes.x, axes.z)).toBeCloseTo(1, 6);
    expect(axes.x).toBeGreaterThan(0);
    expect(axes.z).toBeGreaterThan(0);
  });

  it('direcciones opuestas se anulan', () => {
    const input = new InputState();
    input.press('forward');
    input.press('back');
    expect(input.moveAxes(axes)).toEqual({ x: 0, z: 0 });
  });

  it('el joystick y el teclado dan la misma intención', () => {
    const keys = new InputState();
    keys.press('forward');
    const stick = new InputState();
    stick.setStick(0, 1);
    expect(keys.moveAxes({ x: 0, z: 0 })).toEqual(stick.moveAxes({ x: 0, z: 0 }));
  });

  it('el joystick se limita a [-1, 1] e ignora valores no finitos', () => {
    const input = new InputState();
    input.setStick(5, -5);
    const result = input.moveAxes(axes);
    expect(Math.hypot(result.x, result.z)).toBeCloseTo(1, 6);
    input.setStick(Number.NaN, 0);
    expect(input.moveAxes(axes)).toEqual({ x: 0, z: 0 });
  });

  it('las acciones se consumen una sola vez y en orden', () => {
    const input = new InputState();
    input.pushAction('interact');
    input.pushAction('pause');
    expect(input.consumeActions()).toEqual(['interact', 'pause']);
    expect(input.consumeActions()).toEqual([]);
  });

  it('el giro acumulado se consume y se vacía', () => {
    const input = new InputState();
    input.addLook(0.1, 0.2);
    input.addLook(0.1, -0.1);
    input.addLook(Number.NaN, 1);
    const look = input.consumeLook({ yaw: 0, pitch: 0 });
    expect(look.yaw).toBeCloseTo(0.2, 9);
    expect(look.pitch).toBeCloseTo(0.1, 9);
    expect(input.consumeLook({ yaw: 0, pitch: 0 })).toEqual({ yaw: 0, pitch: 0 });
  });

  it('releaseAll suelta todo', () => {
    const input = new InputState();
    input.press('forward');
    input.press('turnLeft');
    input.setStick(1, 0);
    input.releaseAll();
    expect(input.moveAxes(axes)).toEqual({ x: 0, z: 0 });
    expect(input.turnAxes(axes)).toEqual({ x: 0, z: 0 });
  });

  it('giro con flechas', () => {
    const input = new InputState();
    input.press('turnLeft');
    input.press('turnUp');
    expect(input.turnAxes(axes)).toEqual({ x: 1, z: 1 });
  });
});

describe('matemáticas', () => {
  it('wrapAngle deja el ángulo en (-π, π]', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5, 9);
  });

  it('lookDirection con yaw 0 mira hacia -z y es unitaria', () => {
    const dir = lookDirection(0, 0, { x: 0, y: 0, z: 0 });
    expect(dir.x).toBeCloseTo(0, 9);
    expect(dir.z).toBeCloseTo(-1, 9);
    const other = lookDirection(1.1, 0.4, { x: 0, y: 0, z: 0 });
    expect(Math.hypot(other.x, other.y, other.z)).toBeCloseTo(1, 9);
  });
});
