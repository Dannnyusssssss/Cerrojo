/** Todos los textos visibles del juego. */
import { GAME_TITLE } from './meta';

export const TEXTS = {
  title: GAME_TITLE,
  tagline: 'Examina, relaciona y abre. Sin prisa.',
  contentNote:
    'Misterio tranquilo, apto para todos. Sin sustos, sin violencia y sin cuenta atrás. ' +
    'El juego guarda tus ajustes solo en este navegador.',
  start: {
    play: 'Jugar',
    settings: 'Ajustes',
    howToTitle: 'Cómo se juega',
    howTo: [
      'Teclado y ratón: WASD para caminar, ratón para mirar, clic o E para interactuar.',
      'Solo teclado: flechas para girar, WASD para caminar, E para interactuar.',
      'Táctil: joystick para caminar, arrastra para mirar, toca un objeto para interactuar.',
      'Esc o P: pausa.',
    ],
  },
  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    settings: 'Ajustes',
    clickToContinue: 'Haz clic para continuar',
  },
  settings: {
    title: 'Ajustes',
    sensitivity: 'Sensibilidad',
    invertY: 'Invertir eje vertical',
    fov: 'Campo de visión',
    quality: 'Calidad',
    qualityNames: { low: 'Baja', medium: 'Media', high: 'Alta' },
    muted: 'Silencio',
    reduceMotion: 'Reducir movimiento',
    back: 'Volver',
  },
  hud: {
    reticle: 'Retícula',
    pauseButton: 'Pausa',
    interactButton: 'Interactuar',
    joystick: 'Mover',
    mutedOn: 'Sonido silenciado',
    mutedOff: 'Sonido activado',
  },
  actions: {
    examine: 'Examinar',
    open: 'Abrir',
    close: 'Cerrar',
  },
  inspect: {
    back: 'Volver',
    help: 'Arrastra o usa las flechas para girar. Esc, E o «Volver» para salir.',
  },
  objects: {
    box: 'Caja de madera',
    book: 'Libro',
    drawer: 'Cajón',
    clock: 'Reloj de pared',
    cabinet: 'Armario',
  },
  inscriptions: {
    book: 'Lo que buscas está a la vista.',
  },
  errors: {
    generic: 'Algo salió mal. Recarga la página para seguir jugando.',
    noWebgl:
      'Tu navegador o tu dispositivo no puede mostrar gráficos 3D (WebGL). Prueba con otro navegador o activa la aceleración por hardware.',
    contextLost: 'Se perdieron los gráficos. Espera un momento; el juego seguirá en pausa.',
    saveUnavailable: 'No se pueden guardar los ajustes en este navegador. Puedes jugar igual.',
  },
  debug: {
    fps: 'FPS',
    drawCalls: 'Llamadas de dibujo',
    seed: 'Semilla',
    withAids: 'Con ayudas de depuración',
  },
} as const;

export type ObjectNameKey = keyof typeof TEXTS.objects;
