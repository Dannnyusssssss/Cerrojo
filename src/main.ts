/**
 * Arranque: lee y valida las entradas externas (URL y guardado), crea la semilla y lanza la app.
 */
import { App } from './app';
import { logError } from './core/errors';
import { seedFromWord } from './core/rng';
import { GAME_TITLE } from './data/meta';
import { initialSettings } from './game/settings';
import { getBrowserStorage, SaveStore } from './save/storage';
import { parseDebugParams } from './validation/url-params';

function createSeed(): number {
  const words = new Uint32Array(1);
  crypto.getRandomValues(words);
  return seedFromWord(words[0] ?? 0);
}

function boot(): void {
  document.title = GAME_TITLE;
  const root = document.getElementById('app');
  if (!root) return;
  window.addEventListener('error', (event) => {
    logError('window', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    logError('promise', event.reason);
  });

  const debug = parseDebugParams(window.location.search);
  const media = (query: string): boolean => window.matchMedia(query).matches;
  const defaults = initialSettings({
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    coarsePointer: media('(pointer: coarse)'),
    smallScreen: Math.min(window.screen.width, window.screen.height) < 600,
  });
  const store = new SaveStore(getBrowserStorage(), defaults);
  store.load();
  const seed = debug.seed ?? createSeed();
  new App(root, { seed, debug, store, newSeed: createSeed }).start();
}

boot();
