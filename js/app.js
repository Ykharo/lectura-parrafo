'use strict';

const { silabas, dificultad, normalizar, parecidas, alinear, oraciones } = window.Analisis;

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
let oracionesTexto = [];        // [{ inicio, fin, bloques: [[inicio, fin], …] }]

// Un " / " en el párrafo marca el inicio de un bloque (etapa Frases); no se muestra.
function analizarParrafo(parrafo) {
  const res = [];
  let corte = false;
  for (const bruta of parrafo.replace(/\s*\/\s*/g, ' / ').trim().split(/\s+/)) {
    if (bruta === '/') { corte = true; continue; }
    const limpia = bruta.replace(/[^\p{L}]/gu, '');
    res.push({ i: res.length, bruta, limpia, norm: normalizar(limpia), silabas: silabas(limpia), puntos: dificultad(limpia), corte });
    corte = false;
  }
  return res;
}

const sinMarcas = (parrafo) => parrafo.replace(/\s*\/\s*/g, ' ').trim();

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
  const def = cuentoDe(t);
  oracionesTexto = agruparOraciones(oraciones(palabras), def); // en los cuentos: una entrada por escena
  const automaticas = juegosDe(t).muro ? dificilesPorEscena(palabras, oracionesTexto) : dificilesAutomaticas(palabras);
  dificiles = new Set(Almacen.dificiles(t.id) || automaticas);

  // Cuento animado: tiempos de cada palabra en la grabación adulta
  tiemposCuento = null;
  if (def) {
    prepararAudioCuento(def);
    fetch(def.tiempos)
      .then((r) => r.json())
      .then((j) => {
        if (texto === t && j.palabras.length === palabras.length) {
          tiemposCuento = { inicios: j.palabras.map((p) => p.inicio), duracion: j.duracion };
        }
      })
      .catch(() => { /* sin grabación: la animación sigue un ritmo estimado */ });
  }
}

// Escenas animadas del texto, si las tiene: una por oración, o por grupo de oraciones (def.grupos)
function cuentoDe(t) {
  const def = t && t.cuento && window.CUENTOS && window.CUENTOS[t.cuento];
  if (!def) return null;
  const total = oraciones(analizarParrafo(t.parrafo)).length;
  if (def.grupos) {
    const ultimo = def.grupos[def.grupos.length - 1];
    return def.escenas.length === def.grupos.length && ultimo[ultimo.length - 1] === total - 1 ? def : null;
  }
  return def.escenas.length === total ? def : null;
}

// Junta oraciones consecutivas en escenas según def.grupos (sus bloques se concatenan)
function agruparOraciones(ors, def) {
  if (!def || !def.grupos) return ors;
  return def.grupos.map((grupo) => {
    const partes = grupo.map((k) => ors[k]);
    return {
      inicio: partes[0].inicio,
      fin: partes[partes.length - 1].fin,
      bloques: partes.reduce((todos, o) => todos.concat(o.bloques), []),
    };
  });
}
let tiemposCuento = null;   // { inicios: [segundos por palabra], duracion }

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
  ponerBotones(botones);
}

