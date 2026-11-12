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
  /**
   * Un toque que se mueve menos que esto (en px) es un toque de interacción, dure lo que dure:
   * ningún paso exige rapidez.
   */
  tapMaxMove: 12,
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
  /** Volumen general, de 0 a 1 (moderado por defecto). */
  volume: number;
  reduceMotion: boolean;
  /** Mostrar el cronómetro durante la partida (sigue contando aunque esté oculto). */
  showTimer: boolean;
}

/** Rangos válidos de los ajustes numéricos (los usa la validación y la interfaz). */
export const SETTINGS_RANGES = {
  sensitivity: { min: 0.2, max: 3, step: 0.1 },
  fov: { min: 60, max: 100, step: 1 },
  volume: { min: 0, max: 1, step: 0.1 },
} as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  sensitivity: 1,
  invertY: false,
  fov: 75,
  quality: 'medium',
  muted: false,
  volume: 0.6,
  reduceMotion: false,
  showTimer: true,
};

/** Límites de las entradas externas. */
export const INPUT_LIMITS = {
  /** Tamaño máximo del guardado en caracteres; más se descarta sin analizarlo. */
  maxSaveChars: 64 * 1024,
  /** Longitud máxima de la parte de búsqueda de la URL. */
  maxSearchChars: 512,
} as const;

/** Límites de lo que se guarda de la partida (todo dato leído fuera de rango se descarta). */
export const SAVE_LIMITS = {
  /** Acciones de una partida en curso; una sala real necesita muchas menos. */
  maxActions: 400,
  /** Longitud de un identificador de objeto o puzzle. */
  maxIdChars: 40,
  /** Valores de una combinación o de un orden de interruptores. */
  maxValues: 12,
  /** Pasos de lógica: 100 horas a 60 pasos por segundo. */
  maxSteps: 100 * 3600 * 60,
  /** Una marca de menos de 10 segundos es imposible y se descarta. */
  minRecordSteps: 10 * 60,
  /** Cada cuántos pasos se guarda el tiempo de la partida en curso (10 s). */
  saveEverySteps: 10 * 60,
} as const;

/** Parámetros de depuración aceptados en la URL (documentados en docs/DEBUG.md). */
export const DEBUG_PARAMS = {
  debug: 'debug',
  seed: 'seed',
  room: 'room',
} as const;
