'use strict';

// Etapas especiales de los textos con cuento animado (js/cuentos/<id>.js):
//   Practicar → muro de palabras (hasta 5 por escena) · Frases → escalera ·
//   Leer → escenas animadas con la voz adulta grabada · Al final → el cuento completo.
// Usa el estado y las utilidades de js/app.js (se carga antes que app.js; todo se llama en tiempo de ejecución).

const audioCuento = new Audio(); // voz adulta grabada (texto completo)
audioCuento.preload = 'auto';
let cuento = null;
let muroJuego = null;
let escaleraJuego = null;
const MAX_POR_ESCENA = 5;        // palabras difíciles a practicar por escena
const UMBRAL_ESCENA = 1.5;       // puntaje mínimo de dificultad dentro de una escena

const juegosDe = (t) => (cuentoDe(t) && cuentoDe(t).juegos) || {};
// Estilo visual del cuento: 'griego' usa el muro, la escalera y las escenas de jarrón griego
const esGriego = () => { const def = cuentoDe(texto); return !!def && def.estilo === 'griego'; };

// Selección automática para cuentos: hasta 5 palabras difíciles por escena (oración)
function dificilesPorEscena(ps, ors) {
  const elegidas = [];
  for (const o of ors) {
    ps.slice(o.inicio, o.fin)
      .filter((p) => p.puntos >= UMBRAL_ESCENA)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, MAX_POR_ESCENA)
      .forEach((p) => elegidas.push(p.norm));
  }
  return elegidas;
}

// Palabras del muro: las marcadas en Mirar, agrupadas por escena (máx. 5 cada una, sin repetir)
function listaMuro() {
  const vistas = new Set();
  const lista = [];
  oracionesTexto.forEach((o, escena) => {
    palabras.slice(o.inicio, o.fin)
      .filter((p) => dificiles.has(p.norm) && !vistas.has(p.norm) && vistas.add(p.norm))
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, MAX_POR_ESCENA)
      .sort((a, b) => a.i - b.i)
      .forEach((p) => lista.push({ ...p, escena }));
  });
  return lista;
}

// Prepara la grabación adulta del texto (se llama al elegir el texto)
function prepararAudioCuento(def) {
  const url = new URL(def.audio, location.href).href;
  if (audioCuento.src !== url) audioCuento.src = url;
}

