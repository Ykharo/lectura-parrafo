'use strict';

const { silabas, dificultad, normalizar, parecidas, alinear } = window.Analisis;

// ================= Configuración =================
const IDIOMA = 'es-CL';         // acento del reconocimiento de voz
const RONDAS_PRACTICA = 2;      // veces que se practica cada palabra difícil
const UMBRAL_DIFICULTAD = 2;    // puntaje mínimo para considerar una palabra difícil
const MAX_DIFICILES = 10;
const MIN_PALABRAS = 5;         // largo mínimo de un texto agregado

// ================= Texto actual =================
let texto = null;               // { id, titulo, parrafo, propio? }
let palabras = [];
let esperadas = [];
let dificiles = new Set();      // palabras difíciles (normalizadas)

function analizarParrafo(parrafo) {
  return parrafo.trim().split(/\s+/).map((bruta, i) => {
    const limpia = bruta.replace(/[^\p{L}]/gu, '');
    return { i, bruta, limpia, norm: normalizar(limpia), silabas: silabas(limpia), puntos: dificultad(limpia) };
  });
}

// Las de mayor puntaje primero, sin repetir.
function dificilesAutomaticas(ps) {
  return [...ps]
    .filter((p) => p.puntos >= UMBRAL_DIFICULTAD)
    .sort((a, b) => b.puntos - a.puntos)
    .map((p) => p.norm)
    .filter((n, k, arr) => arr.indexOf(n) === k)
    .slice(0, MAX_DIFICILES);
}

function cargarTexto(t) {
  texto = t;
  palabras = analizarParrafo(t.parrafo);
  esperadas = palabras.map((p) => p.norm);
  dificiles = new Set(Almacen.dificiles(t.id) || dificilesAutomaticas(palabras));
}

function todosLosTextos() {
  return [...window.TEXTOS, ...Almacen.textosPropios().map((t) => ({ ...t, propio: true }))];
}

// Palabras a practicar, sin repetir y en el orden en que aparecen.
function listaPractica() {
  const vistas = new Set();
  return palabras.filter((p) => dificiles.has(p.norm) && !vistas.has(p.norm) && vistas.add(p.norm));
}

// ================= Utilidades de pantalla =================
const $vista = document.getElementById('vista');
const $acciones = document.getElementById('acciones');
const $pasos = document.querySelector('.pasos');
const $mic = document.getElementById('mic');
const $aviso = document.getElementById('aviso');

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pantalla(clase, html, botones = []) {
  $vista.className = clase;
  $vista.innerHTML = html;
  // reinicia la animación de entrada
  $vista.style.animation = 'none';
  void $vista.offsetWidth;
  $vista.style.animation = '';
  window.scrollTo(0, 0);
  $acciones.innerHTML = '';
  for (const b of botones) {
    const el = document.createElement('button');
    el.textContent = b.texto;
    if (b.primario) el.className = 'primario';
    el.addEventListener('click', b.accion);
    $acciones.appendChild(el);
  }
}

// 0 = fuera de las etapas (inicio, historial…)
function marcarPaso(n) {
  $pasos.classList.toggle('oculto', n === 0);
  $pasos.querySelectorAll('span').forEach((el) => {
    const p = Number(el.dataset.paso);
    el.classList.toggle('activo', p === n);
    el.classList.toggle('hecho', p < n);
  });
}

function htmlParrafo() {
  return `<p class="parrafo">${palabras.map((p) => `<span class="p" data-i="${p.i}">${escapar(p.bruta)}</span>`).join(' ')}</p>`;
}

function mostrarAviso(mensaje, boton) {
  $aviso.innerHTML = mensaje ? `<div>${mensaje}</div>` : '';
  if (boton) {
    const el = document.createElement('button');
    el.className = 'primario';
    el.textContent = boton.texto;
    el.addEventListener('click', () => { ocultarAviso(); boton.accion(); });
    $aviso.appendChild(el);
  }
  $aviso.hidden = false;
}
function ocultarAviso() { $aviso.hidden = true; }

const tokens = (t) => t.split(/\s+/).map(normalizar).filter(Boolean);

