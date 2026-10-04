'use strict';

// Etapas especiales de los textos con cuento animado (js/cuentos/<id>.js):
//   Practicar → muro de palabras · Frases → escalera · Leer → escenas animadas, con la voz
//   adulta grabada y con la propia voz de la lectora · Al final → el cuento completo.
// Usa el estado y las utilidades de js/app.js (se carga antes que app.js; todo se llama en tiempo de ejecución).

const audioCuento = new Audio(); // voz adulta grabada (texto completo)
audioCuento.preload = 'auto';
const audioVoz = new Audio();    // grabaciones de la lectora
let cuento = null;
let muroJuego = null;
let escaleraJuego = null;
const PALABRAS_MURO = 5;

const juegosDe = (t) => (cuentoDe(t) && cuentoDe(t).juegos) || {};

// Prepara la grabación adulta del texto (se llama al elegir el texto)
function prepararAudioCuento(def) {
  const url = new URL(def.audio, location.href).href;
  if (audioCuento.src !== url) audioCuento.src = url;
}

function detenerCuento() {
  if (cuento) cuento.reproduccion++;
  audioCuento.pause();
  audioVoz.pause();
  if (muroJuego) { muroJuego.destruir(); muroJuego = null; }
  if (escaleraJuego) { escaleraJuego.destruir(); escaleraJuego = null; }
}

// Toca un tramo de la grabación adulta: de la palabra i0 hasta antes de la i1.
// Sin grabación, usa la voz del iPad.
function reproducirTramo(i0, i1) {
  const texto = palabras.slice(i0, i1).map((p) => p.bruta).join(' ');
  if (!tiemposCuento) return decir(texto);
  const ini = tiemposCuento.inicios;
  const desde = Math.max(0, ini[i0] - 0.1);
  const hasta = i1 < ini.length ? ini[i1] - (/[.,;:!?]$/.test(palabras[i1 - 1].bruta) ? 0.3 : 0.05) : tiemposCuento.duracion;
  return new Promise((listo) => {
    audioCuento.currentTime = desde;
    audioCuento.play().catch(() => listo());
    const limite = performance.now() + (hasta - desde + 2) * 1000;
    const vigilar = () => {
      if (audioCuento.currentTime >= hasta || audioCuento.paused || performance.now() > limite) {
        audioCuento.pause();
        return listo();
      }
      requestAnimationFrame(vigilar);
    };
    requestAnimationFrame(vigilar);
  });
}

// ================= Practicar: muro de palabras =================
function etapaMuro() {
  // las palabras más difíciles, en el orden en que aparecen
  const lista = listaPractica().slice().sort((a, b) => b.puntos - a.puntos).slice(0, PALABRAS_MURO).sort((a, b) => a.i - b.i);
  if (!lista.length) return etapaFrases();
  ocultarAviso();
  marcarPaso(2);
  practica = { lista, indice: 0, consumidas: 0, ignorar: false, saltadas: new Set() };
  pantalla('juego juego-muro', `
    <p class="progreso" id="j-progreso"></p>
    <svg viewBox="0 0 1000 260" aria-hidden="true"></svg>
    <p class="parrafo oracion-juego" id="j-oracion"></p>
    <div class="mensaje" id="j-mensaje"></div>
  `, [
    { texto: '🔊 Escuchar', accion: escucharPalabraMuro },
    { texto: '✓ La leí', accion: () => muroJuego && muroJuego.leer() },
  ]);
  muroJuego = Muro.crear($vista.querySelector('svg'), {
    alListo: (golpes) => {
      const el = document.getElementById('j-mensaje');
      if (el) el.textContent = golpes === 0 ? 'Lee la palabra en voz alta' : '¡Otra vez!';
    },
    alRomper: () => {
      const el = $vista.querySelector('.objetivo');
      if (el) { el.classList.remove('objetivo'); el.classList.add('lograda'); }
      const m = document.getElementById('j-mensaje');
      if (m) m.textContent = '¡Muro roto!';
    },
    alTerminar: siguienteMuro,
  });
  escucha.alReiniciar = () => { practica.consumidas = 0; };
  escucha.alOir = oirMuro;
  escucha.iniciar();
  mostrarMuro();
}

function mostrarMuro() {
  const p = practica.lista[practica.indice];
  const o = oracionesTexto.find((x) => p.i >= x.inicio && p.i < x.fin);
  document.getElementById('j-progreso').textContent = `Palabra ${practica.indice + 1} de ${practica.lista.length}`;
  document.getElementById('j-oracion').innerHTML = palabras.slice(o.inicio, o.fin)
    .map((w) => (w.i === p.i ? `<span class="objetivo">${escapar(w.bruta)}</span>` : escapar(w.bruta)))
    .join(' ');
  practica.consumidas = escucha.cantidad;
  muroJuego.palabra(p.silabas);
}

