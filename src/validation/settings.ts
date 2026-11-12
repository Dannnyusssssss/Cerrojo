/** Esquema de los ajustes. Todo ajuste (guardado o de la interfaz) pasa por aquí. */
import { QUALITIES, SETTINGS_RANGES, type Settings } from '../data/config';
import { isPlainObject, readBoolean, readEnum, readNumber } from './guards';

/**
 * Construye unos ajustes válidos a partir de cualquier valor. Cada campo ausente, de tipo
 * erróneo o fuera de rango toma el valor de `defaults`. Los campos desconocidos se ignoran.
 */
export function parseSettings(value: unknown, defaults: Readonly<Settings>): Settings {
  if (!isPlainObject(value)) return { ...defaults };
  const { sensitivity, fov } = SETTINGS_RANGES;
  return {
    sensitivity: readNumber(
      value,
      'sensitivity',
      sensitivity.min,
      sensitivity.max,
      defaults.sensitivity,
    ),
    invertY: readBoolean(value, 'invertY', defaults.invertY),
    fov: readNumber(value, 'fov', fov.min, fov.max, defaults.fov),
    quality: readEnum(value, 'quality', QUALITIES, defaults.quality),
    muted: readBoolean(value, 'muted', defaults.muted),
    reduceMotion: readBoolean(value, 'reduceMotion', defaults.reduceMotion),
  };
}
