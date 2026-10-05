# Lectura de párrafos

Aplicación web para practicar lectura en voz alta (español de Chile, nivel ~9 años), pensada para Safari en iPad.

## Cómo funciona

0. **Elegir texto**: 6 textos incluidos, más los que se agreguen con «+ Agregar texto».
1. **Mirar**: el párrafo con las palabras difíciles en dorado. Tocar una palabra la agrega o la quita (queda guardado).
2. **Practicar**: cada palabra difícil, grande y separada en sílabas. Avanza sola al reconocerla (2 rondas). «🔊 Escuchar» la pronuncia.
3. **Frases**: cada oración se arma de a un bloque con sentido (`[A]`, `[A / B]`, `[A / B / C]`…) y se lee en voz alta en cada paso, hasta leerla completa. Los bloques se calculan solos (puntuación y palabras como *y, que, con, entre…*) o se marcan a mano escribiendo ` / ` en el texto.
4. **Leer**: el párrafo completo; cada palabra se pinta verde al leerla (naranja si se saltó). Al final: tiempo, palabras por minuto y palabras para repasar.

**Cuentos animados** («El astronauta curioso», «El rey Midas» y «El león y el ratón»), activados con `cuento: '<id>'` en `js/textos.js`. En el panel principal sus tarjetas son de un gris algo más claro que las demás. Se recorren por escenas:
1. **Mirar**: el texto completo con las palabras difíciles (hasta 5 por escena) y «Empezar lectura». «Leer con animación» (directo a la lectura) y «▶ Escuchar el cuento» aparecen desactivados hasta que el cuento se lee completo una vez.
2. **Práctica**, para cada escena: **presentación** (la oración con sus palabras en dorado) → transición «Palabras difíciles: léelas 3 veces» → **muro de palabras** (3 lecturas por palabra; la palabra late mientras espera) → **bloques** (escalera: cada repetición materializa un nivel) → la **escena animada con la voz adulta** grabada → escena siguiente (en la última escena, «Continuar →»).
3. **Lectura del cuento completo** («¡Práctica lista!» → «Leer el cuento»), escena por escena: la animación avanza con cada palabra que la niña lee. Al terminar la escena, se repite con la voz adulta grabada; luego «Siguiente escena →».
4. **Resultados** (de la lectura completa) → «▶ Ver el cuento completo»: todas las escenas seguidas con la voz adulta.

Si el micrófono no capta una palabra en el muro, un adulto puede tocar la escena para contarla como leída.

Archivos: `js/cuentos/<id>.js` (escenas), `js/cuento.js` (motor de animación), `js/juegos/muro.js` y `js/juegos/escalera.js`, `js/cuento-app.js` (las etapas especiales).

**«El rey Midas»** usa el mismo esquema con **estilo de jarrón griego** (cerámica de figuras negras sobre terracota, tomado de `Antecedentes/`):
- 9 oraciones agrupadas en **5 escenas** (`grupos` en `js/cuentos/midas.js`).
- Muro: los **cinco hoplitas** embisten un muro de piedra junto a la palabra; en la **última palabra de cada escena** llegan los dioses (Cupido, Medusa y Zeus). Estilo y tiempos sin cambios respecto de los prototipos (`js/juegos/griego-base.js`, `js/juegos/muro-griego.js`).
- Escalera: bloques de piedra y los cinco hoplitas en formación, que se sientan y saltan cada nivel (`js/juegos/escalera-griega.js`).
- Escenas: figuras negras con incisiones crema; el oro se enciende al nombrarse (flores, silla, piedras, pan, uvas) y desaparece de las manos al lavarse en el río.