function ponerBotones(botones) {
  $acciones.innerHTML = '';
  for (const b of botones) {
    const el = document.createElement('button');
    el.textContent = b.texto;
    if (b.primario) el.className = 'primario';
    if (b.deshabilitado) el.disabled = true;
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
  cantidad: 0,       // palabras reconocidas hasta ahora en la sesión

  // Si ya está escuchando no hace nada: la etapa siguiente solo cambia alOir/alReiniciar.
  iniciar() {
    if (!Reconocedor || this.activo) return;
    this.activo = true;
    if (!this.rec) this.crear();
    this.nuevaSesion();
    try { this.rec.start(); } catch { /* termina de cerrarse la sesión anterior; onend la reanuda */ }
  },

  nuevaSesion() {
    this.cantidad = 0;
    if (this.alReiniciar) this.alReiniciar();
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
      const dichas = tokens(t);
      this.cantidad = dichas.length;
      if (this.activo && this.alOir) this.alOir(dichas);
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
        try {
          r.start();
          this.nuevaSesion();
        } catch (err) {
          if (err.name === 'InvalidStateError') return; // ya se reanudó por otro lado
          this.activo = false;
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
  detenerCuento();
  ocultarAviso();
  marcarPaso(0);
  const textos = todosLosTextos();
  pantalla('inicio', `
    <p class="titulo">Lectura</p>
    <p class="grande">¿Qué vamos a leer hoy?</p>
    <div class="tarjetas">
      ${textos.map((t) => `
        <div class="tarjeta${cuentoDe(t) ? ' animada' : ''}" data-id="${escapar(t.id)}">
          ${t.propio ? `<span class="borrar" data-borrar="${escapar(t.id)}" aria-label="Eliminar">✕</span>` : ''}          <strong>${escapar(t.titulo)}</strong>
          <span class="vista-previa">${escapar(sinMarcas(t.parrafo).split(/\s+/).slice(0, 9).join(' '))}…</span>
          <span class="meta">${sinMarcas(t.parrafo).split(/\s+/).length} palabras${t.propio ? ' · agregado' : ''}</span>
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
    <p class="nota">Opcional: escribe <b>/</b> donde termina cada bloque con sentido para la etapa «Frases».
      Ej: <i>Había una vez / un gato gris / que vivía en el techo.</i> Si no pones ninguna, se calculan solos.</p>
  `, [
    { texto: 'Cancelar', accion: inicio },
    { texto: 'Guardar y leer', primario: true, accion: guardar },
  ]);

  const $titulo = document.getElementById('f-titulo');
  const $parrafo = document.getElementById('f-parrafo');
  const $contador = document.getElementById('f-contador');
  const contar = () => (sinMarcas($parrafo.value) ? sinMarcas($parrafo.value).split(/\s+/).length : 0);

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
  detenerCuento();
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
  detenerCuento();
  ocultarAviso();
  marcarPaso(1);
  practica = null;
  const animado = !!cuentoDe(texto);
  // En los cuentos animados, ir directo a la lectura o al cuento completo se habilita
  // solo cuando ya se leyó el cuento completo una vez.
  const yaLeido = animado && Almacen.leido(texto.id);
  pantalla('paso1', `
    <p class="titulo">${escapar(texto.titulo)}</p>
    <p class="indicacion">Mira el texto. Las palabras en <b>dorado</b> son las más difíciles.</p>
    ${htmlParrafo()}
  `, [
    { texto: '← Textos', accion: inicio },
    ...(animado ? [
      { texto: '▶ Escuchar el cuento', accion: verCuentoCompleto, deshabilitado: !yaLeido },
      { texto: 'Leer con animación', accion: etapaCuento, deshabilitado: !yaLeido },
    ] : []),
    { texto: '', primario: true, accion: animado ? empezarGuiado : etapa2 },
  ]);

  const boton = $acciones.querySelector('.primario');
  const pintar = () => {
    $vista.querySelectorAll('.p').forEach((el) => {
      el.classList.toggle('dificil', dificiles.has(palabras[el.dataset.i].norm));
    });
    if (animado) {
      boton.textContent = 'Empezar lectura';
      return;
    }
    const n = listaPractica().length;
    boton.textContent = n ? `Practicar ${n} palabras` : 'Leer por frases';
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
  if (juegosDe(texto).muro) return etapaMuro(); // cuentos animados: muro de palabras (js/cuento-app.js)
  const lista = listaPractica();
  if (!lista.length) return etapaFrases();
  marcarPaso(2);
  practica = { lista, ronda: 1, indice: 0, consumidas: 0, pausada: false, acerto: false, saltadas: new Set() };
  escucha.alReiniciar = () => { practica.consumidas = 0; };
  escucha.alOir = oirPractica;
  escucha.iniciar();
  mostrarPalabra();
}

function mostrarPalabra() {
  const { lista, ronda, indice } = practica;
  const p = lista[indice];
  practica.pausada = false;
  practica.acerto = false;
  practica.consumidas = escucha.cantidad; // ignora lo dicho antes de mostrar la palabra
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
  felicitar();
  setTimeout(siguientePalabra, 900);
}

function felicitar() {
  const msg = $vista.querySelector('.mensaje');
  msg.textContent = ['¡Muy bien!', '¡Excelente!', '¡Bien hecho!', '¡Perfecto!'][Math.floor(Math.random() * 4)];
  msg.classList.add('bien');
}

// Lee en voz alta el modelo sin que el micrófono lo cuente como lectura de la niña.
async function hablarSinContar(etapa, frase) {
  if (etapa.acerto) return;
  etapa.pausada = true;
  await decir(frase);
  setTimeout(() => {
    etapa.consumidas = escucha.cantidad;
    etapa.pausada = false;
  }, 700);
}

const escucharModelo = () => hablarSinContar(practica, practica.lista[practica.indice].limpia);

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
  // Sigue escuchando: la etapa Frases toma el micrófono sin pedir otro toque.
  practica.pausada = true;
  pantalla('centro', `
    <p class="grande">¡Palabras listas!</p>
    <p class="sub">Ahora vamos a leer por frases.</p>
  `);
  setTimeout(etapaFrases, 1800);
}

// ================= Etapa 3: frases que crecen por bloques =================
// Cada oración se arma de a un bloque con sentido: [A], [A B], [A B C]… hasta leerla completa.
let frases = null;

function etapaFrases() {
  if (juegosDe(texto).escalera) return etapaEscalera(); // cuentos animados: escalera (js/cuento-app.js)
  ocultarAviso();
  marcarPaso(3);
  const pasos = [];
  oracionesTexto.forEach((o, n) => o.bloques.forEach((_, k) => pasos.push({ oracion: n, bloques: k + 1 })));
  frases = { pasos, indice: 0, consumidas: 0, pausada: false, acerto: false };
  escucha.alReiniciar = () => {
    // si el micrófono se reanuda a mitad de la frase, se sigue desde donde iba
    frases.base = frases.estados;
    frases.desde = frases.pos;
    frases.consumidas = 0;
  };
  escucha.alOir = oirFrase;
  escucha.iniciar();
  mostrarPasoFrase();
}

function mostrarPasoFrase() {
  const paso = frases.pasos[frases.indice];
  const o = oracionesTexto[paso.oracion];
  const visibles = o.bloques.slice(0, paso.bloques);
  Object.assign(frases, {
    inicio: o.inicio,
    fin: visibles[visibles.length - 1][1],
    desde: o.inicio,
    pos: o.inicio,
    base: palabras.map(() => 'pendiente'),
    pausada: false,
    acerto: false,
    consumidas: escucha.cantidad, // ignora lo dicho en el paso anterior
  });
  frases.estados = frases.base;

  const html = visibles.map(([a, b], k) => {
    const nuevo = k === visibles.length - 1 && k > 0 ? ' nuevo' : '';
    const ps = palabras.slice(a, b).map((p) => `<span class="p" data-i="${p.i}">${escapar(p.bruta)}</span>`).join(' ');
    return `<span class="bloque${nuevo}">${ps}</span>`;
  }).join('<span class="corte">/</span>');
  const puntos = o.bloques.map((_, k) => `<span class="${k < paso.bloques - 1 ? 'hecho' : k === paso.bloques - 1 ? 'ahora' : ''}"></span>`).join('');
  const completa = paso.bloques === o.bloques.length;

  pantalla('lectura frases', `
    <p class="progreso">Oración ${paso.oracion + 1} de ${oracionesTexto.length}</p>
    <p class="parrafo">${html}</p>
    <div class="mensaje">${completa ? 'Ahora la oración completa' : 'Lee en voz alta'}</div>
    <div class="barra">${puntos}</div>
  `, [
    { texto: '🔊 Escuchar', accion: () => hablarSinContar(frases, palabras.slice(frases.inicio, frases.fin).map((p) => p.bruta).join(' ')) },
    { texto: 'Siguiente', accion: () => { if (!frases.acerto) siguientePasoFrase(); } },
  ]);
  pintarFrase();
}

function oirFrase(t) {
  if (frases.consumidas > t.length) frases.consumidas = t.length;
  if (frases.pausada) return;
  const r = alinear(esperadas.slice(0, frases.fin), t.slice(frases.consumidas), frases.desde, frases.base);
  frases.pos = r.pos;
  frases.estados = r.estados;
  pintarFrase();
  if (frases.pos < frases.fin) return;
  frases.pausada = true;
  frases.acerto = true;
  felicitar();
  setTimeout(siguientePasoFrase, 900);
}

function pintarFrase() {
  $vista.querySelectorAll('.p').forEach((el) => {
    const i = Number(el.dataset.i);
    el.className = `p ${frases.estados[i]}${i === frases.pos ? ' actual' : ''}`;
  });
}

function siguientePasoFrase() {
  frases.indice++;
  if (frases.indice < frases.pasos.length) return mostrarPasoFrase();
  antesDeLeer();
}

function antesDeLeer() {
  escucha.detener();
  marcarPaso(4);
  const animado = cuentoDe(texto);
  pantalla('centro', `
    <p class="grande">¡Muy bien!</p>
    <p class="sub">${animado
      ? 'Ahora lee el cuento, una escena a la vez. Al terminar cada oración, se dibuja la escena.'
      : 'Ahora lee el párrafo completo en voz alta.'}</p>
  `, [{ texto: 'Comenzar lectura', primario: true, accion: comenzarLectura }]);
}

// Los textos con cuento animado se leen por escenas; los demás, de corrido.
function comenzarLectura() {
  if (cuentoDe(texto)) etapaCuento();
  else etapaLectura();
}

// ================= Etapa 4: lectura completa =================
let lectura = null;

function etapaLectura() {
  ocultarAviso();
  marcarPaso(4);
  const vacio = palabras.map(() => 'pendiente');
  lectura = { base: vacio, estados: vacio, inicioSesion: 0, pos: 0, t0: null, t1: null, terminada: false };
  pantalla('lectura', `<p class="titulo">${escapar(texto.titulo)}</p>${htmlParrafo()}`,
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
  const actual = $vista.querySelector('.actual');
  if (actual) actual.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function terminarLectura() {
  if (lectura.terminada) return;
  lectura.terminada = true;
  lectura.t1 = performance.now();
  escucha.detener();
  const segundos = lectura.t0 ? Math.round((lectura.t1 - lectura.t0) / 1000) : 0;
  setTimeout(() => resultados({ estados: lectura.estados, segundos }), 800);
}

// La lectura por escenas de los cuentos animados está en js/cuento-app.js

function resultados({ estados, segundos }) {
  const leidas = estados.filter((e) => e === 'leida').length;
  const ppm = segundos ? Math.round(leidas / (segundos / 60)) : 0;
  const tiempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

  const repasar = [...new Set([
    ...palabras.filter((p, i) => estados[i] === 'saltada').map((p) => p.limpia),
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
    ...(cuentoDe(texto) ? [{ texto: '▶ Ver el cuento completo', accion: verCuentoCompleto }] : []),
    { texto: 'Leer otra vez', primario: true, accion: comenzarLectura },
  ]);
}

// ================= Arranque =================
if ('speechSynthesis' in window) speechSynthesis.getVoices(); // precarga las voces
inicio();
