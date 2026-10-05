// Escalera de piedras («El león y el ratón», stop motion de papel): cada bloque leído deja caer
// una piedra de papel en su nivel, y el ratón baja la escalera al ritmo de la lectura.
// Misma interfaz y geometría que Escalera (js/juegos/escalera.js). Necesita js/papel.js y js/cuentos/leon-raton.js.
//
//   const e = EscaleraPiedras.crear(svg, palabras, bloques)
//   e.paso(k)   e.posicion(n)   e.destruir()
(function (global) {
  'use strict';

  const PILAR = 40;
  const IZQ = 104;
  const DER = 965;
  const HUECO = 6;
  const ARRIBA = 150;
  const ABAJO = 490;
  const PIEDRAS = ['#B9B2A6', '#A79F92', '#C6BFB2', '#9C9488', '#B0A89B', '#BDB5A8'];

  function crear(svg, palabras, bloques) {
    const { raton, corazon, colores: C } = global.PapelLeon;
    const n = bloques.length;
    const acum = [0];
    for (const p of palabras) acum.push(acum[acum.length - 1] + p.length + 1);
    const total = acum[acum.length - 1];
    const util = DER - IZQ - HUECO * (n - 1);
    const bloqueDe = (i) => bloques.findIndex(([a, b]) => i > a && i <= b);
    const altoFila = Math.min(78, (ABAJO - ARRIBA) / n);
    const escala = Math.max(0.75, Math.min(1, altoFila / 78));
    const posX = (i) => (i === 0 ? IZQ : IZQ + (util * acum[i]) / total + HUECO * bloqueDe(i));
    const izqBloque = (j) => IZQ + (util * acum[bloques[j][0]]) / total + HUECO * j;
    const derBloque = (j) => IZQ + (util * acum[bloques[j][1]]) / total + HUECO * j;
    // la escalera se apoya en el suelo: si hay pocos niveles, baja
    const arriba = Math.max(ARRIBA, ABAJO - n * altoFila);
    const topeFila = (r) => arriba + (r - 1) * altoFila;
    const finPaso = (k) => bloques[k - 1][1];
    const finFila = (r) => derBloque(r - 1);
    const baseY = topeFila(n + 1);

    let paso = 1, pos = 0, fase = 'leyendo', revelado = IZQ, vivo = true;

    Papel.escena(svg, (e) => {
      // ---------- Paisaje ----------
      const fondo = e.actor(e.camara, { temblor: 0 });
      fondo.g.innerHTML = `<rect x="-20" y="-20" width="1040" height="560" fill="${C.CIELO}"/><rect x="-20" y="-20" width="1040" height="560" fill="url(#${e.id('papel')})"/>`;
      e.actor(e.camara, { x: 905, y: 70, temblor: 0.5 }, e.papel(e.elipse(0, 0, 34, 34, 28, 1), '#F4C24A'));
      [[200, 60, 0.8], [560, 90, 0.65]].forEach(([x, y, s]) => {
        const nb = e.actor(e.camara, { x, y, esc: s, temblor: 0.4 }, e.papel(e.contorno([
          [-40, 8], [-46, -4], [-30, -14], [-18, -26], [2, -28], [16, -18], [34, -22], [48, -8], [42, 8],
        ], 1.5), '#FBF6EC', { filo: 2 }));
        e.alCuadro(() => { nb.x += 0.3; if (nb.x > 1080) nb.x = -80; });
      });
      e.actor(e.camara, { temblor: 0.3 },
        e.papel(e.franja(baseY - 150, 0, 2, 16), '#C5D59A', { sombra: false }) +
        e.papel(e.franja(baseY - 90, 0, 3, 10), '#A7BF77') +
        e.papel(e.franja(baseY + 2, 0, 4, 3), '#D7B56E'));

      // pilar de roca a la izquierda, donde empieza el ratón
      const py = topeFila(1) + 2;
      e.actor(e.camara, { temblor: 0.4 },
        e.papel(e.recto([[PILAR + 2, py], [IZQ - HUECO - 2, py + 2], [IZQ - HUECO, baseY + 4], [PILAR, baseY + 4]], 1.2), '#8F877B') +
        `<path d="M${PILAR + 8},${py + 60} l20,6 l14,-4 M${PILAR + 12},${py + 150} l24,-5" stroke="#6E675D" stroke-width="1.6" fill="none" opacity=".6"/>` +
        e.papel(e.franja(py - 2, 6, 4, 2, { puntas: true, desde: PILAR - 2, hasta: IZQ - HUECO + 2, fondo: py + 7 }), C.VERDE2, { filo: 1.5 }));

      // ---------- Piedras: una por bloque y nivel ----------
      const forma = (x, y, w, h) => {
        const c = Math.min(10, h / 4, w / 4);
        return e.contorno([
          [x + c, y], [x + w * 0.5, y - 1.5], [x + w - c, y], [x + w, y + c], [x + w + 1, y + h / 2],
          [x + w, y + h - c], [x + w - c, y + h], [x + w * 0.5, y + h + 1], [x + c, y + h], [x, y + h - c], [x - 1, y + h / 2], [x, y + c],
        ], 1.2);
      };
      const filas = [];
      for (let r = 1; r <= n; r++) {
        const fila = { piedras: [], fantasmas: [] };
        for (let j = 0; j < r; j++) {
          const x = izqBloque(j), w = derBloque(j) - x, y = topeFila(r) + 2, h = altoFila - 4;
          const d = forma(x, y, w, h);
          fila.fantasmas.push(e.actor(e.camara, { op: 0, temblor: 0.3 },
            `<path d="${d}" fill="#FFFFFF" fill-opacity=".18" stroke="${C.CREMA}" stroke-width="2.2" stroke-dasharray="8 6"/>`));
          let manchas = '';
          for (let k = 0; k < 3; k++) {
            manchas += `<ellipse cx="${(x + e.azar(0.15, 0.85) * w).toFixed(1)}" cy="${(y + e.azar(0.3, 0.75) * h).toFixed(1)}" rx="${e.azar(3, 7).toFixed(1)}" ry="${e.azar(2, 4).toFixed(1)}" fill="#6E675D" opacity=".22"/>`;
          }
          const musgo = (j + r) % 3 === 0
            ? e.papel(e.franja(y - 1, 5, Math.max(2, Math.round(w / 40)), 1.5, { puntas: true, desde: x + w * 0.15, hasta: x + w * 0.6, fondo: y + 5 }), C.VERDE, { filo: 1.2, sombra: false })
            : '';
          const piedra = e.actor(e.camara, { op: 0, temblor: 0.6 }, e.papel(d, PIEDRAS[(j + r) % PIEDRAS.length], { filo: 2.5 }) + manchas + musgo);
          fila.piedras.push({ a: piedra, cayo: false, x: x + w / 2, y: y + h });
        }
        filas.push(fila);
      }
      const fila = (r) => filas[r - 1];

      function caer(r, j) {
        const p = fila(r).piedras[j];
        if (p.cayo) return;
        p.cayo = true;
        p.a.y = -70;
        p.a.op = 1;
        e.anim(fila(r).fantasmas[j], { op: 0 }, 150);
        e.anim(p.a, { y: 0 }, 420, 'rebota');
        e.espera(160).then(() => polvillo(p.x, p.y));
      }
      function polvillo(x, y) {
        for (let k = 0; k < 4; k++) {
          const q = e.actor(e.camara, { x, y, esc: e.azar(0.5, 0.9), temblor: 0.6 }, e.papel(e.elipse(0, 0, 8, 6, 10, 0.5), '#EADBC0', { sombra: false, filo: 1.2 }));
          e.anim(q, { x: x + e.azar(-45, 45), y: y - e.azar(5, 25), sx: 1.4, sy: 1.4 }, 500, 'sale');
          e.espera(220).then(() => e.anim(q, { op: 0 }, 300));
        }
      }

      e.actor(e.camara, { temblor: 0.5 }, e.papel(e.franja(baseY + 14, 12, 30, 3, { puntas: true }), C.VERDE));

      // ---------- Ratón ----------
      const rat = raton(e, e.camara, { x: (PILAR + IZQ - HUECO) / 2 - 6, suelo: topeFila(1), esc: 1.25 * escala });
      const pj = { x: rat.raiz.x, y: topeFila(1), fila: 1, modo: 'parado', salto: null };
      let celebrando = false;

      function caminarHacia(meta, dt) {
        const d = meta - pj.x;
        if (d > 0.8) {
          pj.x += Math.min(d, Math.min(260, Math.max(45, d * 3.2)) * dt);
          pj.modo = 'caminando';
        } else if (pj.modo === 'caminando') {
          pj.modo = 'parado';
        }
      }

      function celebrar() {
        celebrando = true;
        rat.cara('feliz');
        rat.brazos('arriba');
        corazon(e, pj.x, pj.y - 95 * escala, 1.2);
        const tonos = ['#E36F5A', '#F2A7C3', '#9DB7E8', '#F4C24A', '#C79BE0', C.VERDE3];
        for (let k = 0; k < 30; k++) {
          const x = e.azar(100, 960);
          const c = e.actor(e.camara, { x, y: -20, rot: e.azar(0, 360), temblor: 0.8 },
            e.papel(e.recto([[-6, -4], [6, -4], [6, 4], [-6, 4]], 0.8), tonos[k % tonos.length], { filo: 1, sombra: false }));
          const ms = e.azar(1800, 3200);
          e.espera(e.azar(0, 600)).then(() => e.tween(ms, (t) => { c.y = -20 + t * 560; c.x = x + Math.sin(t * 8 + k) * 18; c.rot += 6; }));
        }
      }

      let ultimo = 0, saltito = 0;
      e.alCuadro((t) => {
        if (!vivo) return false;
        const dt = ultimo ? Math.min(0.2, t - ultimo) : 1 / 12;
        ultimo = t;

        // frente de lectura y piedras que caen al completar cada bloque
        const objetivo = posX(pos);
        if (objetivo < revelado) revelado = objetivo;
        else revelado += (objetivo - revelado) * Math.min(1, dt * 5);
        bloques.slice(0, paso).forEach(([, b], j) => { if (pos >= b) caer(paso, j); });

        // filas: anteriores un poco apagadas; fantasmas solo en el nivel actual
        filas.forEach((f, k) => {
          const r = k + 1;
          f.piedras.forEach((p) => {
            if (!p.cayo) return;
            const apagada = r !== paso && fase !== 'fin';
            if (apagada !== p.apagada) { p.apagada = apagada; if (apagada) p.a.g.setAttribute('filter', `url(#${e.id('lejos')})`); else p.a.g.removeAttribute('filter'); }
          });
          f.fantasmas.forEach((g, j) => { if (!f.piedras[j].cayo) g.op = r === paso && fase === 'leyendo' ? 1 : 0; });
        });

        // el ratón
        if (pj.salto) {
          const s = pj.salto;
          s.t = Math.min(1, s.t + dt / 0.55);
          pj.x = s.x0 + (s.x1 - s.x0) * s.t;
          pj.y = s.y0 + (s.y1 - s.y0) * s.t - 46 * Math.sin(Math.PI * s.t);
          pj.modo = 'saltando';
          if (s.t >= 1) { pj.salto = null; pj.fila = s.fila; pj.modo = 'parado'; }
        } else {
          pj.y = topeFila(pj.fila);
          if (pj.fila < paso) {
            // espera en el borde a que aparezca el nivel de abajo
            const borde = finFila(pj.fila) - 12 * escala;
            if (pj.fila === paso - 1 && revelado > finFila(paso - 1) + 24) {
              pj.salto = { x0: pj.x, y0: pj.y, x1: finFila(paso - 1) + 20, y1: topeFila(paso), t: 0, fila: paso };
            } else {
              caminarHacia(borde, dt);
            }
          } else {
            const completo = pos >= finPaso(paso);
            caminarHacia(completo ? finFila(paso) - (paso < n ? 12 * escala : 40) : revelado - 18, dt);
            if (completo && fase === 'fin' && pj.modo !== 'caminando' && !celebrando) celebrar();
          }
        }
        rat.correr(pj.modo === 'caminando');
        if (celebrando) saltito++;
        rat.raiz.x = pj.x;
        rat.raiz.y = pj.y - (celebrando ? Math.abs(Math.sin(saltito * 0.7)) * 22 : 0);
        rat.raiz.rot = pj.modo === 'saltando' ? 12 : 0;
      });
      return {};
    }, { semilla: 9 });

    return {
      paso(k) {
        paso = k;
        pos = 0;
        fase = 'leyendo';
      },
      posicion(m) {
        if (fase !== 'leyendo') return;
        const fin = finPaso(paso);
        if (m > pos) pos = Math.min(m, fin);
        if (pos >= fin) fase = paso < n ? 'pausa' : 'fin';
      },
      destruir() { vivo = false; },
    };
  }

  global.EscaleraPiedras = { crear };
})(window);
