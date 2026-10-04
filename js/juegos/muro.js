// Muro de palabras: cada palabra difícil es un muro de ladrillos-sílaba. Cada lectura es un
// choque del astronauta (grietas → más grietas → se rompe a la tercera) y la palabra rearmada
// baja hacia su oración. (Viene de maquetas/muro.html.) Necesita js/juegos/escalera.js.
//
//   const m = Muro.crear(svg, { alListo(golpes), alRomper(), alTerminar() })
//   m.palabra(silabas)   arma el muro de una palabra
//   m.leer()             registra una lectura (si el astronauta aún no está listo, queda pendiente)
//   m.destruir()
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const { crearPj, dibujarPj } = global.Escalera;
  const GOLPES = 3;
  const SUELO = 225;
  const FILA = 46;
  const HUECO = 4;
  const MURO_DER = 520;
  const X_INICIO = 880;
  const ESCALA = 1.25;
  let contador = 0;

  function pose(m, a, t) {
    if (m === 'agachado') {
      const r = Math.sin(t * 3) * 0.6;
      return {
        cabeza: [9, -46 + r], torso: [[0, -15], [6, -35 + r]],
        brazoA: [[5, -31], [11, -22], [15, -14]], brazoB: [[5, -31], [7, -21], [10, -13]],
        piernaA: [[0, -15], [8, -9], [4, 0]], piernaB: [[0, -15], [-5, -8], [-10, 0]],
      };
    }
    if (m === 'corriendo' || m === 'atraviesa') {
      const s = Math.sin(a);
      return {
        dy: -Math.abs(Math.cos(a)) * 4,
        cabeza: [9, -53], torso: [[0, -21], [6, -42]],
        brazoA: [[5, -38], [5 - 8 * s, -30], [10 - 6 * s, -24]], brazoB: [[5, -38], [5 + 8 * s, -30], [10 + 6 * s, -24]],
        piernaA: [[0, -21], [3 + 9 * s, -11], [14 * s, -1 - 3 * Math.max(0, s)]],
        piernaB: [[0, -21], [3 - 9 * s, -11], [-14 * s, -1 - 3 * Math.max(0, -s)]],
      };
    }
    if (m === 'rebote') {
      return {
        cabeza: [-6, -52], torso: [[0, -22], [-4, -43]],
        brazoA: [[-3, -39], [6, -47], [12, -52]], brazoB: [[-3, -39], [-10, -46], [-14, -52]],
        piernaA: [[0, -22], [7, -13], [10, -4]], piernaB: [[0, -22], [3, -12], [5, -2]],
      };
    }
    if (m === 'celebrando') {
      const h = Math.abs(Math.sin(t * 3.2));
      const f = (1 - h) * 5;
      return {
        dy: -h * 30,
        cabeza: [0, -55], torso: [[0, -22], [0, -44]],
        brazoA: [[0, -40], [9, -50], [13, -61]], brazoB: [[0, -40], [-9, -50], [-13, -61]],
        piernaA: [[0, -22], [4 + f, -11], [4, 0]], piernaB: [[0, -22], [-4 + f, -11], [-4, 0]],
      };
    }
    const s = m === 'caminando' ? Math.sin(a) : 0;
    const vaiven = m === 'mareado' ? Math.sin(t * 7) * 2.5 : 0;
    return {
      dy: m === 'caminando' ? -Math.abs(Math.cos(a)) * 2 : Math.sin(t * 2) * 0.6,
      cabeza: [1 + vaiven, -55], torso: [[0, -22], [1 + vaiven * 0.6, -44]],
      brazoA: [[1, -40], [-4 * s + 1, -31], [-7 * s + 2, -24]], brazoB: [[1, -40], [4 * s + 1, -31], [7 * s + 2, -24]],
      piernaA: [[0, -22], [5 * s + 2, -11], [9 * s, 0]], piernaB: [[0, -22], [-5 * s + 2, -11], [-9 * s, 0]],
    };
  }

  function crear(svg, { alListo = () => {}, alRomper = () => {}, alTerminar = () => {} } = {}) {
    const pre = `muro${++contador}-`;
    svg.innerHTML = `
      <defs><pattern id="${pre}ach" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#333" stroke-width="1"/></pattern></defs>
      <line class="suelo" x1="20" x2="980" y1="226" y2="226"/>
      <g class="golpes">${[0, 1, 2].map((k) => `<circle class="golpe" cx="${920 + k * 22}" cy="28" r="6"/>`).join('')}</g>
      <g class="muro"><g class="ladrillos"></g><g class="grietas"></g></g>
      <g class="chispas"></g>
      <g class="mareo"></g>`;
    const $muro = svg.querySelector('.muro');
    const $ladrillos = svg.querySelector('.ladrillos');
    const $grietas = svg.querySelector('.grietas');
    const $chispas = svg.querySelector('.chispas');
    const $mareo = svg.querySelector('.mareo');
    const elPj = crearPj(svg);

    let ladrillos = [];
    let chispas = [];
    let muro = null;
    let golpes = 0;
    let pendiente = false;
    let sacudida = 9;
    let reloj = 0;
    let vivo = true;
    let gen = 0;
    const pj = { x: X_INICIO, y: SUELO, dir: -1, modo: 'agachado', anim: 0, t: 0 };

    // ---------- Muro ----------
    function crearLadrillo(x, y, w, h, silaba) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', silaba ? 'ladrillo' : 'ladrillo liso');
      g.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" rx="3"${silaba ? '' : ` fill="url(#${pre}ach)"`}/>` +
        (silaba ? `<text x="${w / 2}" y="${h / 2}" dy=".35em"></text>` : '');
      if (silaba) g.querySelector('text').textContent = silaba;
      $ladrillos.appendChild(g);
      return { g, rect: g.querySelector('rect'), x, y, w, h, silaba, ox: 0, oy: -260, rot: 0, op: 1, modo: 'cae', t: 0 };
    }

    function construir(sils) {
      $ladrillos.innerHTML = '';
      $grietas.innerHTML = '';
      $grietas.style.opacity = '';
      ladrillos = [];
      const anchos = sils.map((s) => 30 + s.length * 15);
      const total = anchos.reduce((a, b) => a + b, 0) + HUECO * (sils.length - 1);
      const izq = MURO_DER - total;
      let x = izq;
      const centros = [];
      const juntasAbajo = [];
      sils.forEach((s, k) => {
        ladrillos.push(crearLadrillo(x, SUELO - FILA, anchos[k], FILA - 2, s));
        centros.push(x + anchos[k] / 2);
        x += anchos[k] + HUECO;
        if (k < sils.length - 1) juntasAbajo.push(x - HUECO / 2);
      });
      const juntas = sils.length > 2 ? [izq, ...centros.slice(1, -1), MURO_DER] : [izq, (izq + MURO_DER) / 2, MURO_DER];
      for (let k = 0; k < juntas.length - 1; k++) {
        const a = juntas[k] + (k ? HUECO / 2 : 0);
        const b = juntas[k + 1] - (k < juntas.length - 2 ? HUECO / 2 : 0);
        ladrillos.push(crearLadrillo(a, SUELO - 2 * FILA - 1, b - a, FILA - 2, null));
      }
      ladrillos.forEach((l, k) => { l.t = -k * 0.05; });
      muro = { izq, total, juntasAbajo };
    }

    function agregarGrieta(d, retraso = 0) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'grieta');
      p.setAttribute('pathLength', '1');
      p.setAttribute('d', d);
      p.style.transitionDelay = `${retraso}s`;
      $grietas.appendChild(p);
      p.getBoundingClientRect();
      p.classList.add('on');
    }

    function zigzagVertical(x, y1, y2, amp) {
      let d = `M${x.toFixed(1)},${y1.toFixed(1)}`;
      for (let k = 1; k <= 6; k++) {
        const y = y1 + ((y2 - y1) * k) / 6;
        d += ` L${(x + (k % 2 ? amp : -amp) * (k < 6 ? 1 : 0.3)).toFixed(1)},${y.toFixed(1)}`;
      }
      return d;
    }

    function grietaDesdeImpacto(largo, y0, retraso = 0, margen = 10) {
      let x = MURO_DER - 1;
      let y = y0;
      const puntos = [[x, y]];
      while (x > MURO_DER - largo) {
        x -= 12 + Math.random() * 18;
        y = Math.min(y0 + margen, Math.max(y0 - margen, y + (Math.random() - 0.5) * 14));
        puntos.push([x, y]);
      }
      agregarGrieta('M' + puntos.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L'), retraso);
      for (let k = 2; k < puntos.length - 1; k += 3) {
        const [a, b] = puntos[k];
        const s = Math.random() < 0.5 ? -1 : 1;
        agregarGrieta(`M${a.toFixed(1)},${b.toFixed(1)} L${(a - 8 - Math.random() * 8).toFixed(1)},${(b + s * (8 + Math.random() * 8)).toFixed(1)} ` +
          `L${(a - 14 - Math.random() * 10).toFixed(1)},${(b + s * (14 + Math.random() * 6)).toFixed(1)}`, retraso + 0.12 + k * 0.03);
      }
    }

    function agrietar(n) {
      const silabicos = ladrillos.filter((l) => l.silaba);
      if (n === 1) {
        muro.juntasAbajo.forEach((x, k) => agregarGrieta(zigzagVertical(x, SUELO - FILA + 3, SUELO - 3, 3.5), 0.1 + 0.05 * k));
        grietaDesdeImpacto(muro.total * 0.4, SUELO - FILA - 22, 0, 6);
        silabicos.forEach((l, k) => { l.ox = (k - (silabicos.length - 1) / 2) * 1.5; });
      } else {
        muro.juntasAbajo.forEach((x, k) => agregarGrieta(zigzagVertical(x, SUELO - FILA, SUELO - 2 * FILA + 3, 5), 0.1 + 0.05 * k));
        grietaDesdeImpacto(muro.total * 0.75, SUELO - FILA - 14, 0, 8);
        silabicos.forEach((l, k) => { l.ox = (k - (silabicos.length - 1) / 2) * 4; });
        ladrillos.filter((l) => l.x + l.w > MURO_DER - 70).forEach((l) => { l.rot = -0.035; l.ox -= 2; });
      }
    }

    function lanzarChispas(cantidad, fuerza) {
      for (let i = 0; i < cantidad; i++) {
        chispas.push({
          tipo: 'chispa', x: MURO_DER + 2, y: SUELO - 50 + (Math.random() - 0.5) * 30,
          vx: 40 + Math.random() * 160 * fuerza, vy: -60 - Math.random() * 160 * fuerza,
          rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 14, vida: 0.7 + Math.random() * 0.6,
        });
      }
    }

    function lanzarEstrellas(x, y) {
      const grises = ['#ffffff', '#c8c8c8', '#8a8a8a'];
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 40 + Math.random() * 110;
        chispas.push({
          tipo: 'estrella', x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 40,
          tam: 2.5 + Math.random() * 3, fase: Math.random() * 6.3, c: grises[i % 3], vida: 2 + Math.random() * 1.5,
        });
      }
    }

    function romper() {
      $grietas.style.opacity = '0';
      for (const l of ladrillos) {
        l.modo = 'vuela';
        l.t = 0;
        l.vx = -(90 + Math.random() * 220) * (0.6 + (l.x - muro.izq) / muro.total);
        l.vy = -(120 + Math.random() * 200);
        l.vr = (Math.random() - 0.5) * 7;
      }
      lanzarChispas(18, 1.4);
      const g = gen;
      setTimeout(() => { if (g === gen && vivo) armarPalabra(); }, 1150);
    }

    // Las sílabas se juntan en el aire y la palabra baja hacia la oración
    function armarPalabra() {
      const sils = ladrillos.filter((l) => l.silaba);
      const anchos = sils.map((l) => l.g.querySelector('text').getComputedTextLength());
      let x = 560 - anchos.reduce((a, b) => a + b, 0) / 2;
      sils.forEach((l, k) => {
        const cx = x + anchos[k] / 2;
        x += anchos[k];
        Object.assign(l, { modo: 'arma', t: 0, sx: l.ox, sy: l.oy, sr: l.rot, tx: cx - l.w / 2 - l.x, ty: 95 - l.h / 2 - l.y });
      });
      const g = gen;
      setTimeout(() => {
        if (g !== gen || !vivo) return;
        sils.forEach((l) => { l.modo = 'baja'; l.t = 0; });
        alRomper();
      }, 1900);
      setTimeout(() => { if (g === gen && vivo) alTerminar(); }, 3600);
    }

    // ---------- Astronauta ----------
    function listo() {
      pj.modo = 'agachado';
      pj.dir = -1;
      pj.x = X_INICIO;
      alListo(golpes);
      if (pendiente) {
        pendiente = false;
        const g = gen;
        setTimeout(() => { if (g === gen && vivo) correr(); }, 250);
      }
    }

    function correr() {
      pj.modo = 'corriendo';
      pj.t = 0;
    }

    function impacto() {
      golpes++;
      sacudida = 0;
      svg.querySelectorAll('.golpe').forEach((c, k) => c.classList.toggle('hecho', k < golpes));
      if (golpes < GOLPES) {
        agrietar(golpes);
        lanzarChispas(6 + golpes * 4, 1);
        pj.modo = 'rebote';
        pj.t = 0;
        pj.x0 = pj.x;
      } else {
        romper();
        pj.modo = 'atraviesa';
        pj.vel = 900;
      }
    }

    function actualizarPj(dt) {
      pj.t += dt;
      if (pj.modo === 'corriendo') {
        const avance = 1300 * dt;
        pj.x -= avance;
        pj.anim += avance * 0.09;
        if (pj.x <= MURO_DER + 12) { pj.x = MURO_DER + 12; impacto(); }
      } else if (pj.modo === 'rebote') {
        const p = Math.min(1, pj.t / 0.45);
        pj.x = pj.x0 + 120 * p;
        pj.y = SUELO - 38 * Math.sin(Math.PI * p);
        if (p >= 1) { pj.y = SUELO; pj.modo = 'mareado'; pj.t = 0; }
      } else if (pj.modo === 'mareado') {
        if (pj.t > 0.9) { pj.modo = 'caminando'; pj.dir = 1; }
      } else if (pj.modo === 'caminando') {
        const avance = Math.min(X_INICIO - pj.x, 430 * dt);
        pj.x += avance;
        pj.anim += avance * 0.13;
        if (pj.x >= X_INICIO - 0.5) listo();
      } else if (pj.modo === 'atraviesa') {
        pj.vel = Math.max(160, pj.vel - 900 * dt);
        const avance = pj.vel * dt;
        pj.x -= avance;
        pj.anim += avance * 0.09;
        if (pj.x <= 250) {
          pj.modo = 'celebrando';
          pj.dir = 1;
          lanzarEstrellas(pj.x, SUELO - 70);
        }
      }
    }

    // ---------- Bucle ----------
    let ultimo = performance.now();
    function cuadro(ahora) {
      if (!vivo) return;
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      reloj += dt;
      sacudida += dt;
      actualizarPj(dt);

      const vib = sacudida < 0.4 ? Math.sin(sacudida * 70) * 4 * Math.exp(-sacudida * 9) : 0;
      $muro.setAttribute('transform', `translate(${vib.toFixed(2)} 0)`);

      for (const l of ladrillos) {
        l.t += dt;
        if (l.modo === 'cae') {
          const p = Math.max(0, Math.min(1, l.t / 0.4));
          l.oy = -260 * Math.pow(1 - p, 3);
          if (p >= 1) l.modo = 'quieto';
        } else if (l.modo === 'vuela') {
          l.vy += 420 * dt;
          l.ox += l.vx * dt;
          l.oy += l.vy * dt;
          l.rot += l.vr * dt;
          if (l.y + l.oy + l.h > SUELO) { l.oy = SUELO - l.h - l.y; l.vy *= -0.3; l.vx *= 0.6; l.vr *= 0.5; }
          if (!l.silaba) l.op = Math.max(0, 1 - Math.max(0, l.t - 0.7) / 0.5);
        } else if (l.modo === 'arma') {
          const p = Math.min(1, l.t / 0.75);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          l.ox = l.sx + (l.tx - l.sx) * e;
          l.oy = l.sy + (l.ty - l.sy) * e;
          l.rot = l.sr * (1 - e);
          l.rect.style.opacity = String(1 - e);
        } else if (l.modo === 'baja') {
          const p = Math.min(1, l.t / 0.7);
          l.oy = l.ty + 200 * p * p;
          l.op = 1 - p;
        }
        l.g.setAttribute('opacity', l.op.toFixed(2));
        l.g.setAttribute('transform',
          `translate(${(l.x + l.ox).toFixed(1)} ${(l.y + l.oy).toFixed(1)}) rotate(${((l.rot * 180) / Math.PI).toFixed(1)} ${l.w / 2} ${l.h / 2})`);
      }

      const P = pose(pj.modo, pj.anim, reloj);
      dibujarPj(elPj, P, pj.x, pj.y, ESCALA, pj.dir);

      if (pj.modo === 'mareado') {
        const hx = pj.x + pj.dir * P.cabeza[0] * ESCALA;
        const hy = pj.y + P.cabeza[1] * ESCALA - 22;
        let html = '';
        for (let k = 0; k < 3; k++) {
          const a = reloj * 6 + (k * Math.PI * 2) / 3;
          const x = hx + Math.cos(a) * 16;
          const y = hy + Math.sin(a) * 5;
          html += `<path d="M${x},${y - 3.5}V${y + 3.5}M${x - 3.5},${y}H${x + 3.5}" stroke="#d0d0d0" stroke-width="1.5" stroke-linecap="round"/>`;
        }
        $mareo.innerHTML = html;
      } else if ($mareo.innerHTML) {
        $mareo.innerHTML = '';
      }

      if (chispas.length) {
        chispas = chispas.filter((c) => (c.vida -= dt) > 0);
        let html = '';
        for (const c of chispas) {
          if (c.tipo === 'chispa') {
            c.vy += 520 * dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.rot += c.vr * dt;
            if (c.y > SUELO) { c.y = SUELO; c.vy *= -0.3; c.vx *= 0.5; c.vr *= 0.5; }
            const dx = Math.cos(c.rot) * 3;
            const dy = Math.sin(c.rot) * 3;
            html += `<line x1="${(c.x - dx).toFixed(1)}" y1="${(c.y - dy).toFixed(1)}" x2="${(c.x + dx).toFixed(1)}" y2="${(c.y + dy).toFixed(1)}" stroke="#9a9a9a" stroke-width="1.6" stroke-linecap="round" opacity="${Math.min(1, c.vida * 2).toFixed(2)}"/>`;
          } else {
            c.vy += 35 * dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.vx *= 1 - dt * 0.6;
            c.vy *= 1 - dt * 0.6;
            const o = Math.min(1, c.vida) * (0.55 + 0.45 * Math.sin(reloj * 6 + c.fase));
            html += `<path d="M${c.x.toFixed(1)},${(c.y - c.tam).toFixed(1)}V${(c.y + c.tam).toFixed(1)}M${(c.x - c.tam).toFixed(1)},${c.y.toFixed(1)}H${(c.x + c.tam).toFixed(1)}" stroke="${c.c}" stroke-width="1.6" stroke-linecap="round" opacity="${o.toFixed(2)}"/>`;
          }
        }
        $chispas.innerHTML = html;
      }
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);

    return {
      palabra(silabas) {
        gen++;
        golpes = 0;
        pendiente = false;
        svg.querySelectorAll('.golpe').forEach((c) => c.classList.remove('hecho'));
        construir(silabas);
        listo();
      },
      leer() {
        if (golpes >= GOLPES) return;
        if (pj.modo === 'agachado') correr();
        else pendiente = true;
      },
      destruir() { vivo = false; },
    };
  }

  global.Muro = { crear };
})(window);