function detenerCuento() {
  if (cuento) cuento.reproduccion++;
  audioCuento.pause();
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
// lista: palabras a practicar (por defecto, todas las escenas); alFin: qué sigue al terminar
function etapaMuro(lista = listaMuro(), alFin = null) {
  const seguir = alFin || etapaFrases;
  if (!lista.length) return seguir();
  ocultarAviso();
  marcarPaso(2);
  practica = { lista, indice: 0, consumidas: 0, ignorar: false, saltadas: new Set(), alFin: seguir };
  pantalla(`juego juego-muro${esGriego() ? ' griego' : ''}`, `
    <p class="progreso" id="j-progreso"></p>
    <svg viewBox="0 0 1000 260" aria-hidden="true"></svg>
    <p class="parrafo oracion-juego" id="j-oracion"></p>
    <div class="mensaje" id="j-mensaje"></div>
  `, [{ texto: '🔊 Escuchar', accion: escucharPalabraMuro }]);
  const latir = (si) => {
    const el = $vista.querySelector('.objetivo');
    if (el) el.classList.toggle('latiendo', si);
  };
  muroJuego = (esGriego() ? MuroGriego : Muro).crear($vista.querySelector('svg'), {
    // la palabra late mientras espera la lectura
    alListo: (golpes) => {
      latir(true);
      const el = document.getElementById('j-mensaje');
      if (el) el.textContent = golpes === 0 ? 'Lee la palabra en voz alta' : '¡Otra vez!';
    },
    alCorrer: () => latir(false),
    alRomper: () => {
      const el = $vista.querySelector('.objetivo');
      if (el) { el.classList.remove('objetivo', 'latiendo'); el.classList.add('lograda'); }
      const m = document.getElementById('j-mensaje');
      if (m) m.textContent = '¡Muro roto!';
    },
    alTerminar: siguienteMuro,
  });
  // respaldo discreto si el micrófono no capta la palabra: un adulto puede tocar la escena
  $vista.querySelector('svg').addEventListener('click', () => { if (muroJuego) muroJuego.leer(); });
  escucha.alReiniciar = () => { practica.consumidas = 0; };
  escucha.alOir = oirMuro;
  escucha.iniciar();
  mostrarMuro();
}

function mostrarMuro() {
  const p = practica.lista[practica.indice];
  const o = oracionesTexto[p.escena];
  const deLaEscena = practica.lista.filter((x) => x.escena === p.escena);
  document.getElementById('j-progreso').textContent =
    `Escena ${p.escena + 1} de ${oracionesTexto.length} · Palabra ${deLaEscena.indexOf(p) + 1} de ${deLaEscena.length}`;
  document.getElementById('j-oracion').innerHTML = palabras.slice(o.inicio, o.fin)
    .map((w) => (w.i === p.i ? `<span class="objetivo">${escapar(w.bruta)}</span>` : escapar(w.bruta)))
    .join(' ');
  practica.consumidas = escucha.cantidad;
  // En el estilo griego, la última palabra de cada escena trae a los dioses
  const ultimaDeEscena = deLaEscena[deLaEscena.length - 1] === p;
  muroJuego.palabra(p.silabas, { texto: p.limpia, dioses: ultimaDeEscena });
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
    <p class="sub">Ahora vamos a leer por bloques.</p>
  `);
  setTimeout(practica.alFin, 1800); // el micrófono sigue encendido
}

// ================= Frases: escalera =================
// desde/hasta: oraciones a recorrer (por defecto, todas); alFin: qué sigue al terminar
function etapaEscalera({ desde = 0, hasta = oracionesTexto.length, alFin = antesDeLeer } = {}) {
  ocultarAviso();
  marcarPaso(3);
  frases = { oracion: desde, hasta, alFin, nivel: 1, consumidas: 0, pausada: false, acerto: false };
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
  pantalla(`juego juego-escalera lectura frases${esGriego() ? ' griego' : ''}`, `
    <p class="progreso">Escena ${frases.oracion + 1} de ${oracionesTexto.length} · Por bloques</p>
    <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
    <p class="parrafo" id="j-frase"></p>
    <div class="mensaje"></div>
  `, [
    { texto: '🔊 Escuchar', accion: escucharFraseEscalera },
    { texto: 'Siguiente', accion: () => { if (!frases.acerto) completarNivel(); } },
  ]);
  if (escaleraJuego) escaleraJuego.destruir();
  escaleraJuego = (esGriego() ? EscaleraGriega : Escalera).crear(
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
    t0: null,
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
  if (r.pos > frases.inicio && !frases.t0) frases.t0 = performance.now();
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
  if (ultimoNivel) {
    // el último nivel es la oración completa: cuenta como la lectura de la escena
    frases.estadosUltimo = frases.estados.slice();
    frases.msUltimo = frases.t0 ? performance.now() - frases.t0 : 0;
  }
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
  if (frases.oracion < frases.hasta) return montarOracionEscalera();
  escaleraJuego.destruir();
  escaleraJuego = null;
  frases.alFin();
}

async function escucharFraseEscalera() {
  if (frases.acerto) return;
  frases.pausada = true;
  await reproducirTramo(frases.inicio, frases.fin);
  setTimeout(() => { frases.consumidas = escucha.cantidad; frases.pausada = false; }, 600);
}

// En iOS el audio debe sonar por primera vez dentro de un toque: se "desbloquea" en silencio.
function desbloquearAudio() {
  prepararAudioCuento(cuentoDe(texto));
  audioCuento.muted = true;
  audioCuento.play()
    .then(() => { audioCuento.pause(); audioCuento.muted = false; })
    .catch(() => { audioCuento.muted = false; });
}

function nuevoCuento(guiado) {
  cuento = {
    def: cuentoDe(texto), escena: 0, estados: palabras.map(() => 'pendiente'), ms: 0, reproduccion: 0, guiado,
  };
}

// ================= Recorrido guiado: escena por escena =================
// Por cada escena: presentación → palabras difíciles (muro) → bloques (escalera) → lectura con animación.
function empezarGuiado() {
  nuevoCuento(true);
  desbloquearAudio();
  presentarEscena();
}

function presentarEscena() {
  escucha.detener();
  detenerCuento();
  ocultarAviso();
  marcarPaso(1);
  const k = cuento.escena;
  const o = oracionesTexto[k];
  const difs = listaMuro().filter((p) => p.escena === k);
  const marcadas = new Set(difs.map((p) => p.i));
  const ps = palabras.slice(o.inicio, o.fin)
    .map((p) => `<span class="p${marcadas.has(p.i) ? ' dificil' : ''}">${escapar(p.bruta)}</span>`).join(' ');
  pantalla('paso1 presentacion', `
    <p class="titulo">Escena ${k + 1} de ${oracionesTexto.length}</p>
    <p class="indicacion">${difs.length
      ? `Primero practica ${difs.length === 1 ? 'la palabra' : `las ${difs.length} palabras`} en <b>dorado</b>, luego lee por bloques y al final mira la escena.`
      : 'Lee por bloques y al final mira la escena.'}</p>
    <p class="parrafo">${ps}</p>
  `, [{ texto: 'Comenzar', primario: true, accion: () => practicarEscena(difs) }]);
}

function practicarEscena(difs) {
  const k = cuento.escena;
  // El micrófono se enciende con el toque (el iPad lo exige); mientras dura la transición no cuenta nada.
  escucha.alReiniciar = null;
  escucha.alOir = null;
  escucha.iniciar();
  const bloques = () => etapaEscalera({ desde: k, hasta: k + 1, alFin: animarEscena });
  if (!difs.length) return bloques();
  marcarPaso(2);
  pantalla('centro transicion', `
    <p class="grande">Palabras difíciles</p>
    <p class="sub">Lee cada palabra en voz alta <b>3 veces</b> para romper el muro.</p>
  `);
  setTimeout(() => { if (cuento && cuento.escena === k && !muroJuego) etapaMuro(difs, bloques); }, 3000);
}

// Al terminar los bloques ya leyó la oración completa: se pasa directo a la animación con la voz grabada
function animarEscena() {
  const k = cuento.escena;
  const o = oracionesTexto[k];
  const leidos = frases.estadosUltimo || [];
  for (let i = o.inicio; i < o.fin; i++) cuento.estados[i] = leidos[i] || 'pendiente';
  cuento.ms += frases.msUltimo || 0;
  escucha.detener(); // micrófono apagado: la voz grabada suena bien
  ocultarAviso();
  marcarPaso(4);
  montarEscena(k, `Escena ${k + 1} de ${oracionesTexto.length}`, 'Escucha y mira la escena', []);
  cuento.leyendo = false;
  $vista.querySelectorAll('.parrafo .p').forEach((el) => { el.className = 'p escuchando'; });
  setTimeout(() => { if (cuento && cuento.escena === k && !cuento.leyendo) reproducirEscena(); }, 1200);
}

// ================= Leer: escenas animadas =================
// Lectura directa de todas las escenas (para quien ya leyó el cuento)
function etapaCuento() {
  escucha.detener();
  ocultarAviso();
  marcarPaso(4);
  nuevoCuento(false);
  desbloquearAudio();
  leerEscena();
}

// Pantalla de una escena: dibujo arriba, oración abajo
function montarEscena(k, rotulo, mensaje, botones) {
  const o = oracionesTexto[k];
  const ps = palabras.slice(o.inicio, o.fin).map((p) => `<span class="p" data-i="${p.i}">${escapar(p.bruta)}</span>`).join(' ');
  pantalla(`lectura cuento${esGriego() ? ' griego' : ''}`, `
    <p class="progreso">${rotulo}</p>
    <div class="escena-cuento${esGriego() ? ' escena-griega' : ''}">
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
  ocultarAviso();
  marcarPaso(4);
  montarEscena(k, `Escena ${k + 1} de ${oracionesTexto.length}`,
    Reconocedor ? 'Lee la oración en voz alta' : 'Lee la oración y toca «Terminé»',
    [{ texto: 'Terminé', accion: terminarEscena }]);
  const o = cuento.o;
  Object.assign(cuento, { base: cuento.estados.slice(), desde: o.inicio, pos: o.inicio, consumidas: 0, t0: null, leyendo: true });
  escucha.alReiniciar = () => {
    cuento.base = cuento.estados.slice();
    cuento.desde = cuento.pos;
    cuento.consumidas = 0;
  };
  escucha.alOir = oirEscena;
  escucha.iniciar();
  pintarEscena();
}

function oirEscena(t) {
  if (!cuento.leyendo) return;
  if (cuento.consumidas > t.length) cuento.consumidas = t.length;
  const r = alinear(esperadas.slice(0, cuento.o.fin), t.slice(cuento.consumidas), cuento.desde, cuento.base);
  if (r.pos > cuento.o.inicio && !cuento.t0) cuento.t0 = performance.now();
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
  setTimeout(() => { if (cuento && cuento.escena === k && !cuento.leyendo) reproducirEscena(); }, 700);
}

// Dibuja la escena actual al ritmo de la voz adulta grabada (o de un ritmo estimado si no hay grabación)
function reproducirEscena({ alTerminar = botonesEscena } = {}) {
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
  ctrl.reiniciar();
  ctrl.hasta(-1);
  spans.forEach((el) => { el.className = 'p escuchando'; });
  $vista.querySelector('.mensaje').textContent = '';
  if (!cuento.completo) ponerBotones([]);

  if (!tiemposCuento) return ritmoEstimado(0);
  const ini = tiemposCuento.inicios;
  const desde = Math.max(0, ini[o.inicio] - 0.15);
  const hasta = o.fin < ini.length ? ini[o.fin] - 0.3 : tiemposCuento.duracion;
  audioCuento.currentTime = desde;
  audioCuento.play().catch(() => { /* lo resuelve el control de abajo */ });
  const comienzo = performance.now();
  const tic = () => {
    if (id !== cuento.reproduccion) return;
    const t = audioCuento.currentTime;
    // si el audio no avanza (bloqueado o sin sonido), se sigue sin él
    if (performance.now() - comienzo > 1500 && t < desde + 0.05) {
      audioCuento.pause();
      return ritmoEstimado(dicha + 1);
    }
    let rel = dicha;
    while (rel + 1 < n && ini[o.inicio + rel + 1] <= t) rel++;
    marcar(rel);
    if (t >= hasta || audioCuento.ended) {
      audioCuento.pause();
      setTimeout(fin, 300);
      return;
    }
    requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
}

function botonesEscena() {
  const ultima = cuento.escena >= oracionesTexto.length - 1;
  ponerBotones([
    { texto: '↺ Ver otra vez', accion: () => reproducirEscena() },
    { texto: ultima ? 'Ver resultados' : 'Siguiente escena →', primario: true, accion: siguienteEscena },
  ]);
}

function siguienteEscena() {
  cuento.reproduccion++;
  audioCuento.pause();
  cuento.escena++;
  if (cuento.escena < oracionesTexto.length) return cuento.guiado ? presentarEscena() : leerEscena();
  Almacen.marcarLeido(texto.id); // desde ahora se habilitan «Leer con animación» y «Escuchar el cuento»
  resultados({ estados: cuento.estados, segundos: Math.round(cuento.ms / 1000) });
}

// ================= Al final: el cuento completo con la voz adulta =================
function verCuentoCompleto() {
  escucha.detener();
  detenerCuento();
  if (!cuento || cuento.def !== cuentoDe(texto)) nuevoCuento(false);
  prepararAudioCuento(cuento.def);
  marcarPaso(4);
  cuento.completo = true;
  cuento.leyendo = false;
  escenaCompleta(0);
}

function escenaCompleta(k) {
  montarEscena(k, `${escapar(texto.titulo)} · ${k + 1} de ${oracionesTexto.length}`, '', [
    { texto: '■ Detener', accion: finCuentoCompleto },
  ]);
  reproducirEscena({
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
    { texto: '← Volver al texto', accion: etapa1 },
    { texto: '↺ Ver el cuento otra vez', primario: true, accion: verCuentoCompleto },
  ]);
}
