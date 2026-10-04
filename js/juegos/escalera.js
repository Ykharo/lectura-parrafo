// Escalera de frases: cada repetición de la oración materializa un nivel de bloques achurados
// y el astronauta lo recorre al ritmo de la lectura. (Viene de maquetas/escalera.html.)
//
//   const e = Escalera.crear(svg, palabras, bloques)   palabras: textos; bloques: [[inicio, fin], …] relativos a la oración
//   e.paso(k)        empieza el nivel k (1…n): se leen los bloques 1…k
//   e.posicion(n)    palabras leídas en el nivel actual
//   e.destruir()
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const PILAR = 40;
  const IZQ = 104;
  const DER = 965;
  const HUECO = 6;
  const ARRIBA = 150;
  const ABAJO = 490;
  const ACHURADOS = [[45, 7], [-45, 7], [90, 6], [0, 8], [25, 9], [-65, 9]];
  let contador = 0;

  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

  // Poses del astronauta: origen = punto de apoyo, y negativa hacia arriba, mirando a la derecha.
  function pose(m, a, t) {
    if (m === 'sentado') {
      const k1 = Math.sin(t * 2.2) * 3;
      const k2 = Math.sin(t * 2.2 + 1.7) * 3;
      return {
        cabeza: [-1, -36], torso: [[0, -2], [-1, -25]],
        brazoA: [[-1, -21], [-6, -11], [-9, -2]], brazoB: [[-1, -21], [-4, -11], [-7, -2]],
        piernaA: [[0, -2], [10, -2], [11 + k1, 12]], piernaB: [[0, -2], [9, -1], [9 + k2, 12]],
      };
    }
    if (m === 'saltando') {
      return {
        cabeza: [1, -55], torso: [[0, -22], [1, -44]],
        brazoA: [[1, -40], [8, -46], [12, -53]], brazoB: [[1, -40], [-6, -46], [-10, -52]],
        piernaA: [[0, -22], [7, -14], [3, -5]], piernaB: [[0, -22], [4, -13], [-1, -6]],
      };
    }
    if (m === 'celebrando') {
      const h = Math.abs(Math.sin(t * 3.2));
      const f = (1 - h) * 5;
      return {
        dy: -h * 34,
        cabeza: [0, -55], torso: [[0, -22], [0, -44]],
        brazoA: [[0, -40], [9, -50], [13, -61]], brazoB: [[0, -40], [-9, -50], [-13, -61]],
        piernaA: [[0, -22], [4 + f, -11], [4, 0]], piernaB: [[0, -22], [-4 + f, -11], [-4, 0]],
      };
    }
    const s = m === 'caminando' ? Math.sin(a) : 0;
    return {
      dy: m === 'caminando' ? -Math.abs(Math.cos(a)) * 2 : Math.sin(t * 2) * 0.6,
      cabeza: [1, -55], torso: [[0, -22], [1, -44]],
      brazoA: [[1, -40], [-4 * s + 1, -31], [-7 * s + 2, -24]], brazoB: [[1, -40], [4 * s + 1, -31], [7 * s + 2, -24]],
      piernaA: [[0, -22], [5 * s + 2, -11], [9 * s, 0]], piernaB: [[0, -22], [-5 * s + 2, -11], [-9 * s, 0]],
    };
  }

  // Dibuja las partes del astronauta (casco con visor, mochila, botas)
  // dir = 1 mira a la derecha, -1 a la izquierda
  function dibujarPj(el, P, x, y, escala, dir = 1) {
    el.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + (P.dy || 0) * escala).toFixed(1)}) scale(${dir * escala} ${escala})`);
    const [cx, cy] = P.cabeza;
    el.cabeza.setAttribute('cx', cx);
    el.cabeza.setAttribute('cy', cy);
    el.visor.setAttribute('d', `M${cx + 2},${cy - 6} A6,6 0 0 1 ${cx + 2},${cy + 6}`);
    const [nx, ny] = P.torso[1];
    el.mochila.setAttribute('x', nx - 9);
    el.mochila.setAttribute('y', ny + 1);
    for (const parte of ['torso', 'brazoA', 'brazoB']) el[parte].setAttribute('points', pts(P[parte]));
    for (const parte of ['piernaA', 'piernaB']) {
      const pie = P[parte][P[parte].length - 1];
      el[parte].setAttribute('points', pts([...P[parte], [pie[0] + 4, pie[1]]]));
    }
  }

  function crearPj(contenedor) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'pj');
    g.innerHTML = '<polyline data-k="piernaB"/><polyline data-k="brazoB"/><rect data-k="mochila" width="7" height="14" rx="2"/>' +
      '<polyline data-k="torso"/><circle data-k="cabeza" r="10"/><path data-k="visor" class="visor"/><polyline data-k="piernaA"/><polyline data-k="brazoA"/>';
    contenedor.appendChild(g);
    const el = { g };
    g.querySelectorAll('[data-k]').forEach((n) => { el[n.dataset.k] = n; });
    return el;
  }

  function crear(svg, palabras, bloques) {
    const pre = `esc${++contador}-`;
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
    const topeFila = (r) => ARRIBA + (r - 1) * altoFila;
    const finPaso = (k) => bloques[k - 1][1];
    const finFila = (r) => derBloque(r - 1);

    // ---------- Construir la escena ----------
    const baseY = topeFila(n + 1);
    let defs = ACHURADOS.map(([ang, sep], j) =>
      `<pattern id="${pre}ach${j}" patternUnits="userSpaceOnUse" width="${sep}" height="${sep}" patternTransform="rotate(${ang})">` +
      `<line x1="0" y1="0" x2="0" y2="${sep}" stroke="#7d7d7d" stroke-width="1"/></pattern>`).join('');
    defs += `<pattern id="${pre}pilar" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">` +
      '<line x1="0" y1="0" x2="0" y2="5" stroke="#262626" stroke-width="1"/></pattern>';
    let filas = '';
    for (let r = 1; r <= n; r++) {
      defs += `<clipPath id="${pre}clip${r}"><rect id="${pre}clipr${r}" x="0" y="0" width="0" height="520"/></clipPath>`;
      let reales = '';
      let fantasmas = '';
      for (let j = 0; j < r; j++) {
        const x = izqBloque(j);
        const w = derBloque(j) - x;
        const y = topeFila(r) + 2;
        const h = altoFila - 4;
        reales += `<rect class="bloque-svg" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="url(#${pre}ach${j % ACHURADOS.length})"/>`;
        fantasmas += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/>`;
      }
      filas += `<g class="fantasma" id="${pre}fantasma${r}" opacity="0">${fantasmas}</g>`;
      filas += `<g class="fila" id="${pre}fila${r}" clip-path="url(#${pre}clip${r})">${reales}</g>`;
      filas += `<line class="frente" id="${pre}frenteG${r}" stroke-width="10" stroke-opacity="0" y1="${topeFila(r) + 3}" y2="${topeFila(r) + altoFila - 3}"/>`;
      filas += `<line class="frente" id="${pre}frente${r}" stroke-width="3" stroke-opacity="0" y1="${topeFila(r) + 3}" y2="${topeFila(r) + altoFila - 3}"/>`;
    }
    svg.innerHTML = `
      <defs>${defs}</defs>
      <line class="suelo" x1="20" x2="980" y1="${baseY + 1}" y2="${baseY + 1}"/>
      <rect class="pilar" x="${PILAR}" y="${topeFila(1) + 2}" width="${IZQ - HUECO - PILAR}" height="${baseY - topeFila(1) - 2}" rx="5" fill="url(#${pre}pilar)"/>
      ${filas}
      <g class="confeti"></g>`;
    const $ = (id) => svg.querySelector(`#${pre}${id}`);
    const $confeti = svg.querySelector('.confeti');
    const elPj = crearPj(svg);

    // ---------- Estado ----------
    let paso = 1;
    let pos = 0;
    let fase = 'leyendo';
    let revelado = IZQ;
    let confeti = [];
    let vivo = true;
    const pj = { x: (PILAR + IZQ - HUECO) / 2 - 8, y: topeFila(1), fila: 1, modo: 'parado', anim: 0, salto: null };

    function caminarHacia(meta, dt) {
      const d = meta - pj.x;
      if (d > 0.8) {
        const avance = Math.min(d, Math.min(260, Math.max(45, d * 3.2)) * dt);
        pj.x += avance;
        pj.anim += avance * 0.13;
        pj.modo = 'caminando';
      } else if (pj.modo === 'caminando' || pj.modo === 'saltando') {
        pj.modo = 'parado';
      }
    }

    function lanzarEstrellas() {
      const grises = ['#ffffff', '#c8c8c8', '#8a8a8a'];
      for (let i = 0; i < 34; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 40 + Math.random() * 120;
        confeti.push({
          x: pj.x, y: pj.y - 45, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 50,
          tam: 2.5 + Math.random() * 3.5, fase: Math.random() * 6.3, c: grises[i % 3], vida: 2.5 + Math.random() * 2,
        });
      }
    }

    function actualizarPj(dt) {
      if (pj.salto) {
        const s = pj.salto;
        s.t = Math.min(1, s.t + dt / 0.55);
        pj.x = s.x0 + (s.x1 - s.x0) * s.t;
        pj.y = s.y0 + (s.y1 - s.y0) * s.t - 46 * Math.sin(Math.PI * s.t);
        pj.modo = 'saltando';
        if (s.t >= 1) { pj.salto = null; pj.fila = s.fila; pj.modo = 'parado'; }
        return;
      }
      pj.y = topeFila(pj.fila);
      // sentado arriba, esperando que se materialice el nivel de abajo
      if (pj.fila < paso) {
        const borde = finFila(pj.fila) - 3;
        if (pj.fila === paso - 1 && revelado > finFila(paso - 1) + 24) {
          pj.salto = { x0: pj.x, y0: pj.y, x1: finFila(paso - 1) + 14, y1: topeFila(paso), t: 0, fila: paso };
          return;
        }
        caminarHacia(borde, dt);
        if (pj.x >= borde - 0.5) pj.modo = 'sentado';
        return;
      }
      // en el nivel actual: camina detrás del frente de lectura
      const completo = pos >= finPaso(paso);
      caminarHacia(completo ? finFila(paso) - (paso < n ? 3 : 34) : revelado - 14, dt);
      if (completo && pj.modo !== 'caminando') {
        if (paso < n) pj.modo = 'sentado';
        else if (fase === 'fin') {
          if (pj.modo !== 'celebrando') lanzarEstrellas();
          pj.modo = 'celebrando';
        }
      }
    }

    let ultimo = performance.now();
    function cuadro(ahora) {
      if (!vivo) return;
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      const t = ahora / 1000;

      const objetivo = posX(pos);
      if (objetivo < revelado) revelado = objetivo;
      else revelado += (objetivo - revelado) * Math.min(1, dt * 5);
      const creciendo = Math.min(1, (objetivo - revelado) / 12);

      actualizarPj(dt);

      for (let r = 1; r <= n; r++) {
        $(`clipr${r}`).setAttribute('width', r < paso || fase === 'fin' ? 1000 : r === paso ? revelado : 0);
        $(`fila${r}`).setAttribute('opacity', r === paso || fase === 'fin' ? 1 : 0.5);
        $(`fantasma${r}`).setAttribute('opacity', r === paso && fase === 'leyendo' ? 0.3 : 0);
        for (const id of ['frente', 'frenteG']) {
          const el = $(`${id}${r}`);
          const visible = r === paso && fase !== 'fin' && revelado > IZQ + 2;
          el.setAttribute('x1', revelado);
          el.setAttribute('x2', revelado);
          el.setAttribute('stroke-opacity', visible ? (id === 'frente' ? 0.35 + 0.6 * creciendo : 0.12 * creciendo) : 0);
        }
      }

      dibujarPj(elPj, pose(pj.modo, pj.anim, t), pj.x, pj.y, escala);

      if (confeti.length) {
        confeti = confeti.filter((c) => (c.vida -= dt) > 0);
        let html = '';
        for (const c of confeti) {
          c.vy += 35 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.vx *= 1 - dt * 0.6;
          c.vy *= 1 - dt * 0.6;
          const o = Math.min(1, c.vida) * (0.55 + 0.45 * Math.sin(t * 6 + c.fase));
          html += `<path d="M${c.x.toFixed(1)},${(c.y - c.tam).toFixed(1)}V${(c.y + c.tam).toFixed(1)}M${(c.x - c.tam).toFixed(1)},${c.y.toFixed(1)}H${(c.x + c.tam).toFixed(1)}" stroke="${c.c}" stroke-width="1.6" stroke-linecap="round" opacity="${o.toFixed(2)}"/>`;
        }
        $confeti.innerHTML = html;
      }
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);

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

  global.Escalera = { crear, dibujarPj, crearPj, pose };
})(window);