// Voz sintética para modelar la pronunciación.
function decir(frase) {
  return new Promise((listo) => {
    if (!('speechSynthesis' in window)) return listo();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(frase);
    u.lang = IDIOMA;
    u.rate = 0.75;
    const voces = speechSynthesis.getVoices();
    const voz = voces.find((v) => v.lang === IDIOMA) || voces.find((v) => v.lang.startsWith('es'));
    if (voz) u.voice = voz;
    u.onend = u.onerror = () => listo();
    speechSynthesis.speak(u);
  });
}

// ================= Reconocimiento de voz =================
const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;

const escucha = {
  activo: false,
  rec: null,
  alOir: null,       // (palabras reconocidas en la sesión actual) => void
  alReiniciar: null, // se llama cuando empieza una sesión nueva (las palabras vuelven a cero)

  iniciar() {
    if (!Reconocedor) return;
    this.activo = true;
    if (!this.rec) this.crear();
    this.alReiniciar?.();
    try { this.rec.start(); } catch { /* ya estaba escuchando */ }
  },

  detener() {
    this.activo = false;
    if (this.rec) try { this.rec.abort(); } catch { /* nada */ }
    $mic.hidden = true;
  },

  crear() {
    const r = new Reconocedor();
    r.lang = IDIOMA;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => { $mic.hidden = false; };
    r.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += ' ' + e.results[i][0].transcript;
      if (this.activo) this.alOir?.(tokens(t));
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.activo = false;
        mostrarAviso('Necesito permiso para usar el micrófono. Revisa que el Dictado esté activado en el iPad.',
          { texto: 'Intentar de nuevo', accion: () => this.iniciar() });
      }
    };
    // Safari corta la escucha tras un silencio: se reanuda sola mientras siga activa.
    r.onend = () => {
      $mic.hidden = true;
      if (!this.activo) return;
      setTimeout(() => {
        if (!this.activo) return;
        this.alReiniciar?.();
        try { r.start(); } catch (err) {
          if (err.name === 'InvalidStateError') return; // ya se reanudó por otro lado
          mostrarAviso('', { texto: 'Toca para seguir escuchando', accion: () => this.iniciar() });
        }
      }, 250);
    };
    this.rec = r;
  },
};

// ================= Inicio: elegir texto =================
function inicio() {
  escucha.detener();
  ocultarAviso();
  marcarPaso(0);
  const textos = todosLosTextos();
  pantalla('inicio', `
    <p class="titulo">Lectura</p>
    <p class="grande">¿Qué vamos a leer hoy?</p>
    <div class="tarjetas">
      ${textos.map((t) => `
        <div class="tarjeta" data-id="${escapar(t.id)}">
          ${t.propio ? `<span class="borrar" data-borrar="${escapar(t.id)}" aria-label="Eliminar">✕</span>` : ''}
          <strong>${escapar(t.titulo)}</strong>
          <span class="vista-previa">${escapar(t.parrafo.trim().split(/\s+/).slice(0, 9).join(' '))}…</span>
          <span class="meta">${t.parrafo.trim().split(/\s+/).length} palabras${t.propio ? ' · agregado' : ''}</span>
        </div>`).join('')}
    </div>
  `, [
    { texto: '+ Agregar texto', accion: agregarTexto },
    { texto: 'Historial', accion: historial },
  ]);

  $vista.querySelector('.tarjetas').addEventListener('click', (e) => {
    const borrar = e.target.closest('[data-borrar]');
    if (borrar) {
      const t = textos.find((x) => x.id === borrar.dataset.borrar);
      if (confirm(`¿Eliminar «${t.titulo}»?`)) { Almacen.borrarTexto(t.id); inicio(); }
      return;
    }
    const tarjeta = e.target.closest('.tarjeta');
    if (!tarjeta) return;
    cargarTexto(textos.find((x) => x.id === tarjeta.dataset.id));
    etapa1();
  });
}

