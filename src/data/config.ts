/** Configuración pública del juego: todo lo que hay aquí llega al navegador y es visible. */

export const LOOP = {
  /** Duración de un paso de lógica, en segundos (60 Hz). */
  stepSeconds: 1 / 60,
  /** Tope de tiempo por frame para no encadenar cientos de pasos tras una pausa larga. */
  maxFrameSeconds: 0.25,
} as const;

export const PLAYER = {
  radius: 0.3,
  /** Velocidad de caminar en metros por segundo. */
  walkSpeed: 2.2,
  eyeHeight: 1.6,
  /** Límite de inclinación vertical de la mirada, en radianes. */
  maxPitch: 1.45,
  /** Giro con las flechas, en radianes por segundo a sensibilidad 1. */
  keyTurnSpeed: 2.0,
  /** Radianes por píxel de ratón a sensibilidad 1. */
  mouseRadiansPerPixel: 0.0025,
  /** Radianes por píxel de arrastre táctil a sensibilidad 1. */
  touchRadiansPerPixel: 0.005,
  /** Desplazamiento máximo de ratón por evento; más se considera un salto anómalo. */
  maxMouseDelta: 300,
} as const;

export const INTERACTION = {
  /** Alcance de interacción en metros, desde los ojos. */
  reach: 2,
} as const;

export const INSPECT = {
  fadeSeconds: 0.2,
  /** Giro del objeto examinado con las flechas, en radianes por segundo. */
  keyRotateSpeed: 2.2,
  dragRadiansPerPixel: 0.01,
} as const;

export const TOUCH = {
  /** Lado mínimo de un objetivo táctil, en píxeles CSS. */
  minTarget: 44,
  joystickRadius: 56,
  /** Un toque que se mueve menos que esto (en px) y dura menos que tapMs es un toque de interacción. */
  tapMaxMove: 12,
  tapMaxMs: 300,
} as const;

export type Quality = 'low' | 'medium' | 'high';
export const QUALITIES: readonly Quality[] = ['low', 'medium', 'high'];

export const QUALITY_PROFILES: Readonly<
  Record<Quality, { maxPixelRatio: number; shadows: boolean; textureSize: number }>
> = {
  low: { maxPixelRatio: 1, shadows: false, textureSize: 256 },
  medium: { maxPixelRatio: 1.5, shadows: false, textureSize: 512 },
  high: { maxPixelRatio: 2, shadows: true, textureSize: 512 },
};

export interface Settings {
  sensitivity: number;
  invertY: boolean;
  fov: number;
  quality: Quality;
  muted: boolean;
  reduceMotion: boolean;
}

/** Rangos válidos de los ajustes numéricos (los usa la validación y la interfaz). */
export const SETTINGS_RANGES = {
  sensitivity: { min: 0.2, max: 3, step: 0.1 },
  fov: { min: 60, max: 100, step: 1 },
} as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  sensitivity: 1,
  invertY: false,
  fov: 75,
  quality: 'medium',
  muted: false,
  reduceMotion: false,
};

/** Límites de las entradas externas. */
export const INPUT_LIMITS = {
  /** Tamaño máximo del guardado en caracteres; más se descarta sin analizarlo. */
  maxSaveChars: 64 * 1024,
  /** Longitud máxima de la parte de búsqueda de la URL. */
  maxSearchChars: 512,
} as const;

/** Parámetros de depuración aceptados en la URL (documentados en docs/DEBUG.md). */
export const DEBUG_PARAMS = {
  debug: 'debug',
  seed: 'seed',
} as const;
