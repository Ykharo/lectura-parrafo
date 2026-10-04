// Calcula cuándo empieza cada palabra en la grabación de un texto.
//
// Uso (desde la carpeta del proyecto):
//   node herramientas/sincronizar.js <id-del-texto> <audio.wav>
//   node herramientas/sincronizar.js astronauta assets/audio/astronauta.wav
//
// Cómo funciona: detecta los silencios del audio, asigna cada tramo de voz a un grupo de
// palabras (prefiriendo cortar en la puntuación y respetando el largo en sílabas) y dentro
// de cada tramo reparte el tiempo según las sílabas de cada palabra.
// Escribe <audio>.json junto al audio. Precisión esperada: ±0,15 s por palabra.

'use strict';

const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
require('../js/analisis.js');
require('../js/textos.js');
const { silabas } = globalThis.Analisis;

const SILENCIO_MIN = 0.12;   // segundos de silencio para considerar una pausa
const UMBRAL_RELATIVO = 0.04; // volumen bajo el cual se considera silencio (respecto del máximo)

// ---------- Leer WAV (PCM 16 bits) ----------
function leerWav(ruta) {
  const b = fs.readFileSync(ruta);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('No es un WAV');
  let pos = 12;
  let fmt = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const tam = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = { canales: b.readUInt16LE(pos + 10), frecuencia: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22) };
    if (id === 'data') {
      if (!fmt || fmt.bits !== 16) throw new Error('Se necesita PCM de 16 bits');
      const n = Math.min(tam, b.length - pos - 8) / 2 / fmt.canales;
      const muestras = new Float32Array(n);
      for (let i = 0; i < n; i++) muestras[i] = b.readInt16LE(pos + 8 + i * 2 * fmt.canales) / 32768;
      return { ...fmt, muestras };
    }
    pos += 8 + tam + (tam % 2);
  }
  throw new Error('WAV sin datos');
}

// ---------- Tramos de voz ----------
function tramosDeVoz({ muestras, frecuencia }) {
  const paso = Math.round(frecuencia / 100); // 10 ms
  const rms = [];
  for (let i = 0; i + paso <= muestras.length; i += paso) {
    let s = 0;
    for (let k = i; k < i + paso; k++) s += muestras[k] * muestras[k];
    rms.push(Math.sqrt(s / paso));
  }
  const umbral = Math.max(...rms) * UMBRAL_RELATIVO;
  const tramos = [];
  let inicio = null;
  let silencio = 0;
  rms.forEach((v, k) => {
    if (v >= umbral) {
      if (inicio === null) inicio = k;
      silencio = 0;
    } else if (inicio !== null) {
      silencio++;
      if (silencio / 100 >= SILENCIO_MIN) {
        tramos.push({ a: inicio / 100, b: (k - silencio + 1) / 100 });
        inicio = null;
        silencio = 0;
      }
    }
  });
  if (inicio !== null) tramos.push({ a: inicio / 100, b: (rms.length - silencio) / 100 });
  return { tramos, duracion: muestras.length / frecuencia };
}

