/** Única fuente del título y los identificadores del juego. */
export const GAME_TITLE = 'Cerrojo';
export const GAME_SLUG = 'cerrojo';
/** Prefijo de todas las claves de almacenamiento local (el portal lo usa para borrar datos). */
export const STORAGE_PREFIX = `${GAME_SLUG}:`;
export const SAVE_VERSION = 1;
export const STORAGE_KEY = `${STORAGE_PREFIX}v${SAVE_VERSION}`;
