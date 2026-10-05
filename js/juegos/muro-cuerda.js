// Cuerda de palabras («El león y el ratón», stop motion de papel): la palabra cuelga en
// etiquetas-sílaba de una cuerda. Cada lectura es un mordisco del ratón; al tercero la cuerda se
// corta y las sílabas se juntan en la palabra, que baja hacia su oración.
// Misma interfaz que Muro (js/juegos/muro.js). Necesita js/papel.js y js/cuentos/leon-raton.js.
//
//   const m = MuroCuerda.crear(svg, { alListo(golpes), alCorrer(), alRomper(), alTerminar() })
//   m.palabra(silabas, { texto, dioses })   dioses: última palabra de la escena (el león celebra)
//   m.leer()
//   m.destruir()
(function (global) {
  'use strict';

  const GOLPES = 3;
  const SUELO = 228;
  const CUERDA_Y = 80;
  const POSTE_IZQ = 250;
  const POSTE_DER = 770;
  const CORTE = 662;            // donde muerde el ratón
  const RATON = { x: 735, y: CUERDA_Y, esc: 1.15 };
  const ARRIBA_POSTE = { x: 772, y: 72 };
  const PAPELES = ['#FFF4D6', '#FCE1E4', '#DDEFF7', '#FBEFB9', '#E6F2D7'];
  const TINTA = '#3a2410';

  function crear(svg, { alListo = () => {}, alCorrer = () => {}, alRomper = () => {}, alTerminar = () => {} } = {}) {
    const { leon, raton, corazon, colores: C } = global.PapelLeon;
    let api = null;

    Papel.escena(svg, (e) => {
      // ---------- Paisaje (franja baja de 1000×260) ----------
      const fondo = e.actor(e.camara, { temblor: 0 });
      fondo.g.innerHTML = `<rect x="-20" y="-20" width="1040" height="300" fill="${C.CIELO}"/><rect x="-20" y="-20" width="1040" height="300" fill="url(#${e.id('papel')})"/>`;
      const nube = (x, y, s) => {
        const n = e.actor(e.camara, { x, y, esc: s, temblor: 0.4 }, e.papel(e.contorno([
          [-40, 8], [-46, -4], [-30, -14], [-18, -26], [2, -28], [16, -18], [34, -22], [48, -8], [42, 8],
        ], 1.5), '#FBF6EC', { filo: 2 }));
        e.alCuadro(() => { n.x += 0.3; if (n.x > 1080) n.x = -80; });
      };
      nube(120, 40, 0.7); nube(560, 30, 0.6);
      e.actor(e.camara, { temblor: 0.3 },
        e.papel(e.franja(150, 0, 3, 10, { fondo: 300 }), '#C5D59A', { sombra: false }) +
        e.papel(e.franja(178, 0, 4, 7, { fondo: 300 }), '#A7BF77') +
        e.papel(e.franja(208, 0, 5, 3, { fondo: 300 }), '#D7B56E'));

      // ---------- Postes de madera ----------
      const poste = (x) => e.actor(e.camara, { temblor: 0.4 },
        e.papel(e.recto([[x - 11, 64], [x + 11, 64], [x + 12, SUELO + 6], [x - 12, SUELO + 6]], 0.8), '#8B5E36') +
        e.papel(e.elipse(x, 62, 13, 6, 14, 0.4), '#B07C4C', { filo: 2 }) +
        `<path d="M${x - 5},90 v40 M${x + 4},120 v50" stroke="#6B4423" stroke-width="1.5" opacity=".5"/>`);
      poste(POSTE_IZQ);
      poste(POSTE_DER);

      // ---------- El león mira desde la izquierda ----------
      const leo = leon(e, e.camara, { x: 105, suelo: SUELO, esc: 0.36, pose: 'acostado', cara: 'amable' });
      leo.respirar(true);

      const zona = e.actor(e.camara, { temblor: 0 }); // aquí va la cuerda de cada palabra
      const rat = raton(e, e.camara, { x: RATON.x, suelo: RATON.y, esc: RATON.esc, dir: -1 });
      e.actor(e.camara, { temblor: 0.5 }, e.papel(e.franja(238, 12, 30, 3, { puntas: true, fondo: 300 }), C.VERDE));

      // marcador de mordiscos: tres quesitos
      const quesos = [0, 1, 2].map((k) => e.actor(e.camara, { x: 900 + k * 30, y: 28, temblor: 0.5 }));
      const marcar = (n) => quesos.forEach((q, k) => {
        q.g.innerHTML = k < n
          ? e.papel(e.recto([[-11, 8], [11, 8], [11, -2], [-11, -9]], 0.5), '#F4C24A', { filo: 2 }) + '<circle cx="-3" cy="2" r="2" fill="#D9A21F"/><circle cx="5" cy="-1" r="1.5" fill="#D9A21F"/>'
          : `<path d="M-11,8 H11 V-2 L-11,-9 Z" fill="none" stroke="${C.CREMA}" stroke-width="2" stroke-dasharray="4 3" opacity=".9"/>`;
      });

      // ---------- Cuerda ----------
      const cuerda = (x0, x1) => {
        const d = `M${x0.toFixed(1)},0 Q${((x0 + x1) / 2).toFixed(1)},${(Math.abs(x1 - x0) / 60).toFixed(1)} ${x1.toFixed(1)},0`;
        return `<path d="${d}" stroke="#3a2410" stroke-width="7" opacity=".18" fill="none" transform="translate(2 3)"/>` +
          `<path d="${d}" stroke="#9C6B3E" stroke-width="6.5" fill="none" stroke-linecap="round"/>` +
          `<path d="${d}" stroke="#C8975F" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
          `<path d="${d}" stroke="#7A532E" stroke-width="1.3" fill="none" stroke-dasharray="3 4" opacity=".7"/>`;
      };
      const hilachas = (n, gap) => {
        let s = '';
        for (let k = 0; k < n; k++) {
          const y = -2 + k * 2;
          s += `<path d="M${-gap - 2},${y} q${gap + 2},${2 + k} ${gap * 2 + 4},0" stroke="${k % 2 ? '#C8975F' : '#9C6B3E'}" stroke-width="1.3" fill="none"/>`;
        }
        return s;
      };

      let vivo = true, gen = 0, golpes = 0, estado = 'listo', pendiente = false;
      let p = null; // piezas de la palabra actual

      function armar(silabas, opciones) {
        if (p) p.capa.g.remove();
        const capa = e.actor(zona, { temblor: 0 });
        // cuerda izquierda (gira desde el poste al cortarse) y derecha
        const izq = e.actor(capa, { x: POSTE_IZQ, y: CUERDA_Y, temblor: 0.3 });
        const tramoIzq = e.actor(izq, { temblor: 0 });
        const der = e.actor(capa, { x: POSTE_DER, y: CUERDA_Y, temblor: 0.3 });
        const tramoDer = e.actor(der, { temblor: 0 });
        const fleco = e.actor(capa, { x: CORTE, y: CUERDA_Y, temblor: 0.5 });
        // nudos en los postes
        e.actor(capa, { temblor: 0.3 }, e.papel(e.elipse(POSTE_IZQ + 4, CUERDA_Y, 7, 6, 10, 0.4), '#9C6B3E', { filo: 1.5 }) +
          e.papel(e.elipse(POSTE_DER - 4, CUERDA_Y, 7, 6, 10, 0.4), '#9C6B3E', { filo: 1.5 }));
        // etiquetas: una por sílaba, colgando de la cuerda
        const anchos = silabas.map((s) => 26 + s.length * 16);
        const HUECO = 8;
        const total = anchos.reduce((a, b) => a + b, 0) + HUECO * (silabas.length - 1);
        const esc = Math.min(1, 390 / total);
        let x = 480 - (total * esc) / 2;
        const etiquetas = silabas.map((s, k) => {
          const w = anchos[k];
          const cx = x + (w * esc) / 2;
          x += (w + HUECO) * esc;
          const t = e.actor(izq, { x: cx - POSTE_IZQ, y: 0, esc, temblor: 0.6 },
            `<path d="M0,0 V13" stroke="${TINTA}" stroke-width="1.4"/>` +
            e.papel(e.recto([[-w / 2, 12], [w / 2, 12], [w / 2, 60], [-w / 2, 60]], 1.2), PAPELES[k % PAPELES.length], { filo: 2.5 }) +
            `<circle cx="0" cy="18" r="2.4" fill="${TINTA}" opacity=".6"/>` +
            `<text class="silaba-papel" x="0" y="47" text-anchor="middle" font-family="Andika, 'Trebuchet MS', sans-serif" font-weight="700" font-size="28" fill="${TINTA}"></text>`);
          t.g.querySelector('text').textContent = s;
          return { a: t, w, cx, s };
        });
        p = { capa, izq, der, tramoIzq, tramoDer, fleco, etiquetas, esc, opciones, texto: opciones.texto || silabas.join('') };
        dibujarCuerda(0);
      }

      function dibujarCuerda(n) {
        const gap = [0, 2, 5][n] || 0;
        p.tramoIzq.g.innerHTML = cuerda(0, CORTE - POSTE_IZQ - gap);
        p.tramoDer.g.innerHTML = cuerda(CORTE + gap - POSTE_DER, 0);
        p.fleco.g.innerHTML = n ? hilachas(n === 1 ? 3 : 1, gap) : '';
      }

      function listo() {
        rat.cara('normal');
        rat.brazos('abajo');
        svg.classList.add('esperando');
        alListo(golpes);
        if (pendiente) {
          // una lectura llegó mientras mordía: el próximo mordisco va enseguida
          pendiente = false;
          estado = 'pausa';
          const g = gen;
          setTimeout(() => { if (g === gen && vivo) morder(); }, 250);
        } else {
          estado = 'listo';
        }
      }

      // trocitos de cuerda que salen volando del mordisco
      function fibras(n, fuerza = 1) {
        for (let k = 0; k < n; k++) {
          const f = e.actor(e.camara, { x: CORTE, y: CUERDA_Y, rot: e.azar(0, 180), temblor: 0.6 },
            `<path d="M-5,0 H5" stroke="${k % 2 ? '#C8975F' : '#9C6B3E'}" stroke-width="3" stroke-linecap="round"/>`);
          const dx = e.azar(-50, 40) * fuerza;
          e.tween(700, (t) => { f.x = CORTE + dx * t; f.y = CUERDA_Y - 30 * fuerza * Math.sin(Math.PI * t * 0.6) + t * t * 140; f.rot += 9; });
          e.espera(500).then(() => e.anim(f, { op: 0 }, 200));
        }
      }

      async function morder() {
        if (golpes >= GOLPES) return;
        const g = gen;
        estado = 'mordiendo';
        svg.classList.remove('esperando');
        alCorrer();
        rat.cara('royendo');
        rat.brazos('sostiene');
        // da un paso hacia el corte y se inclina a morder
        await e.anim(rat.raiz, { x: RATON.x - 38, rot: -30 }, 180, 'sale');
        rat.roer(true);
        for (let k = 0; k < 3; k++) {
          await e.anim(rat.raiz, { rot: -36 }, 90);
          fibras(2);
          await e.anim(rat.raiz, { rot: -28 }, 90);
        }
        rat.roer(false);
        if (g !== gen || !vivo) return;
        golpes++;
        marcar(golpes);
        if (golpes < GOLPES) {
          dibujarCuerda(golpes);
          p.izq.rot = 1.2 * golpes; // la cuerda cede un poco
          await e.anim(rat.raiz, { x: RATON.x, rot: 0 }, 200, 'sale');
          if (g !== gen || !vivo) return;
          listo();
        } else {
          cortar(g);
        }
      }

      async function cortar(g) {
        estado = 'rota';
        p.fleco.g.innerHTML = '';
        fibras(10, 1.4);
        // la cuerda se suelta: el tramo largo cae girando desde su poste, el corto queda colgando
        e.anim(p.izq, { rot: 32 }, 650, 'rebota');
        e.anim(p.der, { rot: -75 }, 500, 'rebota');
        // el ratón salta a lo alto del poste y celebra
        const x0 = rat.raiz.x, y0 = rat.raiz.y;
        rat.raiz.rot = 0;
        rat.cara('feliz');
        e.tween(380, (t) => { rat.raiz.x = e.lerp(x0, ARRIBA_POSTE.x, t); rat.raiz.y = e.lerp(y0, ARRIBA_POSTE.y, t) - 40 * Math.sin(Math.PI * t); });
        await e.espera(700);
        if (g !== gen || !vivo) return;
        rat.brazos('arriba');
        saltitos(g);
        // las sílabas se sueltan de la cuerda y se juntan en la palabra
        const th = (p.izq.rot * Math.PI) / 180;
        const total = p.etiquetas.reduce((a, t) => a + t.w, 0) * p.esc;
        let x = 480 - total / 2;
        p.etiquetas.forEach((t, k) => {
          const lx = t.a.x;
          const wx = POSTE_IZQ + lx * Math.cos(th), wy = CUERDA_Y + lx * Math.sin(th);
          t.a.g.style.display = 'none';
          const w = t.w;
          const suelta = e.actor(p.capa, { x: wx, y: wy, esc: p.esc, rot: p.izq.rot, temblor: 0.8 },
            e.papel(e.recto([[-w / 2, 12], [w / 2, 12], [w / 2, 60], [-w / 2, 60]], 1.2), PAPELES[k % PAPELES.length], { filo: 2.5 }) +
            `<text x="0" y="47" text-anchor="middle" font-family="Andika, 'Trebuchet MS', sans-serif" font-weight="700" font-size="28" fill="${TINTA}"></text>`);
          suelta.g.querySelector('text').textContent = t.s;
          const cx = x + (w * p.esc) / 2;
          x += w * p.esc;
          t.suelta = suelta;
          e.espera(k * 70).then(() => e.anim(suelta, { x: cx, y: 70, rot: 0 }, 650, 'sale'));
        });
        e.anim(p.izq, { op: 0 }, 500);
        await e.espera(900);
        if (g !== gen || !vivo) return;
        p.etiquetas.forEach((t) => e.anim(t.suelta, { sy: p.esc * 1.12, sx: p.esc * 1.12 }, 200, 'sale').then(() => e.anim(t.suelta, { sx: p.esc, sy: p.esc }, 200)));
        if (p.opciones.dioses) {
          // última palabra de la escena: el león se ríe y aparece un corazón
          leo.cara('riendo');
          corazon(e, 175, 95, 0.9);
        }
        await e.espera(1000);
        if (g !== gen || !vivo) return;
        alRomper();
        p.etiquetas.forEach((t, k) => e.espera(k * 40).then(() => e.anim(t.suelta, { y: 300, op: 0 }, 700, 'entra')));
        await e.espera(1700);
        if (g !== gen || !vivo) return;
        alTerminar();
      }

      async function saltitos(g) {
        for (let k = 0; k < 3 && g === gen && vivo; k++) {
          await e.anim(rat.raiz, { y: ARRIBA_POSTE.y - 12 }, 180, 'sale');
          await e.anim(rat.raiz, { y: ARRIBA_POSTE.y }, 180, 'entra');
        }
      }

      // la etiqueta y el poste vuelven a su lugar para una palabra nueva
      api = {
        palabra(silabas, opciones = {}) {
          gen++;
          golpes = 0;
          pendiente = false;
          marcar(0);
          armar(silabas, opciones);
          leo.cara('amable');
          // las etiquetas bajan desde arriba, como si las colgaran a mano
          p.izq.y = -200;
          e.anim(p.izq, { y: CUERDA_Y }, 450, 'rebota');
          p.der.y = -200;
          e.anim(p.der, { y: CUERDA_Y }, 450, 'rebota');
          p.fleco.y = -200;
          e.anim(p.fleco, { y: CUERDA_Y }, 450, 'rebota');
          rat.brazos('abajo');
          rat.cara('normal');
          if (rat.raiz.x !== RATON.x || rat.raiz.y !== RATON.y) {
            const x0 = rat.raiz.x, y0 = rat.raiz.y;
            e.tween(300, (t) => { rat.raiz.x = e.lerp(x0, RATON.x, t); rat.raiz.y = e.lerp(y0, RATON.y, t) - 25 * Math.sin(Math.PI * t); });
          }
          rat.raiz.rot = 0;
          listo();
        },
        leer() {
          if (golpes >= GOLPES) return;
          if (estado === 'listo') morder();
          else if (estado !== 'rota') pendiente = true;
        },
        destruir() { vivo = false; },
      };
      return {};
    }, { semilla: 7 });

    return api;
  }

  global.MuroCuerda = { crear };
})(window);
