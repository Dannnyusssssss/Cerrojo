import { describe, expect, it } from 'vitest';
import { InputState } from '../src/core/input';
import {
  dragToLook,
  isTap,
  joystickAxes,
  keyToIntent,
  mouseToLook,
  shouldPreventDefault,
} from '../src/ui/input-map';

const noMods = { ctrl: false, alt: false, meta: false };

describe('traducción de teclas', () => {
  it.each([
    ['KeyW', 'forward'],
    ['KeyS', 'back'],
    ['KeyA', 'left'],
    ['KeyD', 'right'],
    ['ArrowLeft', 'turnLeft'],
    ['ArrowRight', 'turnRight'],
    ['ArrowUp', 'turnUp'],
    ['ArrowDown', 'turnDown'],
  ])('%s → %s (mantenida)', (code, intent) => {
    expect(keyToIntent(code, noMods)).toEqual({ kind: 'held', intent });
  });

  it.each([
    ['KeyE', 'interact'],
    ['KeyP', 'pause'],
    ['Escape', 'back'],
    ['KeyM', 'mute'],
  ])('%s → %s (acción)', (code, intent) => {
    expect(keyToIntent(code, noMods)).toEqual({ kind: 'action', intent });
  });

  it('teclas desconocidas y nombres del prototipo no son del juego', () => {
    for (const code of ['KeyZ', 'Tab', '', '__proto__', 'constructor', 'toString']) {
      expect(keyToIntent(code, noMods)).toBeNull();
    }
  });

  it('con Ctrl, Alt o Meta se deja la tecla al navegador', () => {
    expect(keyToIntent('KeyW', { ...noMods, ctrl: true })).toBeNull();
    expect(keyToIntent('KeyE', { ...noMods, alt: true })).toBeNull();
    expect(keyToIntent('KeyP', { ...noMods, meta: true })).toBeNull();
  });

  it('solo se evita la acción por defecto en flechas y espacio', () => {
    expect(shouldPreventDefault('ArrowUp')).toBe(true);
    expect(shouldPreventDefault('Space')).toBe(true);
    expect(shouldPreventDefault('Tab')).toBe(false);
    expect(shouldPreventDefault('Escape')).toBe(false);
    expect(shouldPreventDefault('KeyW')).toBe(false);
  });
});

describe('traducción de ratón y táctil', () => {
  it('ratón a la derecha gira a la derecha; arriba mira arriba', () => {
    const look = mouseToLook(10, -10, 1, false);
    expect(look?.yaw).toBeLessThan(0);
    expect(look?.pitch).toBeGreaterThan(0);
  });

  it('el eje invertido cambia el signo vertical', () => {
    const normal = mouseToLook(0, 10, 1, false);
    const inverted = mouseToLook(0, 10, 1, true);
    expect(inverted?.pitch).toBeCloseTo(-(normal?.pitch ?? 0), 9);
  });

  it('la sensibilidad escala el giro', () => {
    const base = mouseToLook(10, 0, 1, false);
    const double = mouseToLook(10, 0, 2, false);
    expect(double?.yaw).toBeCloseTo((base?.yaw ?? 0) * 2, 9);
  });

  it('descarta saltos anómalos y valores no finitos', () => {
    expect(mouseToLook(5000, 0, 1, false)).toBeNull();
    expect(mouseToLook(0, -5000, 1, false)).toBeNull();
    expect(mouseToLook(Number.NaN, 0, 1, false)).toBeNull();
  });

  it('arrastre táctil y ratón giran en el mismo sentido', () => {
    const mouse = mouseToLook(10, 10, 1, false);
    const drag = dragToLook(10, 10, 1, false);
    expect(Math.sign(drag.yaw)).toBe(Math.sign(mouse?.yaw ?? 0));
    expect(Math.sign(drag.pitch)).toBe(Math.sign(mouse?.pitch ?? 0));
  });

  it('joystick: arriba es avanzar y la longitud se limita a 1', () => {
    expect(joystickAxes(0, -56, 56)).toEqual({ x: 0, z: 1 });
    const far = joystickAxes(300, 300, 56);
    expect(Math.hypot(far.x, far.z)).toBeCloseTo(1, 6);
    expect(joystickAxes(10, 10, 0)).toEqual({ x: 0, z: 0 });
  });

  it('joystick y teclado producen la misma intención de avanzar', () => {
    const stick = new InputState();
    const axes = joystickAxes(0, -56, 56);
    stick.setStick(axes.x, axes.z);
    const keys = new InputState();
    keys.press('forward');
    expect(stick.moveAxes({ x: 0, z: 0 })).toEqual(keys.moveAxes({ x: 0, z: 0 }));
  });

  it('un toque corto y quieto es interacción; un arrastre no', () => {
    expect(isTap(3, 120)).toBe(true);
    expect(isTap(40, 120)).toBe(false);
    expect(isTap(3, 900)).toBe(false);
  });
});