// ================= Agregar un texto propio =================
function agregarTexto() {
  marcarPaso(0);
  ocultarAviso();
  pantalla('formulario', `
    <p class="titulo">Nuevo texto</p>
    <label class="campo"><span>Título</span>
      <input id="f-titulo" maxlength="60" placeholder="Ej: El perro de Ana" autocomplete="off">
    </label>
    <label class="campo"><span>Párrafo</span>
      <textarea id="f-parrafo" placeholder="Escribe o pega aquí el párrafo…"></textarea>
    </label>
    <p class="contador" id="f-contador">0 palabras</p>
  `, [
    { texto: 'Cancelar', accion: inicio },
    { texto: 'Guardar y leer', primario: true, accion: guardar },
  ]);

  const $titulo = document.getElementById('f-titulo');
  const $parrafo = document.getElementById('f-parrafo');
  const $contador = document.getElementById('f-contador');
  const contar = () => ($parrafo.value.trim() ? $parrafo.value.trim().split(/\s+/).length : 0);

  $parrafo.addEventListener('input', () => {
    const n = contar();
    $contador.textContent = `${n} palabra${n === 1 ? '' : 's'}`;
    $contador.classList.remove('error');
  });

  function guardar() {
    if (contar() < MIN_PALABRAS) {
      $contador.textContent = `Escribe al menos ${MIN_PALABRAS} palabras.`;
      $contador.classList.add('error');
      return;
    }
    const nuevo = {
      id: 'propio-' + Date.now(),
      titulo: $titulo.value.trim() || 'Mi texto',
      parrafo: $parrafo.value.trim().replace(/\s+/g, ' '),
    };
    Almacen.agregarTexto(nuevo);
    cargarTexto({ ...nuevo, propio: true });
    etapa1();
  }
}

// ================= Historial =================
function historial() {
  escucha.detener();
  ocultarAviso();
  marcarPaso(0);
  const lecturas = Almacen.historial().slice().reverse(); // más recientes primero
  const ultimas = lecturas.slice(0, 5);
  const promedio = ultimas.length ? Math.round(ultimas.reduce((s, r) => s + r.ppm, 0) / ultimas.length) : 0;
  const mejor = lecturas.reduce((m, r) => Math.max(m, r.ppm), 0);
  const fecha = (f) => {
    const d = new Date(f);
    return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  pantalla('historial', `
    <p class="titulo">Historial</p>
    ${lecturas.length ? `
      <div class="cifras">
        <div class="cifra"><strong>${lecturas.length}</strong><span>Lecturas</span></div>
        <div class="cifra"><strong>${promedio}</strong><span>Pal/min (últimas 5)</span></div>
        <div class="cifra"><strong>${mejor}</strong><span>Mejor marca</span></div>
      </div>
      <table class="tabla">
        <thead><tr><th>Fecha</th><th>Texto</th><th class="num">Pal/min</th><th class="num">Leídas</th></tr></thead>
        <tbody>${lecturas.map((r) => `
          <tr>
            <td>${fecha(r.fecha)}</td>
            <td>${escapar(r.titulo)}</td>
            <td class="num">${r.ppm}</td>
            <td class="num">${r.total ? Math.round((100 * r.leidas) / r.total) : 0}%</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="sub">Todavía no hay lecturas guardadas.</p>'}
    <p class="nota">El historial se guarda en este iPad. Usa «Exportar respaldo» de vez en cuando para no perderlo.</p>
    <input type="file" id="f-importar" accept="application/json,.json" hidden>
  `, [
    { texto: '← Volver', accion: inicio },
    { texto: 'Exportar respaldo', accion: exportarRespaldo },
    { texto: 'Importar respaldo', accion: () => document.getElementById('f-importar').click() },
  ]);

  document.getElementById('f-importar').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      Almacen.importar(JSON.parse(await archivo.text()));
      historial();
    } catch {
      mostrarAviso('No pude leer ese archivo de respaldo.');
    }
  });
}

