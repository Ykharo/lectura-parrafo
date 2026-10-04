// Escalera griega: la misma mecánica de js/juegos/escalera.js (cada repetición de la oración
// materializa un nivel), con bloques de piedra sobre terracota y tres de los hoplitas en
// formación (tres de ellos): siguen el frente de lectura, se sientan en el borde, saltan uno tras otro y
// celebran al final. Necesita js/juegos/griego-base.js.
//
//   const e = EscaleraGriega.crear(svg, palabras, bloques)   (misma firma que Escalera)
//   e.paso(k) · e.posicion(n) · e.destruir()
(function (global) {
  'use strict';

  const { B, C, STONES, STAR, el, rand, f1, fondo, CHARS, buildWarrior, updateWarrior, MARCH } = global.Griego;

  const ANCHO = 1000;
  const ALTO = 520;
  const PILAR = 10;
  const IZQ = 122;
  const DER = 975;
  const HUECO = 6;
  const ARRIBA = 165;
  const ABAJO = 482;
  const SEPARACION = 20;   // distancia entre hoplitas en la formación
  const FORMACION = [0, 2, 4]; // Leandro (el capitán), Pipo (el pequeño) y Dimas (el grandote)
  const ALTURA_HOPLITA = 150; // alto aproximado de un hoplita a escala 1 (con casco)
  let contador = 0;

  function crear(svg, palabras, bloques) {
    const pre = `eg${++contador}-`;
    const n = bloques.length;
    const acum = [0];
    for (const p of palabras) acum.push(acum[acum.length - 1] + p.length + 1);
    const total = acum[acum.length - 1];
    const util = DER - IZQ - HUECO * (n - 1);
    const bloqueDe = (i) => bloques.findIndex(([a, b]) => i > a && i <= b);
    const altoFila = Math.min(78, (ABAJO - ARRIBA) / n);
    const escala = Math.min(0.68, (altoFila * 1.3) / ALTURA_HOPLITA);
    const posX = (i) => (i === 0 ? IZQ : IZQ + (util * acum[i]) / total + HUECO * bloqueDe(i));
    const izqBloque = (j) => IZQ + (util * acum[bloques[j][0]]) / total + HUECO * j;
    const derBloque = (j) => IZQ + (util * acum[bloques[j][1]]) / total + HUECO * j;
    const topeFila = (r) => ARRIBA + (r - 1) * altoFila;
    const finPaso = (k) => bloques[k - 1][1];
    const finFila = (r) => derBloque(r - 1);

    // ---------- Escena ----------
    const baseY = topeFila(n + 1);
    let filas = '';
    let defs = '';
    for (let r = 1; r <= n; r++) {
      defs += `<clipPath id="${pre}clip${r}"><rect id="${pre}clipr${r}" x="0" y="0" width="0" height="${ALTO}"/></clipPath>`;
      let reales = '';
      let fantasmas = '';
      for (let j = 0; j < r; j++) {
        const x = izqBloque(j);
        const w = derBloque(j) - x;
        const y = topeFila(r) + 2;
        const h = altoFila - 4;
        // piedra con una franja incisa, como en la cerámica
        reales += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="3" fill="${STONES[j % STONES.length]}" stroke="${B}" stroke-width="2.5"/>` +
          `<path d="M${f1(x + 6)},${f1(y + h * 0.3)} H${f1(x + w - 6)}" stroke="${B}" stroke-width="1.4" opacity=".55"/>`;
        fantasmas += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="3"/>`;
      }
      filas += `<g class="fantasma" id="${pre}fantasma${r}" opacity="0">${fantasmas}</g>`;
      filas += `<g class="fila" id="${pre}fila${r}" clip-path="url(#${pre}clip${r})">${reales}</g>`;
      filas += `<line class="frente" id="${pre}frente${r}" stroke="${C}" stroke-width="4" stroke-linecap="round" stroke-opacity="0" y1="${f1(topeFila(r) + 4)}" y2="${f1(topeFila(r) + altoFila - 4)}"/>`;
    }
    // columna dórica de partida
    const colX = PILAR, colW = IZQ - HUECO - PILAR, colY = topeFila(1);
    const estrias = [0.25, 0.42, 0.58, 0.75].map((k) => `<path d="M${f1(colX + colW * k)},${f1(colY + 18)} V${f1(baseY - 8)}" stroke="${C}" stroke-width="1.3"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
    svg.innerHTML = `
      ${fondo(pre, ANCHO, ALTO)}
      <defs>${defs}</defs>
      <rect x="${f1(colX + 8)}" y="${f1(colY + 14)}" width="${f1(colW - 16)}" height="${f1(baseY - colY - 14)}" fill="${B}"/>
      <rect x="${f1(colX)}" y="${f1(colY)}" width="${f1(colW)}" height="8" fill="${B}"/>
      <path d="M${f1(colX + 4)},${f1(colY + 8)} H${f1(colX + colW - 4)} L${f1(colX + colW - 10)},${f1(colY + 14)} H${f1(colX + 10)} Z" fill="${B}"/>
      ${estrias}
      <rect x="0" y="${f1(baseY)}" width="${ANCHO}" height="4" fill="${B}"/>
      ${filas}
      <g class="formacion"></g>
      <g class="fx"></g>`;
    const $ = (id) => svg.querySelector(`#${pre}${id}`);
    const formacion = svg.querySelector('.formacion');
    const fxG = svg.querySelector('.fx');

    // ---------- Tres hoplitas en formación (el capitán adelante) ----------
    // `orden` es el puesto en la fila: 0 = adelante
    const inicioX = IZQ - HUECO - 12;
    const hoplitas = [];
    for (let k = FORMACION.length - 1; k >= 0; k--) {
      const i = FORMACION[k];
      const w = buildWarrior(CHARS[i], i, formacion, inicioX - k * SEPARACION);
      Object.assign(w, {
        orden: k, gait: MARCH, facing: -1, escala, suelo: topeFila(1), fila: 1, modo: 'parado', salto: null,
        espera: null, sentado: 0, cuclillas: k > 0, armAng: -6, spearAng: 2,
      });
      hoplitas[k] = w;
    }

    // ---------- Estado de la lectura ----------
    let paso = 1;
    let pos = 0;
    let fase = 'leyendo';
    let revelado = IZQ;
    let estrellas = [];
    let vivo = true;
    let reloj = 0;

    function caminarHacia(w, meta, dt) {
      const d = meta - w.x;
      if (d > 0.8) {
        w.x += Math.min(d, Math.min(240, Math.max(45, d * 3.2)) * dt);
        w.modo = 'caminando';
      } else if (w.modo === 'caminando' || w.modo === 'saltando') {
        w.modo = 'parado';
      }
    }

    function lanzarEstrellas(x, y) {
      for (let i = 0; i < 26; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 40 + Math.random() * 110;
        estrellas.push({
          p: el('path', { d: STAR, fill: i % 3 ? C : '#F2C14E', stroke: B, 'stroke-width': 0.6 }, fxG),
          x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 50, rot: rand(0, 360), vida: 2.2 + Math.random() * 1.5,
        });
      }
    }

    function actualizarHoplita(w, dt) {
      const o = w.orden * SEPARACION;
      if (w.salto) {
        const s = w.salto;
        s.t = Math.min(1, s.t + dt / 0.55);
        w.x = s.x0 + (s.x1 - s.x0) * s.t;
        w.suelo = s.y0 + (s.y1 - s.y0) * s.t - 40 * Math.sin(Math.PI * s.t);
        w.modo = 'saltando';
        if (s.t >= 1) { w.salto = null; w.fila = s.fila; w.modo = 'parado'; w.sq = 0.6; }
        return;
      }
      w.suelo = topeFila(w.fila);
      // sentado arriba esperando que se materialice el nivel de abajo; saltan uno tras otro
      if (w.fila < paso) {
        const borde = finFila(w.fila) - 3 - o;
        if (w.fila === paso - 1 && revelado > finFila(paso - 1) + 24) {
          if (w.espera === null) w.espera = w.orden * 0.22;
          w.espera -= dt;
          if (w.espera <= 0) {
            w.espera = null;
            w.salto = { x0: w.x, y0: w.suelo, x1: finFila(paso - 1) + 14, y1: topeFila(paso), t: 0, fila: paso };
            return;
          }
        }
        caminarHacia(w, borde, dt);
        if (w.x >= borde - 0.5 && w.modo !== 'caminando') w.modo = 'sentado';
        return;
      }
      // en el nivel actual: avanzan detrás del frente de lectura
      const completo = pos >= finPaso(paso);
      const meta = completo ? finFila(paso) - (paso < n ? 3 : 46) - o : revelado - 14 - o;
      caminarHacia(w, meta, dt);
      if (completo && w.modo !== 'caminando') {
        if (paso < n) w.modo = 'sentado';
        else if (fase === 'fin') {
          if (w.modo !== 'celebrando' && w.orden === 0) lanzarEstrellas(w.x, w.suelo - 70);
          w.modo = 'celebrando';
        }
      }
    }

    // Traduce el modo de cada hoplita a su pose (andar, sentarse, celebrar)
    function posar(w, dt) {
      const sentado = w.modo === 'sentado';
      w.sentado += ((sentado ? 1 : 0) - w.sentado) * Math.min(1, dt * 8);
      w.amp += ((w.modo === 'caminando' ? 1 : 0) - w.amp) * Math.min(1, dt * 10);
      if (w.modo === 'celebrando') {
        const fase = reloj * (5 + w.orden * 0.6) + w.orden;
        w.jump = Math.abs(Math.sin(fase)) * (14 + w.orden * 3) * w.escala * 2;
        w.armAng = -150; w.spearAng = 145; w.headTilt = 10;
      } else if (w.modo === 'saltando') {
        w.jump = 0; w.armAng = -60; w.spearAng = 40; w.headTilt = 6;
      } else {
        w.jump = 0; w.armAng = -6; w.spearAng = 2;
        w.headTilt = sentado ? -6 : 0;
      }
    }

    let ultimo = performance.now();
    function cuadro(ahora) {
      if (!vivo) return;
      const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimo) / 1000));
      ultimo = ahora;
      reloj += dt;

      const objetivo = posX(pos);
      if (objetivo < revelado) revelado = objetivo;
      else revelado += (objetivo - revelado) * Math.min(1, dt * 5);
      const creciendo = Math.min(1, (objetivo - revelado) / 12);

      hoplitas.forEach((w) => { actualizarHoplita(w, dt); posar(w, dt); updateWarrior(w, dt); });

      for (let r = 1; r <= n; r++) {
        $(`clipr${r}`).setAttribute('width', r < paso || fase === 'fin' ? ANCHO : r === paso ? revelado : 0);
        $(`fila${r}`).setAttribute('opacity', r === paso || fase === 'fin' ? 1 : 0.7);
        $(`fantasma${r}`).setAttribute('opacity', r === paso && fase === 'leyendo' ? 0.45 : 0);
        const fr = $(`frente${r}`);
        const visible = r === paso && fase !== 'fin' && revelado > IZQ + 2;
        fr.setAttribute('x1', f1(revelado));
        fr.setAttribute('x2', f1(revelado));
        fr.setAttribute('stroke-opacity', visible ? (0.35 + 0.6 * creciendo).toFixed(2) : 0);
      }

      if (estrellas.length) {
        estrellas = estrellas.filter((s) => {
          s.vida -= dt;
          if (s.vida <= 0) { s.p.remove(); return false; }
          s.vy += 35 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 0.6; s.vy *= 1 - dt * 0.6; s.rot += dt * 120;
          s.p.setAttribute('transform', `translate(${f1(s.x)},${f1(s.y)}) rotate(${f1(s.rot)}) scale(1.6)`);
          s.p.setAttribute('opacity', Math.min(1, s.vida).toFixed(2));
          return true;
        });
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

  global.EscaleraGriega = { crear };
})(window);
