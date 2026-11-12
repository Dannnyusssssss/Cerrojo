# Licencias de terceros

El juego no usa recursos externos (modelos, texturas, sonidos ni fuentes): la geometría, las texturas y el sonido se generan por código.

## Dependencias de ejecución (se incluyen en el juego publicado)

| Paquete | Versión | Licencia | Repositorio                        |
| ------- | ------- | -------- | ---------------------------------- |
| three   | 0.187.0 | MIT      | https://github.com/mrdoob/three.js |

El build publica junto al juego el archivo `third-party-licenses.md` con el texto completo de la licencia de cada dependencia incluida.

## Dependencias de desarrollo (no se incluyen en el juego publicado)

| Paquete           | Versión | Licencia   | Repositorio                                            |
| ----------------- | ------- | ---------- | ------------------------------------------------------ |
| vite              | 8.3.6   | MIT        | https://github.com/vitejs/vite                         |
| typescript        | 6.0.3   | Apache-2.0 | https://github.com/microsoft/TypeScript                |
| vitest            | 5.1.0   | MIT        | https://github.com/vitest-dev/vitest                   |
| eslint            | 10.14.0 | MIT        | https://github.com/eslint/eslint                       |
| @eslint/js        | 10.0.1  | MIT        | https://github.com/eslint/eslint                       |
| typescript-eslint | 8.72.1  | MIT        | https://github.com/typescript-eslint/typescript-eslint |
| prettier          | 3.9.10  | MIT        | https://github.com/prettier/prettier                   |
| @types/three      | 0.187.0 | MIT        | https://github.com/DefinitelyTyped/DefinitelyTyped     |

Las dependencias indirectas de estas herramientas figuran en `package-lock.json`.