function oirMuro(t) {
  if (practica.consumidas > t.length) practica.consumidas = t.length;
  if (practica.ignorar || !muroJuego) return;
  const objetivo = practica.lista[practica.indice].norm;
  const nuevas = t.slice(practica.consumidas);
  const leyo = nuevas.some((w, k) => parecidas(w, objetivo) || (k + 1 < nuevas.length && parecidas(w + nuevas[k + 1], objetivo)));
  if (!leyo) return;
  practica.consumidas = t.length;
  muroJuego.leer();
}

// La palabra con la voz adulta (sin que el micrófono lo cuente como lectura)
async function escucharPalabraMuro() {
  const p = practica.lista[practica.indice];
  practica.ignorar = true;
  await reproducirTramo(p.i, p.i + 1);
  setTimeout(() => { practica.consumidas = escucha.cantidad; practica.ignorar = false; }, 600);
}

function siguienteMuro() {
  practica.indice++;
  if (practica.indice < practica.lista.length) return mostrarMuro();
  if (muroJuego) { muroJuego.destruir(); muroJuego = null; }
  pantalla('centro', `
    <p class="grande">¡Palabras listas!</p>
    <p class="sub">Ahora vamos a leer por frases.</p>
  `);
  setTimeout(etapaFrases, 1800); // el micrófono sigue encendido
}

// ================= Frases: escalera =================
function etapaEscalera() {
  ocultarAviso();
  marcarPaso(3);
  frases = { oracion: 0, nivel: 1, consumidas: 0, pausada: false, acerto: false };
  escucha.alReiniciar = () => {
    frases.base = frases.estados;
    frases.desde = frases.pos;
    frases.consumidas = 0;
  };
  escucha.alOir = oirEscalera;
  escucha.iniciar();
  montarOracionEscalera();
}

function montarOracionEscalera() {
  const o = oracionesTexto[frases.oracion];
  pantalla('juego juego-escalera lectura frases', `
    <p class="progreso">Oración ${frases.oracion + 1} de ${oracionesTexto.length}</p>
    <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
    <p class="parrafo" id="j-frase"></p>
    <div class="mensaje"></div>
  `, [
    { texto: '🔊 Escuchar', accion: escucharFraseEscalera },
    { texto: 'Siguiente', accion: () => { if (!frases.acerto) completarNivel(); } },
  ]);
  if (escaleraJuego) escaleraJuego.destruir();
  escaleraJuego = Escalera.crear(
    $vista.querySelector('svg'),
    palabras.slice(o.inicio, o.fin).map((p) => p.bruta),
    o.bloques.map(([a, b]) => [a - o.inicio, b - o.inicio]),
  );
  frases.nivel = 1;
  mostrarNivel();
}

function mostrarNivel() {
  const o = oracionesTexto[frases.oracion];
  const visibles = o.bloques.slice(0, frases.nivel);
  Object.assign(frases, {
    inicio: o.inicio,
    fin: visibles[visibles.length - 1][1],
    desde: o.inicio,
    pos: o.inicio,
    base: palabras.map(() => 'pendiente'),
    pausada: false,
    acerto: false,
    consumidas: escucha.cantidad,
  });
  frases.estados = frases.base;
  escaleraJuego.paso(frases.nivel);
  document.getElementById('j-frase').innerHTML = visibles.map(([a, b], k) => {
    const nuevo = k === visibles.length - 1 && k > 0 ? ' nuevo' : '';
    return `<span class="bloque${nuevo}">${palabras.slice(a, b).map((p) => `<span class="p" data-i="${p.i}">${escapar(p.bruta)}</span>`).join(' ')}</span>`;
  }).join('<span class="corte">/</span>');
  const m = $vista.querySelector('.mensaje');
  m.className = 'mensaje';
  m.textContent = frases.nivel === o.bloques.length ? 'Ahora la oración completa' : 'Lee en voz alta';
  pintarFrase();
}

function oirEscalera(t) {
  if (frases.consumidas > t.length) frases.consumidas = t.length;
  if (frases.pausada || frases.acerto) return;
  const r = alinear(esperadas.slice(0, frases.fin), t.slice(frases.consumidas), frases.desde, frases.base);
  frases.pos = r.pos;
  frases.estados = r.estados;
  escaleraJuego.posicion(frases.pos - frases.inicio);
  pintarFrase();
  if (frases.pos >= frases.fin) completarNivel();
}

