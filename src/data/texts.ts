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
      'Inventario: teclas 1 a 8, clic o toque para tomar un objeto en la mano; Esc lo suelta.',
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
    take: 'Recoger',
    use: 'Usar',
    tryCode: 'Probar combinación',
    place: 'Colocar piezas',
  },
  inspect: {
    back: 'Volver',
    help: 'Arrastra o usa las flechas para girar. Esc, E o «Volver» para salir.',
  },
  objects: {
    chest: 'Cofre',
    book: 'Libro',
    drawer: 'Cajón',
    clock: 'Reloj de pared',
    cabinet: 'Armario',
    picture: 'Cuadro',
    exitDoor: 'Puerta',
    slotPanel: 'Panel con huecos',
    smallKey: 'Llave pequeña',
    doorKey: 'Llave de la puerta',
    blockCircle: 'Bloque redondo',
    blockTriangle: 'Bloque triangular',
    blockSquare: 'Bloque cuadrado',
    postcard: 'Postal',
    orderCard: 'Tarjeta',
  },
  shapes: {
    circle: 'círculo',
    triangle: 'triángulo',
    square: 'cuadrado',
    diamond: 'rombo',
  },
  messages: {
    locked: 'Está cerrado con llave.',
    wrongItem: 'Eso no sirve aquí.',
    inventoryFull: 'No puedes llevar más objetos.',
    picked: (name: string): string => `Has recogido: ${name}.`,
    unlocked: 'La llave encaja. ¡Se abrió!',
    tutorial: 'Acércate al escritorio, mira el cajón y pulsa E (o tócalo) para abrirlo.',
    selected: (name: string): string =>
      `Llevas en la mano: ${name}. Úsalo sobre lo que quieras abrir.`,
  },
  inventory: {
    label: 'Inventario',
    slot: (n: number, name: string): string => `${n}: ${name}`,
  },
  codePanel: {
    title: 'Cerradura de combinación',
    help: 'Flechas arriba y abajo para girar, izquierda y derecha para cambiar de rueda, Enter para probar.',
    wheel: (n: number): string => `Rueda ${n}`,
    up: (n: number): string => `Subir rueda ${n}`,
    down: (n: number): string => `Bajar rueda ${n}`,
    tryButton: 'Probar',
    close: 'Cerrar',
    wrong: 'No se abre. Prueba otra combinación.',
    right: '¡Se abrió!',
  },
  placementPanel: {
    title: 'Panel con huecos',
    help: 'Elige un bloque y después el hueco donde quieras ponerlo.',
    slot: (n: number, shape: string): string => `Hueco ${n}, silueta de ${shape}`,
    filled: (n: number, shape: string): string => `Hueco ${n}: ${shape} colocado`,
    pieces: 'Tus bloques',
    noPieces: 'No llevas bloques.',
    chooseFirst: 'Primero elige un bloque.',
    wrong: 'Ese bloque no encaja en ese hueco.',
    placed: 'Encaja.',
    solved: 'Se abre un compartimento bajo los huecos.',
    close: 'Cerrar',
  },
  clues: {
    orderTitle: 'Orden',
  },
  timer: {
    label: 'Tiempo',
  },
  result: {
    title: '¡Has salido del estudio!',
    time: (t: string): string => `Tiempo: ${t}`,
    withAids: 'Partida con ayudas de depuración: no cuenta para las marcas.',
    replay: 'Repetir',
    home: 'Inicio',
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
    pose: (x: string, z: string, yaw: string, pitch: string): string =>
      `Posición: ${x}, ${z} · rumbo ${yaw}° · inclinación ${pitch}°`,
  },
} as const;

export type ObjectNameKey = keyof typeof TEXTS.objects;
