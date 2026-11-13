# Depuración

El juego acepta parámetros en la URL para ayudar a probarlo. Se validan como cualquier otra entrada: un valor que no esté en esta lista se ignora.

| Parámetro | Valores                    | Efecto                                                                                                                                                                     |
| --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`   | `1`                        | Muestra un panel con FPS, llamadas de dibujo, geometrías y texturas en la GPU, la semilla de la partida y la posición del jugador, y abre todas las salas en la selección. |
| `seed`    | entero de 0 a 4294967295   | Fija la semilla de la partida. Solo funciona junto con `debug=1`.                                                                                                          |
| `room`    | número de sala (`1` a `3`) | Muestra esa sala de fondo en el menú. Solo funciona junto con `debug=1`.                                                                                                   |

Ejemplo: `index.html?debug=1&seed=42&room=2`

Una partida con ayudas de depuración queda marcada como «con ayudas» y no guarda nada de la partida: ni marcas de tiempo, ni salas abiertas, ni la partida en curso para continuarla. Los ajustes sí se guardan. Estos parámetros no desactivan ninguna validación ni dan acceso a nada que el juego no muestre ya.