function completarNivel() {
  if (frases.acerto) return;
  frases.acerto = true;
  frases.pausada = true;
  escaleraJuego.posicion(frases.fin - frases.inicio);
  felicitar();
  const o = oracionesTexto[frases.oracion];
  const ultimoNivel = frases.nivel >= o.bloques.length;
  // en el último nivel se deja celebrar al astronauta
  setTimeout(siguienteNivel, ultimoNivel ? 2800 : 1500);
}

function siguienteNivel() {
  if (!escaleraJuego) return;
  const o = oracionesTexto[frases.oracion];
  if (frases.nivel < o.bloques.length) {
    frases.nivel++;
    return mostrarNivel();
  }
  frases.oracion++;
  if (frases.oracion < oracionesTexto.length) return montarOracionEscalera();
  escaleraJuego.destruir();
  escaleraJuego = null;
  antesDeLeer();
}

async function escucharFraseEscalera() {
  if (frases.acerto) return;
  frases.pausada = true;
  await reproducirTramo(frases.inicio, frases.fin);
  setTimeout(() => { frases.consumidas = escucha.cantidad; frases.pausada = false; }, 600);
}

// ================= Grabación de la voz de la lectora =================
const PREF_GRABAR = 'lectura-parrafo:grabar-voz';
function grabarVozActivo() {
  try { return localStorage.getItem(PREF_GRABAR) !== 'no'; } catch { return true; }
}
function cambiarGrabarVoz(si) {
  try { localStorage.setItem(PREF_GRABAR, si ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
}

const grabadora = {
  flujo: null,
  rec: null,
  partes: [],
  t0: 0,
  activa: false,

  async iniciar() {
    if (!grabarVozActivo() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }
    this.partes = [];
    this.rec = new MediaRecorder(this.flujo);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.partes.push(e.data); };
    this.rec.start();
    this.t0 = performance.now();
    this.activa = true;
    return true;
  },

  segundos() { return (performance.now() - this.t0) / 1000; },

  // Detiene la grabación y apaga el micrófono; entrega { url, duracion } o null
  detener() {
    return new Promise((listo) => {
      if (!this.activa) return listo(null);
      this.activa = false;
      const duracion = this.segundos();
      const rec = this.rec;
      rec.onstop = () => {
        this.flujo.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.partes, { type: rec.mimeType || 'audio/mp4' });
        listo(blob.size ? { url: URL.createObjectURL(blob), duracion } : null);
      };
      rec.stop();
    });
  },
};

// ================= Leer: escenas animadas =================
function etapaCuento() {
  ocultarAviso();
  marcarPaso(4);
  const def = cuentoDe(texto);
  if (cuento && cuento.voces) cuento.voces.forEach((v) => v && URL.revokeObjectURL(v.url));
  cuento = { def, escena: 0, estados: palabras.map(() => 'pendiente'), ms: 0, reproduccion: 0, voces: [] };
  // En iOS el audio debe sonar por primera vez dentro de un toque: se "desbloquea" en silencio.
  prepararAudioCuento(def);
  for (const a of [audioCuento, audioVoz]) {
    a.muted = true;
    a.play().then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
  }
  leerEscena();
}

// Pantalla de una escena: dibujo arriba, oración abajo
function montarEscena(k, rotulo, mensaje, botones) {
  const o = oracionesTexto[k];
  const ps = palabras.slice(o.inicio, o.fin).map((p) => `<span class="p" data-i="${p.i}">${escapar(p.bruta)}</span>`).join(' ');
  pantalla('lectura cuento', `
    <p class="progreso">${rotulo}</p>
    <div class="escena-cuento">
      <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${cuento.def.escenas[k]}</svg>
    </div>
    <p class="parrafo">${ps}</p>
    <div class="mensaje">${mensaje}</div>
  `, botones);
  cuento.escena = k;
  cuento.o = o;
  cuento.ctrl = Cuento.controlador($vista.querySelector('svg'));
}

function leerEscena() {
  const k = cuento.escena;
  montarEscena(k, `Escena ${k + 1} de ${oracionesTexto.length}`,
    Reconocedor ? 'Lee la oración en voz alta' : 'Lee la oración y toca «Terminé»',
    [{ texto: 'Terminé', accion: terminarEscena }]);
  const o = cuento.o;
  Object.assign(cuento, {
    base: cuento.estados.slice(), desde: o.inicio, pos: o.inicio, consumidas: 0, t0: null, leyendo: true,
    voz: { tiempos: new Array(o.fin - o.inicio).fill(null) },
  });
  escucha.alReiniciar = () => {
    cuento.base = cuento.estados.slice();
    cuento.desde = cuento.pos;
    cuento.consumidas = 0;
  };
  escucha.alOir = oirEscena;
  escucha.iniciar();
  pintarEscena();
  // Se graba su voz para que pueda escucharse después (si el iPad lo permite)
  const voz = cuento.voz;
  grabadora.iniciar().then((ok) => {
    if (!ok) { voz.tiempos = null; return; }
    if (cuento.voz !== voz || !cuento.leyendo) grabadora.detener(); // la escena terminó antes
  });
}

