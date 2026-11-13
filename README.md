# Cerrojo

Escape room 3D en primera persona para el navegador. Tres salas cerradas: examina objetos, relaciona pistas y abre cerraduras, sin prisa. Misterio tranquilo, apto para todos: sin sustos, sin violencia y sin cuenta atrás.

## Cómo se juega

Cada sala es un pequeño mecanismo. Los objetos se abren, se recogen, se examinan de cerca y se combinan; las pistas (formas, números, órdenes) están repartidas por la sala y abren cerraduras de ruedas, diales, símbolos, interruptores o huecos donde encajar piezas. Al abrir la puerta de salida termina la sala y se abre la siguiente.

- **Salas:** 1. El estudio · 2. El taller · 3. El observatorio.
- **Las respuestas cambian en cada partida:** salen de una semilla, así que repetir una sala no es repetir los mismos códigos.
- **Sin límite de tiempo.** Un cronómetro mide la partida y se guarda el mejor tiempo de cada sala, por separado sin pistas y con pistas. Se puede ocultar en los ajustes.
- **Pistas opcionales** en tres niveles (orientación, pista concreta y solución). Cada nivel visto cuenta en el resultado.
- **Equivocarse no cuesta nada:** ningún error gasta un objeto ni deja la sala sin salida.

## Controles

| Acción               | Teclado y ratón            | Solo teclado | Táctil                          |
| -------------------- | -------------------------- | ------------ | ------------------------------- |
| Caminar              | W A S D                    | W A S D      | Joystick                        |
| Mirar                | Ratón                      | Flechas      | Arrastrar sobre la escena       |
| Interactuar          | Clic o E                   | E            | Tocar el objeto o «Interactuar» |
| Tomar del inventario | 1 a 8 o clic en la casilla | 1 a 8        | Tocar la casilla                |
| Soltar el objeto     | Esc                        | Esc          | Tocar de nuevo la casilla       |
| Combinar             | C con un objeto en la mano | C            | «Combinar»                      |
| Pista                | H                          | H            | «Pista»                         |
| Pausa                | Esc o P                    | Esc o P      | Botón de pausa                  |
| Silenciar            | M                          | M            | Pausa → «Silenciar sonido»      |

Los paneles de las cerraduras, los menús y el inventario se manejan también con Tab, las flechas y Enter.

## Accesibilidad

- Se puede jugar entero solo con teclado, con ratón o con el dedo.
- Ningún puzzle depende solo del color ni del sonido: cada símbolo, pieza o interruptor se distingue también por su forma o una marca, y cada sonido tiene un aviso visual.
- Opción «Reducir movimiento» (toma el valor inicial de la preferencia del sistema), campo de visión ajustable, sensibilidad, inversión del eje vertical, volumen y silencio.
- Tres niveles de calidad gráfica (Baja, Media y Alta). El valor inicial depende del tipo de pantalla.

## Datos que guarda

El juego no tiene cuentas, no envía datos a ningún servidor, no usa cookies ni analítica y no hace peticiones a otros dominios.

Guarda en el `localStorage` del navegador, bajo la clave `cerrojo:v1`:

- los ajustes,
- los mejores tiempos de cada sala (sin pistas y con pistas), de los que se deriva qué salas están abiertas,
- la partida en curso, para poder continuarla.

Los datos se quedan en ese navegador hasta que el jugador los borra: desde **Ajustes → Borrar datos guardados** (borra marcas, salas abiertas y partida, y conserva los ajustes) o borrando los datos del sitio en el navegador. Si el navegador no deja guardar, el juego avisa y se puede jugar igual.

## Desarrollo

Requisitos: Node.js 24.

```
npm ci               # instala las dependencias exactas del lockfile
npm run dev          # servidor de desarrollo
npm run lint         # ESLint
npm run test         # tests (Vitest)
npm run build        # comprobación de tipos y build estático en dist/
npm run preview      # sirve dist/ para probarlo
npm run format       # Prettier sobre las carpetas del proyecto
```

Para los controles táctiles en el escritorio, usa la emulación de dispositivos del navegador. Los parámetros de URL para probar el juego están en [docs/DEBUG.md](docs/DEBUG.md). La estructura del código y las decisiones de diseño están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Despliegue

El juego es un sitio estático. El workflow `.github/workflows/deploy.yml` lo publica en GitHub Pages en cada push a `main`: instala con `npm ci`, ejecuta lint, tests, auditoría de dependencias, build y una búsqueda de secretos en el código y en `dist/`, y solo publica si todo pasa.

Para activarlo en un repositorio nuevo: **Settings → Pages → Source: GitHub Actions** y **Enforce HTTPS**. El build usa rutas relativas, así que funciona bajo cualquier ruta de GitHub Pages y también dentro de un iframe.

## Licencia

Todos los derechos reservados. Titular: Danny Sivinta. Ver [LICENSE](LICENSE).

Las dependencias de terceros y sus licencias están en [docs/LICENSES.md](docs/LICENSES.md).