**«El león y el ratón»** usa el mismo esquema con escenas en **stop motion de papel recortado**:
- 12 oraciones en **5 escenas** (`grupos` en `js/cuentos/leon-raton.js`).
- Practicar → **cuerda** (`js/juegos/muro-cuerda.js`): la palabra cuelga en etiquetas-sílaba de una cuerda. Cada lectura es un mordisco del ratón (marcado con un quesito). Al tercero la cuerda se corta y las sílabas se juntan en la palabra. En la última palabra de cada escena, el león se ríe.
- Frases → **escalera de piedras** (`js/juegos/escalera-piedras.js`): cada bloque leído deja caer una piedra de papel en su nivel, y el ratón baja la escalera. Al final celebra con papel picado.
- Motor `js/papel.js`: cada escena es un pequeño guion por palabra. La imagen avanza a 12 cuadros por segundo con un leve temblor de mano, y las piezas tienen textura de papel, borde de tijera con filo blanco y sombra de diorama.
- El león está articulado con las piezas recortadas de una ilustración (`assets/leon-raton/leon/`): torso, melena, 4 patas, cola en dos partes, pata grande y 6 caras que se reemplazan (dormido, sorprendido, rugiendo, riendo, triste y amable). El ratón, la sabana, la acacia, la red, las flores y los efectos se recortan por código.
- `herramientas/recortar.html` + `recortar.js`: separan las piezas de una lámina con fondo claro en PNG transparentes (se ejecutan en el navegador).

El **historial** guarda cada lectura en el iPad. Desde ahí se puede exportar o importar un respaldo (`.json`).

## Estructura

```
index.html
css/styles.css     diseño (fondo negro, tipografía Lexend)
js/analisis.js     sílabas, puntaje de dificultad, comparación de palabras
js/almacen.js      textos propios, palabras difíciles e historial (localStorage)
js/textos.js       textos incluidos — agrega más aquí
js/app.js          pantallas, etapas y reconocimiento de voz (configuración al inicio)
js/papel.js        motor de stop motion de papel recortado
assets/            imágenes, sonidos y animaciones livianas (futuro)
```

## Maquetas

- `maquetas/escalera.html`: prueba de la animación para la etapa Frases (escalera que se materializa con cada repetición y un personaje que la recorre). Modos: Auto (simula la lectura), Manual (una palabra por toque) y Micrófono.
- `maquetas/muro.html`: práctica de las 5 palabras difíciles del astronauta. Cada palabra es un muro de ladrillos-sílaba; cada lectura es un choque del astronauta (grietas → más grietas → se rompe), y la palabra rearmada baja a su oración.
- `maquetas/cuento-planetas.html`: escena 3 de «El astronauta curioso» animada en líneas, sincronizada palabra por palabra con una voz adulta (simulada con la voz del iPad), una lectura infantil simulada o una grabación real de la niña (experimental).

## Audio con voz adulta

- `assets/audio/<texto>.wav`: lectura grabada del texto completo.
- `assets/audio/<texto>.json`: cuándo empieza cada palabra (en segundos).
- `herramientas/generar_audio.py`: genera la lectura con la voz de Gemini (requiere `pip install google-genai` y la variable `GEMINI_API_KEY`; la clave nunca se guarda en el proyecto).
- `herramientas/sincronizar.js`: calcula los tiempos por palabra a partir de las pausas del audio y la puntuación del texto:
  `node herramientas/sincronizar.js astronauta assets/audio/astronauta.wav`

## Probar en el PC

```
npx serve
```

Abrir la dirección que muestra en Chrome (abrir `index.html` con doble clic no permite usar el micrófono).

## Publicar en GitHub Pages

1. Publicar el repositorio como **público**.
2. En GitHub: **Settings → Pages → Build and deployment**: *Deploy from a branch*, rama `main`, carpeta `/ (root)`, **Save**.
3. Queda en `https://<usuario>.github.io/<repositorio>/` (tarda 1–2 minutos en cada cambio).

## Requisitos en el iPad

- Abrir en **Safari**.
- **Dictado activado**: Ajustes → General → Teclado → Activar Dictado.
- Aceptar el permiso del micrófono.
- El historial y los textos agregados viven en ese iPad y ese navegador: borrar los datos de Safari los elimina. Exporta un respaldo de vez en cuando.