function oirEscena(t) {
  if (!cuento.leyendo) return;
  if (cuento.consumidas > t.length) cuento.consumidas = t.length;
  const antes = cuento.pos;
  const r = alinear(esperadas.slice(0, cuento.o.fin), t.slice(cuento.consumidas), cuento.desde, cuento.base);
  if (r.pos > cuento.o.inicio && !cuento.t0) cuento.t0 = performance.now();
  // cuándo dijo cada palabra (para sincronizar la escena con su propia voz)
  if (grabadora.activa && cuento.voz.tiempos && r.pos > antes) {
    const s = Math.max(0, grabadora.segundos() - 0.4);
    for (let i = antes; i < r.pos; i++) {
      const rel = i - cuento.o.inicio;
      if (cuento.voz.tiempos[rel] === null) cuento.voz.tiempos[rel] = s;
    }
  }
  cuento.pos = r.pos;
  cuento.estados = r.estados;
  pintarEscena();
  if (cuento.pos >= cuento.o.fin) terminarEscena();
}

function pintarEscena() {
  $vista.querySelectorAll('.parrafo .p').forEach((el) => {
    const i = Number(el.dataset.i);
    el.className = `p ${cuento.estados[i]}${cuento.leyendo && i === cuento.pos ? ' actual' : ''}`;
  });
}

function terminarEscena() {
  if (!cuento.leyendo) return;
  cuento.leyendo = false;
  if (cuento.t0) cuento.ms += performance.now() - cuento.t0;
  escucha.detener(); // micrófono apagado: la voz grabada suena bien y no se cuenta como lectura
  pintarEscena();
  ponerBotones([]);
  $vista.querySelector('.mensaje').textContent = '';
  const k = cuento.escena;
  const voz = cuento.voz;
  grabadora.detener().then((r) => {
    if (r && voz.tiempos) cuento.voces[k] = { url: r.url, duracion: r.duracion, tiempos: voz.tiempos };
  });
  setTimeout(() => { if (cuento && cuento.escena === k && !cuento.leyendo) reproducirEscena('adulta'); }, 700);
}

// Completa los tiempos que faltan repartiendo por sílabas entre los conocidos
function completarTiempos(tiempos, duracion, ps) {
  const n = ps.length;
  const t = tiempos.slice();
  const peso = ps.map((p) => p.silabas.length + 0.3);
  const conocidos = [[-1, 0.2]];
  t.forEach((v, i) => { if (v !== null) conocidos.push([i, v]); });
  conocidos.push([n, Math.max(0.6, duracion - 0.2)]);
  // entre dos palabras con tiempo conocido, cada una dura según sus sílabas
  for (let k = 0; k < conocidos.length - 1; k++) {
    const [a, ta] = conocidos[k];
    const [b, tb] = conocidos[k + 1];
    const base = Math.max(a, 0);
    const tramo = peso.slice(base, b).reduce((s, x) => s + x, 0);
    let acum = a < 0 ? 0 : peso[a];
    for (let i = a + 1; i < b; i++) {
      t[i] = ta + ((tb - ta) * acum) / tramo;
      acum += peso[i];
    }
  }
  return t;
}

