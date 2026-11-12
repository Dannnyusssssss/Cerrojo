import { defineConfig, type Plugin } from 'vitest/config';
import { GAME_TITLE } from './src/data/meta.ts';

// Inserta el título del juego en index.html desde su única fuente (src/data/meta.ts).
function injectTitle(): Plugin {
  return {
    name: 'inject-title',
    transformIndexHtml(html) {
      return html.replace('%GAME_TITLE%', GAME_TITLE);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [injectTitle()],
  build: {
    sourcemap: false,
    modulePreload: { polyfill: false },
    // Publica junto al juego el texto de licencia de cada dependencia incluida (Three.js, MIT).
    license: { fileName: 'third-party-licenses.md' },
    // Three.js es casi todo el peso del paquete; el tamaño se mide y se anota al publicar.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