function exportarRespaldo() {
  const blob = new Blob([JSON.stringify(Almacen.exportar(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lectura-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ================= Etapa 1: mirar el párrafo =================
function etapa1() {
  escucha.detener();
  ocultarAviso();
  marcarPaso(1);
  practica = null;
  pantalla('paso1', `
    <p class="titulo">${escapar(texto.titulo)}</p>
    <p class="indicacion">Mira el texto. Las palabras en <b>dorado</b> son las más difíciles.</p>
    ${htmlParrafo()}
  `, [
    { texto: '← Textos', accion: inicio },
    { texto: '', primario: true, accion: etapa2 },
  ]);

  const boton = $acciones.querySelector('.primario');
  const pintar = () => {
    $vista.querySelectorAll('.p').forEach((el) => {
      el.classList.toggle('dificil', dificiles.has(palabras[el.dataset.i].norm));
    });
    const n = listaPractica().length;
    boton.textContent = n ? `Practicar ${n} palabras` : 'Ir a la lectura';
  };
  // Tocar una palabra la agrega o la quita de las difíciles (queda guardado para este texto).
  $vista.querySelector('.parrafo').addEventListener('click', (e) => {
    const el = e.target.closest('.p');
    if (!el) return;
    const { norm } = palabras[el.dataset.i];
    if (!norm) return;
    if (dificiles.has(norm)) dificiles.delete(norm);
    else dificiles.add(norm);
    Almacen.guardarDificiles(texto.id, [...dificiles]);
    pintar();
  });
  pintar();
  if (!Reconocedor) mostrarAviso('Este navegador no permite reconocer la voz. Abre la página en Safari en el iPad.');
}

// ================= Etapa 2: practicar palabras difíciles =================
let practica = null;

function etapa2() {
  const lista = listaPractica();
  if (!lista.length) return antesDeLeer();
  marcarPaso(2);
  practica = { lista, ronda: 1, indice: 0, consumidas: 0, ultimas: 0, pausada: false, acerto: false, saltadas: new Set() };
  escucha.alReiniciar = () => { practica.consumidas = 0; practica.ultimas = 0; };
  escucha.alOir = oirPractica;
  escucha.iniciar();
  mostrarPalabra();
}

function mostrarPalabra() {
  const { lista, ronda, indice } = practica;
  const p = lista[indice];
  practica.pausada = false;
  practica.acerto = false;
  practica.consumidas = practica.ultimas; // ignora lo dicho antes de mostrar la palabra
  const puntos = lista.map((_, k) => `<span class="${k < indice ? 'hecho' : k === indice ? 'ahora' : ''}"></span>`).join('');
  pantalla('practica', `
    <p class="progreso">Ronda ${ronda} de ${RONDAS_PRACTICA}</p>
    <div class="palabra-grande">${escapar(p.limpia)}</div>
    <div class="silabas">${p.silabas.map(escapar).join('<i>·</i>')}</div>
    <div class="mensaje">${Reconocedor ? 'Lee la palabra en voz alta' : 'Lee la palabra y toca «Siguiente»'}</div>
    <div class="barra">${puntos}</div>
  `, [
    { texto: '🔊 Escuchar', accion: escucharModelo },
    { texto: Reconocedor ? 'Saltar' : 'Siguiente', accion: saltarPalabra },
  ]);
}

function oirPractica(t) {
  practica.ultimas = t.length;
  if (practica.consumidas > t.length) practica.consumidas = t.length;
  if (practica.pausada) return;
  const objetivo = practica.lista[practica.indice].norm;
  const nuevas = t.slice(practica.consumidas);
  const leyo = nuevas.some((w, k) => parecidas(w, objetivo) || (k + 1 < nuevas.length && parecidas(w + nuevas[k + 1], objetivo)));
  if (!leyo) return;
  practica.pausada = true;
  practica.acerto = true;
  practica.consumidas = t.length;
  $vista.querySelector('.palabra-grande').classList.add('bien');
  const msg = $vista.querySelector('.mensaje');
  msg.textContent = ['¡Muy bien!', '¡Excelente!', '¡Bien hecho!', '¡Perfecto!'][Math.floor(Math.random() * 4)];
  msg.classList.add('bien');
  setTimeout(siguientePalabra, 900);
}

async function escucharModelo() {
  if (practica.acerto) return;
  practica.pausada = true; // que no cuente la voz del iPad como lectura
  await decir(practica.lista[practica.indice].limpia);
  setTimeout(() => {
    practica.consumidas = practica.ultimas;
    practica.pausada = false;
  }, 700);
}

function saltarPalabra() {
  if (practica.acerto) return; // ya va a avanzar sola
  practica.saltadas.add(practica.lista[practica.indice].limpia);
  siguientePalabra();
}

function siguientePalabra() {
  practica.indice++;
  if (practica.indice < practica.lista.length) return mostrarPalabra();
  if (practica.ronda < RONDAS_PRACTICA) {
    practica.ronda++;
    practica.indice = 0;
    practica.pausada = true;
    pantalla('centro', `
      <p class="grande">¡Ronda lista!</p>
      <p class="sub">Ahora una vez más.</p>
    `);
    return setTimeout(mostrarPalabra, 1800);
  }
  antesDeLeer();
}

function antesDeLeer() {
  escucha.detener();
  marcarPaso(3);
  pantalla('centro', `
    <p class="grande">¡Muy bien!</p>
    <p class="sub">Ahora lee el párrafo completo en voz alta.</p>
  `, [{ texto: 'Comenzar lectura', primario: true, accion: etapa3 }]);
}

// ================= Etapa 3: lectura completa =================
let lectura = null;

function etapa3() {
  ocultarAviso();
  marcarPaso(3);
  const vacio = palabras.map(() => 'pendiente');
  lectura = { base: vacio, estados: vacio, inicioSesion: 0, pos: 0, t0: null, t1: null, terminada: false };
  pantalla('paso3', `<p class="titulo">${escapar(texto.titulo)}</p>${htmlParrafo()}`,
    [{ texto: 'Terminar', accion: terminarLectura }]);
  escucha.alReiniciar = () => {
    lectura.base = lectura.estados.slice();
    lectura.inicioSesion = lectura.pos;
  };
  escucha.alOir = oirLectura;
  escucha.iniciar();
  pintarLectura();
  if (!Reconocedor) mostrarAviso('Este navegador no reconoce la voz. Usa Safari en el iPad.');
}

function oirLectura(t) {
  if (lectura.terminada) return;
  const r = alinear(esperadas, t, lectura.inicioSesion, lectura.base);
  if (r.pos > 0 && !lectura.t0) lectura.t0 = performance.now();
  lectura.pos = r.pos;
  lectura.estados = r.estados;
  pintarLectura();
  if (lectura.pos >= palabras.length) terminarLectura();
}

function pintarLectura() {
  $vista.querySelectorAll('.p').forEach((el) => {
    const i = Number(el.dataset.i);
    el.className = `p ${lectura.estados[i]}${i === lectura.pos ? ' actual' : ''}`;
  });
  $vista.querySelector('.actual')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function terminarLectura() {
  if (lectura.terminada) return;
  lectura.terminada = true;
  lectura.t1 = performance.now();
  escucha.detener();
  setTimeout(resultados, 800);
}

function resultados() {
  const leidas = lectura.estados.filter((e) => e === 'leida').length;
  const segundos = lectura.t0 ? Math.round((lectura.t1 - lectura.t0) / 1000) : 0;
  const ppm = segundos ? Math.round(leidas / (segundos / 60)) : 0;
  const tiempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

  const repasar = [...new Set([
    ...palabras.filter((p, i) => lectura.estados[i] === 'saltada').map((p) => p.limpia),
    ...(practica ? practica.saltadas : []),
  ])];

  if (leidas > 0 && segundos > 0) {
    Almacen.agregarLectura({
      fecha: new Date().toISOString(),
      textoId: texto.id,
      titulo: texto.titulo,
      segundos,
      ppm,
      leidas,
      total: palabras.length,
      repasar,
    });
  }

  pantalla('centro', `
    <p class="grande">${leidas === palabras.length ? '¡Lo lograste!' : '¡Terminaste!'}</p>
    <div class="cifras">
      <div class="cifra"><strong>${tiempo}</strong><span>Tiempo</span></div>
      <div class="cifra"><strong>${ppm}</strong><span>Palabras por minuto</span></div>
      <div class="cifra"><strong>${leidas}/${palabras.length}</strong><span>Palabras leídas</span></div>
    </div>
    ${repasar.length ? `<div class="repasar"><p>Para repasar</p>${repasar.map((w) => `<span class="chip">${escapar(w)}</span>`).join('')}</div>` : ''}
  `, [
    { texto: 'Otro texto', accion: inicio },
    { texto: 'Leer otra vez', primario: true, accion: etapa3 },
  ]);
}

// ================= Arranque =================
if ('speechSynthesis' in window) speechSynthesis.getVoices(); // precarga las voces
inicio();
