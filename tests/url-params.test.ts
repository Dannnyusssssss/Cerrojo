import { describe, expect, it } from 'vitest';
import { parseDebugParams } from '../src/validation/url-params';

/** Con tres salas, como el juego. */
const parse = (search: string) => parseDebugParams(search, 3);

describe('parámetros de depuración en la URL', () => {
  it('sin parámetros no hay depuración', () => {
    expect(parse('')).toEqual({ debug: false, seed: null, room: null });
  });

  it('debug=1 activa la depuración', () => {
    expect(parse('?debug=1')).toEqual({ debug: true, seed: null, room: null });
  });

  it('acepta una semilla válida junto con debug=1', () => {
    expect(parse('?debug=1&seed=42')).toEqual({ debug: true, seed: 42, room: null });
    expect(parse('?debug=1&seed=4294967295')).toEqual({
      debug: true,
      seed: 4294967295,
      room: null,
    });
  });

  it('ignora la semilla sin debug=1', () => {
    expect(parse('?seed=42')).toEqual({ debug: false, seed: null, room: null });
  });

  it.each([
    'true',
    'yes',
    '2',
    '01',
    ' 1',
    '<script>alert(1)</script>',
    "1' OR 1=1 --",
    '../../etc',
  ])('debug=%s no activa nada', (value) => {
    const search = `?debug=${encodeURIComponent(value)}`;
    expect(parse(search)).toEqual({ debug: false, seed: null, room: null });
  });

  it.each(['-1', '1.5', '1e3', 'abc', '4294967296', '99999999999', '', '0x10', '<img>'])(
    'semilla inválida %s se ignora',
    (value) => {
      const search = `?debug=1&seed=${encodeURIComponent(value)}`;
      expect(parse(search)).toEqual({ debug: true, seed: null, room: null });
    },
  );

  it('una búsqueda gigante se ignora entera', () => {
    const search = `?debug=1&seed=7&pad=${'x'.repeat(2_000_000)}`;
    expect(parse(search)).toEqual({ debug: false, seed: null, room: null });
  });

  it('parámetros desconocidos y __proto__ no tienen efecto', () => {
    expect(parse('?debug=1&__proto__=x&constructor=y&admin=1')).toEqual({
      debug: true,
      seed: null,
      room: null,
    });
  });

  it('acepta una sala existente junto con debug=1 (1 es la primera)', () => {
    expect(parse('?debug=1&room=2')).toEqual({ debug: true, seed: null, room: 1 });
    expect(parse('?debug=1&room=3&seed=5')).toEqual({ debug: true, seed: 5, room: 2 });
    expect(parse('?room=2')).toEqual({ debug: false, seed: null, room: null });
  });

  it.each(['0', '4', '9', '-1', '1.5', '02', ' 2', 'dos', '<b>', ''])(
    'sala inválida %s se ignora',
    (value) => {
      const search = `?debug=1&room=${encodeURIComponent(value)}`;
      expect(parse(search)).toEqual({ debug: true, seed: null, room: null });
    },
  );
});
