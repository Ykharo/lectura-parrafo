# Lectura de párrafos

Aplicación web para practicar lectura en voz alta (español de Chile, nivel ~9 años), pensada para Safari en iPad.

## Cómo funciona

0. **Elegir texto**: 6 textos incluidos, más los que se agreguen con «+ Agregar texto».
1. **Mirar**: el párrafo con las palabras difíciles en dorado. Tocar una palabra la agrega o la quita (queda guardado).
2. **Practicar**: cada palabra difícil, grande y separada en sílabas. Avanza sola al reconocerla (2 rondas). «🔊 Escuchar» la pronuncia.
3. **Frases**: cada oración se arma de a un bloque con sentido (`[A]`, `[A / B]`, `[A / B / C]`…) y se lee en voz alta en cada paso, hasta leerla completa. Los bloques se calculan solos (puntuación y palabras como *y, que, con, entre…*) o se marcan a mano escribiendo ` / ` en el texto.
4. **Leer**: el párrafo completo; cada palabra se pinta verde al leerla (naranja si se saltó). Al final: tiempo, palabras por minuto y palabras para repasar.

**Cuentos animados** (por ahora, «El astronauta curioso»), activados con `cuento: '<id>'` en `js/textos.js`. Se recorren **escena por escena** (una escena = una oración):
1. **Mirar**: el texto completo con las palabras difíciles (hasta 5 por escena) y «Empezar lectura». «Leer con animación» (directo a las escenas) y «▶ Escuchar el cuento» aparecen desactivados hasta que el cuento se lee completo una vez.
2. Para cada escena: **presentación** (la oración con sus palabras en dorado) → transición «Palabras difíciles: léelas 3 veces» → **muro de palabras** (cada palabra es un muro de ladrillos-sílaba que el astronauta rompe en 3 lecturas; la palabra late mientras espera la lectura) → **bloques** (escalera: cada repetición materializa un nivel; el último nivel es la oración completa y cuenta como su lectura) → **animación** de la escena al ritmo de la voz adulta grabada → escena siguiente.
3. **Resultados** → «▶ Ver el cuento completo»: las 5 escenas seguidas con la voz adulta.

Si el micrófono no capta una palabra en el muro, un adulto puede tocar la escena para contarla como leída.

Archivos: `js/cuentos/<id>.js` (escenas), `js/cuento.js` (motor de animación), `js/juegos/muro.js` y `js/juegos/escalera.js`, `js/cuento-app.js` (las etapas especiales).

El **historial** guarda cada lectura en el iPad. Desde ahí se puede exportar o importar un respaldo (`.json`).

## Estructura

```
index.html
css/styles.css     diseño (fondo negro, tipografía Lexend)
js/analisis.js     sílabas, puntaje de dificultad, comparación de palabras
js/almacen.js      textos propios, palabras difíciles e historial (localStorage)
js/textos.js       textos incluidos — agrega más aquí
js/app.js          pantallas, etapas y reconocimiento de voz (configuración al inicio)
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
