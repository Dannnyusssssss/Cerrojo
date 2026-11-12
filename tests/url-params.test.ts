import { describe, expect, it } from 'vitest';
import { parseDebugParams } from '../src/validation/url-params';

describe('parámetros de depuración en la URL', () => {
  it('sin parámetros no hay depuración', () => {
    expect(parseDebugParams('')).toEqual({ debug: false, seed: null });
  });

  it('debug=1 activa la depuración', () => {
    expect(parseDebugParams('?debug=1')).toEqual({ debug: true, seed: null });
  });

  it('acepta una semilla válida junto con debug=1', () => {
    expect(parseDebugParams('?debug=1&seed=42')).toEqual({ debug: true, seed: 42 });
    expect(parseDebugParams('?debug=1&seed=4294967295')).toEqual({ debug: true, seed: 4294967295 });
  });

  it('ignora la semilla sin debug=1', () => {
    expect(parseDebugParams('?seed=42')).toEqual({ debug: false, seed: null });
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
    expect(parseDebugParams(search)).toEqual({ debug: false, seed: null });
  });

  it.each(['-1', '1.5', '1e3', 'abc', '4294967296', '99999999999', '', '0x10', '<img>'])(
    'semilla inválida %s se ignora',
    (value) => {
      const search = `?debug=1&seed=${encodeURIComponent(value)}`;
      expect(parseDebugParams(search)).toEqual({ debug: true, seed: null });
    },
  );

  it('una búsqueda gigante se ignora entera', () => {
    const search = `?debug=1&seed=7&pad=${'x'.repeat(2_000_000)}`;
    expect(parseDebugParams(search)).toEqual({ debug: false, seed: null });
  });

  it('parámetros desconocidos y __proto__ no tienen efecto', () => {
    expect(parseDebugParams('?debug=1&__proto__=x&constructor=y&admin=1')).toEqual({
      debug: true,
      seed: null,
    });
  });
});
