# Animaciones de recompensa para la lectura

## Qué son estos archivos

Dos prototipos de animación, cada uno en un único HTML autocontenido
(SVG + CSS + JavaScript, sin librerías; solo carga la fuente Andika de Google Fonts):

- `derriba-el-muro.html`: cinco hoplitas griegos embisten un muro. Unos 5 s por intento.
- `derriba-el-muro-dioses.html`: variación cómica con los mismos personajes.
  1.ª lectura trae a Cupido, 2.ª a Medusa, 3.ª a Zeus. Unos 15–20 s por intento.

Estilo: cerámica griega de figuras negras sobre terracota. No cambiar el estilo
visual ni los tiempos de animación al integrarlos.

## Para qué sirven en la app

Son la recompensa visual de un ejercicio de lectura infantil. La palabra a leer
está siempre visible a la izquierda, con el muro a su derecha. Cada vez que la
niña lee bien la palabra, se dispara un intento de derribar el muro. Al tercer
intento el muro cae.

Formato: banda horizontal 4:1 (viewBox 1200×296). En pantalla deben caber al
menos tres bandas apiladas, una por palabra.

## Cómo funcionan hoy (prototipo)

- `CONFIG` al inicio del script: `word` (la palabra) y `hitsToBreak` (intentos, 3).
- `attack()`: función asíncrona que ejecuta un intento completo y termina cuando
  acaba la animación. La variable `hits` cuenta los intentos.
- Botones de demostración: `#hit` (simula una lectura correcta), `#demo`, `#reset`.
- El SVG es `#scene`, con capas `#word`, `#wall`, `#debris`, `#army`, `#fx`
  (y `#gods`, `#sky`, `#flash` en la versión de dioses).

## Qué hay que hacer para usarlas en la app

1. Extraer cada animación a un módulo reutilizable, sin el título, los botones
   ni el texto de la página: solo la banda SVG.
2. Exponer una función `crearEscena(contenedor, { palabra, intentos })` que
   devuelva `{ golpe(), reiniciar(), destruir() }`.
   - `golpe()` equivale a `attack()`: devuelve una promesa que se resuelve al
     terminar el intento, y debe ignorar llamadas mientras hay uno en curso.
   - `reiniciar()` equivale a lo que hace hoy el botón `#reset`.
   - `destruir()` debe detener el bucle de `requestAnimationFrame` y limpiar el DOM.
3. Permitir varias bandas a la vez en la misma pantalla. Hoy el código usa
   variables globales e ids fijos (`#scene`, `#clay`, `#meander`, `#stone`…),
   así que hay que encapsular el estado y hacer los ids únicos por instancia.
4. Conectar `golpe()` al evento real de la app: se llama cuando la lectura de
   la palabra se valida como correcta. Reemplaza al botón `#hit`.
5. Mantener la regla de que nada tape la palabra: los escombros y personajes
   no cruzan a la izquierda del muro (`LEFT_LIMIT`).

## Detalles a tener en cuenta

- La versión de dioses asume 3 intentos (Cupido, Medusa, Zeus). Con otro número,
  los intentos intermedios repiten la escena de Medusa.
- El tamaño de la palabra se ajusta solo al ancho disponible (`fitWord`).
- Pendiente de decidir: acortar las escenas de la versión de dioses y definir
  en qué momento exacto se inicia la animación respecto de la lectura.
