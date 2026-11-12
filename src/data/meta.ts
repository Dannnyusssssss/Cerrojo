/** Única fuente del título y los identificadores del juego. */
export const GAME_TITLE = 'Cerrojo';
export const GAME_SLUG = 'cerrojo';
/** Prefijo de todas las claves de almacenamiento local (el portal lo usa para borrar datos). */
export const STORAGE_PREFIX = `${GAME_SLUG}:`;
/** Versión del formato del guardado (va dentro del JSON; los antiguos se migran). */
export const SAVE_VERSION = 2;
/** Clave fija del guardado: no cambia con la versión del formato. */
export const STORAGE_KEY = `${STORAGE_PREFIX}v1`;