// Dibuja la escena actual al ritmo de una voz: 'adulta' (grabación del cuento) o 'propia' (la lectora)
function reproducirEscena(fuente = 'adulta', { alTerminar = botonesEscena } = {}) {
  const { o, ctrl } = cuento;
  const id = ++cuento.reproduccion;
  const spans = [...$vista.querySelectorAll('.parrafo .p')];
  const n = o.fin - o.inicio;
  let dicha = -1;
  const marcar = (rel) => {
    if (rel <= dicha) return;
    dicha = rel;
    ctrl.hasta(rel);
    spans.forEach((el, q) => {
      el.classList.toggle('dicha', q < rel);
      el.classList.toggle('actual', q === rel);
    });
  };
  const fin = () => {
    if (id !== cuento.reproduccion) return;
    marcar(n - 1);
    spans.forEach((el) => { el.classList.remove('actual'); el.classList.add('dicha'); });
    ctrl.final();
    alTerminar();
  };
  const ritmoEstimado = (desdePalabra) => {
    let ms = 400;
    for (let q = desdePalabra; q < n; q++) {
      const p = palabras[o.inicio + q];
      setTimeout(() => { if (id === cuento.reproduccion) marcar(q); }, ms);
      ms += p.silabas.length * 220 + (/[,;:]$/.test(p.bruta) ? 350 : 60);
    }
    setTimeout(fin, ms + 300);
  };

  audioCuento.pause();
  audioVoz.pause();
  ctrl.reiniciar();
  ctrl.hasta(-1);
  spans.forEach((el) => { el.className = 'p escuchando'; });
  const m = $vista.querySelector('.mensaje');
  m.textContent = fuente === 'propia' ? '🎙 Tu lectura' : '';
  if (!cuento.completo) ponerBotones([]);

  // De dónde suena y cuándo empieza cada palabra
  let audio;
  let inicios;
  let desde;
  let hasta;
  if (fuente === 'propia' && cuento.voces[cuento.escena]) {
    const v = cuento.voces[cuento.escena];
    audio = audioVoz;
    if (audio.src !== v.url) audio.src = v.url;
    inicios = completarTiempos(v.tiempos, v.duracion, palabras.slice(o.inicio, o.fin));
    desde = 0;
    hasta = v.duracion + 0.3;
  } else if (tiemposCuento) {
    audio = audioCuento;
    const ini = tiemposCuento.inicios;
    inicios = ini.slice(o.inicio, o.fin);
    desde = Math.max(0, ini[o.inicio] - 0.15);
    hasta = o.fin < ini.length ? ini[o.fin] - 0.3 : tiemposCuento.duracion;
  } else {
    return ritmoEstimado(0);
  }

  audio.currentTime = desde;
  audio.play().catch(() => { /* lo resuelve el control de abajo */ });
  const comienzo = performance.now();
  const tic = () => {
    if (id !== cuento.reproduccion) return;
    const t = audio.currentTime;
    // si el audio no avanza (bloqueado o sin sonido), se sigue sin él
    if (performance.now() - comienzo > 1500 && t < desde + 0.05) {
      audio.pause();
      return ritmoEstimado(dicha + 1);
    }
    let rel = dicha;
    while (rel + 1 < n && inicios[rel + 1] <= t) rel++;
    marcar(rel);
    if (t >= hasta || audio.ended) {
      audio.pause();
      setTimeout(fin, 300);
      return;
    }
    requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
}

function botonesEscena() {
  const ultima = cuento.escena >= oracionesTexto.length - 1;
  const botones = [{ texto: '↺ Ver otra vez', accion: () => reproducirEscena('adulta') }];
  if (cuento.voces[cuento.escena]) botones.push({ texto: '🎙 Escuchar mi lectura', accion: () => reproducirEscena('propia') });
  botones.push({ texto: ultima ? 'Ver resultados' : 'Siguiente escena →', primario: true, accion: siguienteEscena });
  ponerBotones(botones);
}

function siguienteEscena() {
  cuento.reproduccion++;
  audioCuento.pause();
  audioVoz.pause();
  cuento.escena++;
  if (cuento.escena < oracionesTexto.length) return leerEscena();
  resultados({ estados: cuento.estados, segundos: Math.round(cuento.ms / 1000) });
}

// ================= Al final: el cuento completo con la voz adulta =================
function verCuentoCompleto() {
  escucha.detener();
  const def = cuentoDe(texto);
  if (!cuento || cuento.def !== def) {
    cuento = { def, escena: 0, estados: palabras.map(() => 'pendiente'), ms: 0, reproduccion: 0, voces: [] };
  }
  prepararAudioCuento(def);
  cuento.completo = true;
  cuento.leyendo = false;
  escenaCompleta(0);
}

function escenaCompleta(k) {
  montarEscena(k, `${escapar(texto.titulo)} · ${k + 1} de ${oracionesTexto.length}`, '', [
    { texto: '■ Detener', accion: finCuentoCompleto },
  ]);
  reproducirEscena('adulta', {
    alTerminar: () => {
      const id = cuento.reproduccion;
      setTimeout(() => {
        if (id !== cuento.reproduccion) return;
        if (k + 1 < oracionesTexto.length) escenaCompleta(k + 1);
        else finCuentoCompleto();
      }, 1400);
    },
  });
}

function finCuentoCompleto() {
  cuento.reproduccion++;
  cuento.completo = false;
  audioCuento.pause();
  ponerBotones([
    { texto: 'Otro texto', accion: inicio },
    { texto: '↺ Ver el cuento otra vez', primario: true, accion: verCuentoCompleto },
  ]);
}