// ---------- Asignar palabras a tramos ----------
function sincronizar(palabras, tramos) {
  const n = palabras.length;
  const m = tramos.length;
  const peso = palabras.map((p) => Math.max(1, silabas(p.replace(/[^\p{L}]/gu, '')).length) + 0.3);
  const acum = [0];
  peso.forEach((x) => acum.push(acum[acum.length - 1] + x));
  const voz = tramos.reduce((s, t) => s + t.b - t.a, 0);
  const ritmo = voz / acum[n]; // segundos por unidad de peso

  const corte = (j) => {
    // costo de terminar un grupo después de la palabra j-1
    if (j === n) return 0;
    const w = palabras[j - 1];
    if (/[.!?…]["'»”)]*$/.test(w)) return 0;
    if (/[,;:]["'»”)]*$/.test(w)) return 0.05;
    return 0.6;
  };
  // Un grupo de palabras puede ocupar varios tramos seguidos (pausas cortas dentro de una frase).
  const MAX_TRAMOS = 3;
  const INF = 1e9;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(INF));
  const desde = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
  dp[0][0] = 0;
  for (let k = 0; k < m; k++) {
    for (let i = 0; i < n; i++) {
      if (dp[k][i] >= INF) continue;
      for (let k2 = k + 1; k2 <= Math.min(m, k + MAX_TRAMOS); k2++) {
        let durVoz = 0;
        let pausaInterna = 0;
        for (let q = k; q < k2; q++) {
          durVoz += tramos[q].b - tramos[q].a;
          if (q > k) pausaInterna += Math.max(0, tramos[q].a - tramos[q - 1].b - 0.2);
        }
        for (let j = i + 1; j <= n; j++) {
          const esperado = ritmo * (acum[j] - acum[i]);
          const dif = (durVoz - esperado) / (esperado + 0.3);
          const c = dp[k][i] + dif * dif + corte(j) + pausaInterna * 4;
          if (c < dp[k2][j]) { dp[k2][j] = c; desde[k2][j] = [k, i]; }
        }
      }
    }
  }
  if (dp[m][n] >= INF) throw new Error('No se pudo alinear el texto con el audio');

  // Reconstruir grupos y repartir el tiempo de voz por sílabas
  const inicios = new Array(n);
  let [k2, j] = [m, n];
  while (k2 > 0) {
    const [k, i] = desde[k2][j];
    const segs = tramos.slice(k, k2);
    const total = segs.reduce((s, t) => s + t.b - t.a, 0);

    // Cada pausa interna del grupo cae en el límite de palabra más cercano (por sílabas);
    // así cada tramo recibe sus propias palabras.
    const cortes = [i];
    let vozAntes = 0;
    for (let q = 0; q < segs.length - 1; q++) {
      vozAntes += segs[q].b - segs[q].a;
      let mejor = null;
      for (let p = cortes[cortes.length - 1] + 1; p <= j - (segs.length - 1 - q); p++) {
        const x = (total * (acum[p] - acum[i])) / (acum[j] - acum[i]);
        if (mejor === null || Math.abs(x - vozAntes) < Math.abs(mejor.x - vozAntes)) mejor = { p, x };
      }
      cortes.push(mejor.p);
    }
    cortes.push(j);
    segs.forEach((t, q) => {
      const [a, b] = [cortes[q], cortes[q + 1]];
      for (let p = a; p < b; p++) inicios[p] = t.a + ((t.b - t.a) * (acum[p] - acum[a])) / (acum[b] - acum[a]);
    });
    [k2, j] = [k, i];
  }
  return inicios;
}

// ---------- Principal ----------
const [id, rutaAudio] = process.argv.slice(2);
if (!id || !rutaAudio) {
  console.error('Uso: node herramientas/sincronizar.js <id-del-texto> <audio.wav>');
  process.exit(1);
}
const texto = globalThis.TEXTOS.find((t) => t.id === id);
if (!texto) {
  console.error(`No existe el texto "${id}". Opciones: ${globalThis.TEXTOS.map((t) => t.id).join(', ')}`);
  process.exit(1);
}
const palabras = texto.parrafo.replace(/\s*\/\s*/g, ' ').trim().split(/\s+/);
const wav = leerWav(rutaAudio);
const { tramos, duracion } = tramosDeVoz(wav);
const inicios = sincronizar(palabras, tramos);

const resultado = {
  texto: id,
  audio: path.basename(rutaAudio),
  duracion: Number(duracion.toFixed(2)),
  palabras: palabras.map((p, i) => ({ palabra: p, inicio: Number(inicios[i].toFixed(2)) })),
};
const salida = rutaAudio.replace(/\.[^.]+$/, '.json');
fs.writeFileSync(salida, JSON.stringify(resultado, null, 2) + '\n');

console.log(`${tramos.length} tramos de voz, ${palabras.length} palabras → ${salida}`);
for (const { palabra, inicio } of resultado.palabras) console.log(`${inicio.toFixed(2).padStart(6)}  ${palabra}`);
