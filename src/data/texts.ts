/** Todos los textos visibles del juego. */
import { GAME_TITLE } from './meta';

export const TEXTS = {
  title: GAME_TITLE,
  tagline: 'Examina, relaciona y abre. Sin prisa.',
  contentNote:
    'Misterio tranquilo, apto para todos. Sin sustos, sin violencia y sin cuenta atrás. ' +
    'El juego guarda tus ajustes, tus marcas y la partida en curso solo en este navegador.',
  start: {
    play: 'Jugar',
    continueGame: (room: string): string => `Continuar: ${room}`,
    restoreFailed: 'La partida guardada no se pudo recuperar. La sala empieza de nuevo.',
    settings: 'Ajustes',
    howToTitle: 'Cómo se juega',
    howTo: [
      'Teclado y ratón: WASD para caminar, ratón para mirar, clic o E para interactuar.',
      'Solo teclado: flechas para girar, WASD para caminar, E para interactuar.',
      'Táctil: joystick para caminar, arrastra para mirar, toca un objeto para interactuar.',
      'Inventario: teclas 1 a 8, clic o toque para tomar un objeto en la mano; Esc lo suelta.',
      'Combinar: con un objeto en la mano, pulsa C o «Combinar» y elige el otro objeto.',
      'H: pide una pista (cuenta en el resultado).',
      'Esc o P: pausa.',
    ],
  },
  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    settings: 'Ajustes',
    restart: 'Reiniciar sala',
    mute: 'Silenciar sonido (M)',
    unmute: 'Activar sonido (M)',
    rooms: 'Salas',
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
    volume: 'Volumen',
    showTimer: 'Mostrar cronómetro',
    reduceMotion: 'Reducir movimiento',
    back: 'Volver',
    clearData: 'Borrar datos guardados',
    cleared: 'Datos borrados.',
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
    operate: 'Accionar',
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
    benchDrawer: 'Cajón del banco',
    toolbox: 'Caja de herramientas',
    handle: 'Mango',
    bit: 'Punta de destornillador',
    screwdriver: 'Destornillador',
    fuseBox: 'Cuadro eléctrico',
    switchboard: 'Interruptores',
    diagram: 'Esquema',
    lightBox: 'Caja de luz',
    safe: 'Caja fuerte',
    crankArm: 'Brazo de manivela',
    crankGrip: 'Empuñadura',
    crank: 'Manivela',
    gate: 'Portón',
    mapCase: 'Tubo de mapas',
    globe: 'Globo terráqueo',
    starPrint: 'Lámina de estrellas',
    note: 'Nota',
    starChart: 'Carta estelar',
    almanac: 'Almanaque',
    vitrine: 'Vitrina',
    domeDoor: 'Puerta de la cúpula',
    telescope: 'Telescopio',
    skyView: 'Visor del telescopio',
    console: 'Consola',
    orrery: 'Planetario',
    eyepieceTube: 'Tubo del ocular',
    lens: 'Lente',
    eyepiece: 'Ocular',
    orbStar: 'Esfera con estrella',
    orbHexagon: 'Esfera con hexágono',
    orbCross: 'Esfera con cruz',
    domeKey: 'Llave de la cúpula',
  },
  rooms: {
    study: { name: 'El estudio', result: '¡Has salido del estudio!' },
    workshop: { name: 'El taller', result: '¡Has salido del taller!' },
    observatory: { name: 'El observatorio', result: '¡Has salido del observatorio!' },
  },
  roomSelect: {
    title: 'Salas',
    back: 'Volver',
    locked: 'Bloqueada: termina antes la sala anterior.',
    noRecord: '—',
    records: (clean: string, hinted: string): string =>
      `Mejor tiempo sin pistas: ${clean} · con pistas: ${hinted}`,
  },
  confirm: {
    yes: 'Sí',
    no: 'No, volver',
    restart: '¿Reiniciar la sala? Se perderá lo que llevas en esta partida.',
    replaceSaved: (room: string): string =>
      `Tienes una partida guardada en ${room}. Si empiezas otra, se perderá. ¿Empezar?`,
    clearData:
      '¿Borrar los datos guardados? Se perderán las marcas, las salas abiertas y la partida guardada. Los ajustes se conservan.',
  },
  shapes: {
    circle: 'círculo',
    triangle: 'triángulo',
    square: 'cuadrado',
    diamond: 'rombo',
    star: 'estrella',
    hexagon: 'hexágono',
    cross: 'cruz',
    arrow: 'flecha',
  },
  messages: {
    locked: 'Está cerrado con llave.',
    wrongItem: 'Eso no sirve aquí.',
    inventoryFull: 'No puedes llevar más objetos.',
    picked: (name: string): string => `Has recogido: ${name}.`,
    unlocked: 'Encaja. ¡Se abrió!',
    tutorial: 'Acércate al escritorio, mira el cajón y pulsa E (o tócalo) para abrirlo.',
    selected: (name: string): string =>
      `Llevas en la mano: ${name}. Úsalo sobre lo que quieras abrir.`,
    combineNeedItem: 'Primero toma un objeto en la mano (teclas 1 a 8).',
    combineChoose: (name: string): string =>
      `¿Con qué quieres combinar: ${name}? Elige otro objeto (1 a 8). Esc cancela.`,
    combined: (name: string): string => `Encajan. Ahora tienes: ${name}.`,
    combineNoMatch: 'Esos dos objetos no encajan entre sí.',
    combineCancelled: 'Combinación cancelada.',
  },
  inventory: {
    label: 'Inventario',
    slot: (n: number, name: string): string => `${n}: ${name}`,
    combine: 'Combinar (C)',
    combining: 'Elige el otro…',
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
  dialPanel: {
    title: 'Diales',
    help: 'Flechas arriba y abajo para girar la aguja, izquierda y derecha para cambiar de dial, Enter para probar. La marca larga es la posición 1.',
    wheel: (n: number): string => `Dial ${n}`,
    up: (n: number): string => `Girar el dial ${n} en el sentido del reloj`,
    down: (n: number): string => `Girar el dial ${n} al revés`,
    position: (n: number): string => `posición ${n}`,
    wrong: 'No se abre. Revisa la posición de cada aguja.',
  },
  symbolPanel: {
    title: 'Cerradura de símbolos',
    help: 'Flechas arriba y abajo para cambiar la forma, izquierda y derecha para cambiar de rueda, Enter para probar.',
    wheel: (n: number): string => `Rueda ${n}`,
    up: (n: number): string => `Siguiente forma en la rueda ${n}`,
    down: (n: number): string => `Forma anterior en la rueda ${n}`,
    wrong: 'No se abre. Prueba otras formas.',
  },
  sequencePanel: {
    help: 'Acciona todos los interruptores, cada uno una vez, en el orden correcto. Al accionar el último se sabrá si el orden era bueno; si no, vuelven a su sitio.',
    switchLabel: (n: number, shape: string): string => `Interruptor ${n}, ${shape}`,
    switchDown: (n: number, shape: string): string => `Interruptor ${n}, ${shape}, ya accionado`,
    lights: (lit: number, total: number): string => `Accionados: ${lit} de ${total}`,
    pressed: 'Clic.',
    wrong: 'No pasa nada. Los interruptores vuelven a su sitio.',
    solved: '¡Funcionó!',
    close: 'Cerrar',
  },
  placementPanel: {
    help: 'Elige una pieza y después el hueco donde quieras ponerla.',
    slot: (n: number, shape: string): string => `Hueco ${n}, silueta de ${shape}`,
    filled: (n: number, shape: string): string => `Hueco ${n}: ${shape} colocado`,
    pieces: 'Tus piezas',
    noPieces: 'No llevas piezas que encajen aquí.',
    chooseFirst: 'Primero elige una pieza.',
    wrong: 'Esa pieza no encaja en ese hueco.',
    placed: 'Encaja.',
    solved: 'Todas las piezas en su sitio. Algo se abre.',
    close: 'Cerrar',
  },
  clues: {
    orderTitle: 'Orden',
    switchOrderTitle: 'Orden de encendido',
    dialsTitle: 'Calibración',
    starChartTitle: 'Carta estelar',
    almanacTitle: 'Almanaque',
    skyTitle: 'Constelación',
  },
  hintPanel: {
    title: 'Pista',
    button: 'Pista',
    buttonKey: 'Pista (H)',
    level: (n: number, total: number): string => `Pista ${n} de ${total}`,
    ask: (n: number, total: number): string =>
      `¿Ver la pista ${n} de ${total}? Contará en el resultado como pista usada.`,
    reveal: (n: number): string => `Ver la pista ${n}`,
    allSeen: 'Ya viste las tres pistas de este paso. Puedes releerlas sin que cuenten.',
    none: 'No queda nada por resolver aquí.',
    close: 'Cerrar',
  },
  /** Solución (tercer nivel), armada con las respuestas de la partida. */
  hintSolution: {
    keyLock: (item: string, target: string): string =>
      `Toma «${item}» en la mano y úsalo en «${target}».`,
    code: (target: string, digits: string): string => `La combinación de «${target}» es ${digits}.`,
    dial: (target: string, positions: string): string =>
      `En «${target}», pon las agujas así, de izquierda a derecha: ${positions}.`,
    symbols: (target: string, shapes: string): string =>
      `En «${target}», pon las formas así, de izquierda a derecha: ${shapes}.`,
    sequence: (target: string, order: string): string =>
      `En «${target}», acciona los interruptores en este orden: ${order}.`,
    placement: (target: string, slots: string): string =>
      `En «${target}», cada pieza va en el hueco de su misma forma: ${slots}.`,
    combine: (a: string, b: string): string =>
      `Combina «${a}» con «${b}»: toma uno en la mano, pulsa C (o «Combinar») y elige el otro.`,
    switchItem: (n: number, shape: string): string => `${n} (${shape})`,
    slotItem: (n: number, piece: string): string => `hueco ${n}, ${piece}`,
  },
  /** Orientación y pista concreta de cada puzzle, por sala. El tercer nivel es la solución. */
  hints: {
    study: {
      'p-cabinet': [
        'El armario está cerrado con llave. ¿Has mirado bien el escritorio?',
        'Abre el cajón del escritorio: dentro hay una llave pequeña. Tómala en la mano y úsala en el armario.',
      ],
      'p-panel': [
        'Los bloques del armario tienen formas. ¿Dónde podrían encajar?',
        'El panel con huecos tiene siluetas: coloca cada bloque en el hueco de su misma forma.',
      ],
      'p-chest': [
        'El cofre pide cuatro números. Algunos objetos esconden formas con números.',
        'Cada forma vale un número: búscalo en el libro, el reloj, el cuadro y la postal. La tarjeta que salió del panel dice en qué orden van las formas.',
      ],
      'p-exit': [
        'La puerta necesita su llave. ¿Qué te queda por abrir?',
        'La llave de la puerta está dentro del cofre. Tómala en la mano y úsala en la puerta.',
      ],
    },
    workshop: {
      'p-toolbox': [
        'La caja de herramientas está cerrada con llave. Busca en el banco.',
        'En el cajón del banco hay una llave pequeña. Úsala en la caja de herramientas.',
      ],
      'p-screwdriver': [
        'Un mango solo no sirve de mucho. ¿Qué le falta?',
        'Junta el mango con la punta de destornillador que hay en el taller.',
      ],
      'p-fusebox': [
        'La tapa del cuadro eléctrico está atornillada.',
        'Con el destornillador en la mano, úsalo en el cuadro eléctrico.',
      ],
      'p-switches': [
        'Los interruptores llevan formas. Algún papel del taller dice en qué orden accionarlos.',
        'El esquema de la pared muestra las formas en orden: acciona los interruptores en ese orden.',
      ],
      'p-safe': [
        'La caja fuerte tiene tres diales. Algo se encendió al accionar los interruptores.',
        'La caja de luz muestra adónde apunta cada aguja. Copia esas posiciones en los diales, de izquierda a derecha.',
      ],
      'p-crank': [
        'El portón se abre con una manivela, pero está en dos partes.',
        'Combina el brazo de manivela de la caja de herramientas con la empuñadura de la caja fuerte.',
      ],
      'p-exit': [
        'Al portón le falta algo con lo que girarlo.',
        'Toma la manivela en la mano y úsala en el portón.',
      ],
    },
    observatory: {
      'p-mapcase': [
        'El tubo de mapas pide tres números. Hay formas con números repartidas por la sala.',
        'El libro, el globo terráqueo y la lámina de estrellas dan el número de cada forma. La nota dice en qué orden van.',
      ],
      'p-vitrine': [
        'La vitrina se abre con formas, no con números. Busca un papel con formas en orden.',
        'La carta estelar, dentro del tubo de mapas, muestra las cuatro formas en orden: ponlas en las ruedas de la vitrina.',
      ],
      'p-eyepiece': [
        'Una lente y un tubo… ¿no encajarían juntos?',
        'Combina la lente de la vitrina con el tubo del ocular del cajón del escritorio.',
      ],
      'p-dome': [
        'La puerta de la cúpula tiene tres diales. Busca algo que diga cómo calibrarlos.',
        'El almanaque, dentro del tubo de mapas, muestra la posición de cada aguja. Cópialas en los diales de la puerta.',
      ],
      'p-telescope': [
        'Al telescopio le falta una pieza para poder mirar por él.',
        'Usa el ocular en el telescopio. Después mira el visor.',
      ],
      'p-console': [
        'La consola tiene cinco interruptores con formas. Lo que se ve por el telescopio puede indicar el orden.',
        'El visor del telescopio muestra formas en orden: acciona los interruptores de la consola en ese orden.',
      ],
      'p-orrery': [
        'El planetario tiene huecos con formas. Hay esferas marcadas por la sala.',
        'Reúne las tres esferas (estrella, hexágono y cruz) y coloca cada una en el hueco de su forma.',
      ],
      'p-exit': [
        'La salida de la cúpula necesita una llave.',
        'La llave de la cúpula aparece al completar el planetario. Úsala en la puerta.',
      ],
    },
  },
  timer: {
    label: 'Tiempo',
  },
  result: {
    time: (t: string): string => `Tiempo: ${t}`,
    withAids: 'Partida con ayudas de depuración: no cuenta para las marcas.',
    hints: (n: number): string => (n === 0 ? 'Sin pistas.' : `Pistas usadas: ${n}.`),
    replay: 'Repetir',
    home: 'Inicio',
    next: 'Siguiente sala',
    rooms: 'Salas',
    newRecord: '¡Nueva marca!',
  },
  errors: {
    generic: 'Algo salió mal. Recarga la página para seguir jugando.',
    noWebgl:
      'Tu navegador o tu dispositivo no puede mostrar gráficos 3D (WebGL). Prueba con otro navegador o activa la aceleración por hardware.',
    contextLost: 'Se perdieron los gráficos. Espera un momento; el juego seguirá en pausa.',
    contextRestored: 'Los gráficos se recuperaron. Continúa cuando quieras.',
    saveUnavailable:
      'Este navegador no deja guardar: ni ajustes, ni marcas, ni la partida. Puedes jugar igual.',
    pointerLock:
      'No se pudo capturar el ratón. Haz clic en la escena para intentarlo de nuevo o usa las flechas para mirar.',
  },
  debug: {
    fps: 'FPS',
    drawCalls: 'Llamadas de dibujo',
    memory: (geometries: number, textures: number): string =>
      `Geometrías: ${geometries} · texturas: ${textures}`,
    seed: 'Semilla',
    withAids: 'Con ayudas de depuración',
    pose: (x: string, z: string, yaw: string, pitch: string): string =>
      `Posición: ${x}, ${z} · rumbo ${yaw}° · inclinación ${pitch}°`,
  },
} as const;

export type ObjectNameKey = keyof typeof TEXTS.objects;
export type RoomTitleKey = keyof typeof TEXTS.rooms;
