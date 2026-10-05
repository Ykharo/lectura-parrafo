// Separa las piezas de una lámina en PNG transparentes, usando el navegador (Edge) sin instalar nada.
//
// Uso (desde la carpeta del proyecto):
//   node herramientas/recortar.js <imagen> <carpeta_salida> [umbral=30] [minimo=1500]
//   node herramientas/recortar.js assets/leon-raton/originales/leon-lamina.jpg assets/leon-raton/leon
//
// Escribe pieza-01.png, pieza-02.png… (por filas, de izquierda a derecha), piezas.json con la
// posición de cada una en la lámina e indice.jpg con los números dibujados, para identificarlas.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');

const [imagen, salida, umbral = '30', minimo = '1500'] = process.argv.slice(2);
if (!imagen || !salida) {
  console.error('Uso: node herramientas/recortar.js <imagen> <carpeta_salida> [umbral] [minimo]');
  process.exit(1);
}
const raiz = path.resolve(__dirname, '..');
const puerto = 8790;
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find((p) => fs.existsSync(p));
if (!edge) { console.error('No encontré Microsoft Edge.'); process.exit(1); }

// servidor local (el lienzo del navegador no permite leer imágenes abiertas como archivo)
const servidor = spawn('python', ['-m', 'http.server', String(puerto), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
setTimeout(() => {
  try {
    const rel = path.relative(raiz, path.resolve(imagen)).split(path.sep).join('/');
    const url = `http://127.0.0.1:${puerto}/herramientas/recortar.html?img=/${encodeURI(rel)}&umbral=${umbral}&min=${minimo}`;
    const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'recortar-'));
    const html = execFileSync(edge, ['--headless=new', '--disable-gpu', `--user-data-dir=${perfil}`,
      '--virtual-time-budget=60000', '--dump-dom', url], { maxBuffer: 1 << 30, encoding: 'utf8' });
    fs.rmSync(perfil, { recursive: true, force: true });
    const m = html.match(/<pre id="salida">([\s\S]*?)<\/pre>/);
    if (!m || !m[1].startsWith('{')) throw new Error('Sin resultado: ' + (m ? m[1].slice(0, 200) : 'página vacía'));
    const datos = JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
    fs.mkdirSync(salida, { recursive: true });
    const base64 = (url2) => Buffer.from(url2.split(',')[1], 'base64');
    const lista = [];
    for (const p of datos.piezas) {
      fs.writeFileSync(path.join(salida, p.nombre), base64(p.png));
      lista.push({ nombre: p.nombre, x: p.x, y: p.y, w: p.w, h: p.h });
      console.log(`${p.nombre}: ${p.w}x${p.h} px en (${p.x},${p.y})`);
    }
    fs.writeFileSync(path.join(salida, 'indice.jpg'), base64(datos.indice));
    fs.writeFileSync(path.join(salida, 'piezas.json'), JSON.stringify({ lamina: path.basename(imagen), ancho: datos.ancho, alto: datos.alto, piezas: lista }, null, 2));
    console.log(`fondo ${datos.fondo.join(',')} · ${lista.length} piezas → ${salida}`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    servidor.kill();
  }
}, 1500);
