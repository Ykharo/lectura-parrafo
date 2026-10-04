// Muro griego: la palabra a la izquierda y un muro que cinco hoplitas embisten; a la tercera
// lectura cae. Con `dioses`, cada intento trae a Cupido, Medusa y Zeus (versión cómica).
// Viene de Antecedentes/derriba-el-muro-dioses.html sin cambios de estilo ni de tiempos.
// Necesita js/juegos/griego-base.js.
//
//   const m = MuroGriego.crear(svg, { alListo(golpes), alCorrer(), alRomper(), alTerminar() })
//   m.palabra(silabas, { texto, dioses })   arma el muro de una palabra (misma firma que Muro)
//   m.leer()                                 registra una lectura (queda pendiente si hay un intento en curso)
//   m.destruir()
(function (global) {
  'use strict';

  const {
    GROUND, B, C, RED, BK, STONES, STAR, reduceMotion,
    el, rand, lerp, clamp, f1, ease, tween, wait, fondo,
    CHARS, buildWarrior, updateWarrior, RUN, SAD, MARCH, tw, moveTo, hop, turn,
  } = global.Griego;

  const HITS = 3;
  const WALL = { x: 505, y: 80, w: 110, h: 182 };
  const WALL_RIGHT = WALL.x + WALL.w;
  const START_X = 1270;
  const LEFT_LIMIT = 498;
  const CRACKS = [
    'M615,152 L601,158 L594,149 L580,166 L570,160 L556,177',
    'M601,158 L605,138 L594,125 L599,106',
    'M615,206 L601,201 L590,215 L575,209 L562,226',
    'M580,166 L566,149 L552,154 L540,139',
    'M590,215 L584,236 L572,244 L566,262',
  ];
  const GOLD = '#F2C14E', GLOW = '#FFF3B0';
  const HEART = 'M0,3 C-6,-3 -3,-8 0,-4 C3,-8 6,-3 0,3Z';
  const decel = (t) => 1 - Math.pow(1 - t, 2.2);
  const TEAM_X = [950, 1010, 900, 1075, 1140]; // dónde se colocan los cinco detrás del dios
  let contador = 0;

  // [retraso de salida, duración de la carrera]: cada uno llega a su ritmo
  const RUN_T = [[0, 1150], [150, 1120], [40, 1380], [260, 1420], [330, 1520]];
  // Derrotados: cada uno reacciona y se retira a su manera
  const RETREAT = [
    { delay: 750, dur: 2400, head: -16, looks: [0.45] },
    { delay: 420, dur: 2500, head: -12, looks: [0.25, 0.65] },
    { delay: 260, dur: 1900, head: -26, looks: [] },
    { delay: 140, dur: 3000, head: -14, looks: [], pause: 0.5 },
    { delay: 0, dur: 2600, head: -15, looks: [0.55] },
  ];
  const MARCH_T = [
    { delay: 500, dur: 2200, looks: [0.4] }, { delay: 300, dur: 2000, looks: [0.6] },
    { delay: 150, dur: 1700, looks: [] }, { delay: 200, dur: 2600, looks: [0.3] },
    { delay: 0, dur: 2300, looks: [] },
  ];

  function crear(svg, { alListo = () => {}, alCorrer = () => {}, alRomper = () => {}, alTerminar = () => {} } = {}) {
    const pre = `mg${++contador}-`;
    svg.setAttribute('viewBox', '0 0 1200 296');
    svg.innerHTML = `
      ${fondo(pre, 1200, 296)}
      <text class="palabra-banda" x="34" y="238" font-family="Andika, 'Trebuchet MS', Verdana, sans-serif" font-weight="700" font-size="150" fill="${B}"></text>
      <g class="wall"><g class="bricks"></g><g class="cracks"></g></g>
      <g class="debris"></g>
      <g class="army"></g>
      <g class="gods"></g>
      <g class="fx"></g>
      <rect class="flash" width="1200" height="296" fill="#FFF3D6" opacity="0" pointer-events="none"/>`;
    const q = (s) => svg.querySelector(s);
    const wordEl = q('.palabra-banda');
    const bricksG = q('.bricks'), cracksG = q('.cracks'), wallG = q('.wall'), debrisG = q('.debris'), fxG = q('.fx');
    const armyG = q('.army'), godsG = q('.gods'), skyEl = q('.cielo'), flashEl = q('.flash');
    // la banda tapa la última greca inferior: se vuelve a poner encima del todo
    svg.querySelectorAll('rect').forEach((r) => { if (Number(r.getAttribute('y')) >= GROUND) svg.insertBefore(r, flashEl); });

    let vivo = true;
    let palabraTexto = '';
    let dioses = false;
    let hits = 0, busy = false, pendiente = false, gen = 0;

    /* ================== PALABRA ================== */
    function fitWord() {
      wordEl.textContent = palabraTexto;
      wordEl.setAttribute('font-size', 150);
      const w = wordEl.getBBox().width;
      if (w > 450) wordEl.setAttribute('font-size', f1(150 * 450 / w));
    }

    /* ================== MURO ================== */
    let bricks = [], crackEls = [], debris = [], dust = [], shake = 0;

    function buildWall() {
      bricksG.innerHTML = ''; cracksG.innerHTML = ''; debrisG.innerHTML = '';
      bricks = []; debris = [];
      const rows = 9, bh = WALL.h / rows, bw = 36;
      let i = 0;
      for (let r = 0; r < rows; r++) {
        const y0 = WALL.y + r * bh, off = r % 2 ? bw / 2 : 0;
        for (let x = WALL.x - off; x < WALL_RIGHT; x += bw) {
          const x0 = Math.max(x, WALL.x), x1 = Math.min(x + bw, WALL_RIGHT);
          if (x1 - x0 < 4) continue;
          const w = x1 - x0;
          const g = el('g', { transform: `translate(${x0 + w / 2},${y0 + bh / 2})` }, bricksG);
          el('rect', { x: -w / 2, y: -bh / 2, width: w, height: bh, fill: STONES[(i * 7 + r) % 4], stroke: B, 'stroke-width': 2 }, g);
          bricks.push({ g, cx: x0 + w / 2, cy: y0 + bh / 2, w, h: bh });
          i++;
        }
      }
      crackEls = CRACKS.map((d) => {
        const p = el('path', { d, class: 'crack' }, cracksG);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        return p;
      });
      cracksG.style.opacity = 1;
    }
    function loosen(b, vx, vy, vr, delay = 0) {
      bricks = bricks.filter((o) => o !== b);
      debrisG.appendChild(b.g);
      debris.push({ ...b, x: b.cx, y: b.cy, vx, vy, vr, rot: 0, delay, resting: false });
    }
    function wallHit(final) {
      shake = reduceMotion ? 0 : (final ? 10 : 7);
      for (let i = 0; i < (final ? 30 : 18); i++) {
        spawnDust(WALL_RIGHT + rand(-2, 10), GROUND - Math.pow(Math.random(), 0.7) * WALL.h * 0.95,
          rand(20, final ? 220 : 140), rand(-90, 10), rand(3, final ? 11 : 7), rand(0.6, 1.1));
      }
      if (final) {
        cracksG.style.opacity = 0;
        [...bricks].forEach((b) => {
          const top = 1 - (b.cy - WALL.y) / WALL.h;
          loosen(b, -rand(40, 200) * (0.4 + top), -rand(0, 160) * top, rand(-320, 320),
            ((WALL_RIGHT - b.cx) / WALL.w) * 0.12 + rand(0, 0.06));
        });
        return;
      }
      crack();
      if (hits >= 2) {
        bricks.filter((b) => b.cx + b.w / 2 > WALL_RIGHT - 1 && b.cy > 120 && b.cy < 230)
          .sort(() => Math.random() - 0.5).slice(0, hits - 1)
          .forEach((b) => loosen(b, rand(40, 90), rand(-60, 0), rand(-120, 120)));
      }
    }
    /* Grietas sin golpe (para flechas y mirada) */
    function crack() {
      const count = hits === 1 ? 1 : Math.round(1 + (CRACKS.length - 1) * (hits - 1) / Math.max(1, HITS - 2));
      crackEls.forEach((p, i) => { if (i < count) p.style.strokeDashoffset = 0; });
    }

    /* ================== PARTÍCULAS ================== */
    function spawnDust(x, y, vx, vy, r, max) {
      const c = el('circle', { fill: C }, fxG);
      dust.push({ c, x, y, vx, vy, r, life: 0, max });
    }
    function stars(w, ms) {
      const g = el('g', {}, fxG);
      const st = [0, 1, 2].map(() => el('path', { d: STAR, fill: C, stroke: B, 'stroke-width': 0.8 }, g));
      const c = w.c;
      return tween(ms, (e, t) => {
        const topY = GROUND - c.hipY - c.H - 36 * c.hs - w.jump;
        st.forEach((s, k) => {
          const ang = t * Math.PI * 5 + k * 2.09;
          s.setAttribute('transform', `translate(${f1(w.x + w.push + Math.cos(ang) * 18)},${f1(topY + Math.sin(ang) * 5)}) scale(${(0.9 + 0.25 * Math.sin(ang)).toFixed(2)})`);
        });
        g.setAttribute('opacity', t > 0.75 ? ((1 - t) / 0.25).toFixed(2) : 1);
      }).then(() => g.remove());
    }

    /* ================== PERSONAJES ================== */
    const warriors = [];
    for (let i = CHARS.length - 1; i >= 0; i--) warriors[i] = buildWarrior(CHARS[i], i, armyG, START_X + 300);
    warriors.forEach((w) => { w.gait = SAD; });

    /* Formación: cada uno queda pegado a la espalda del de delante */
    const TARGETS = [];
    CHARS.forEach((c, i) => {
      const front = c.scx - c.R;
      if (i === 0) TARGETS[0] = WALL_RIGHT - front - 1;
      else { const p = CHARS[i - 1]; TARGETS[i] = TARGETS[i - 1] + p.W * 0.6 + 6 - front - 6; }
    });

    /* ================== GUION ================== */
    async function charge(w, i, final) {
      const [delay, dur] = RUN_T[i];
      Object.assign(w, { x: START_X + i * 55 + rand(0, 30), facing: 1, look: 1, gait: RUN, amp: 1, lean: -12,
        headTilt: -5, wob: 0, armAng: -8, spearAng: -16, shieldDrop: 0, shieldRot: -4, jump: 0 });
      w.prevX = w.x;
      await wait(delay);
      const tx = TARGETS[i];
      // anticipación: en el último tramo se lanzan hacia delante
      wait(dur * 0.75).then(() => { w.sqV -= 5; tw(w, { lean: -24, headTilt: -12, shieldRot: -12 }, dur * 0.25, ease.outQuad); });
      await moveTo(w, tx, dur, ease.charge);
      impact(w, i, final);
      tw(w, { amp: 0 }, 220, ease.outQuad);
      if (final && i === 0) {
        tw(w, { lean: -30 }, 180);
        await moveTo(w, tx - 34, 340, ease.outQuad); // tropieza hacia el hueco
        await tw(w, { lean: -4, headTilt: 0, shieldRot: 0 }, 350, ease.outQuad);
      } else {
        tw(w, { lean: 10, headTilt: 8, shieldRot: 10 }, 160, ease.outQuad)
          .then(() => tw(w, { lean: 0, headTilt: 0, shieldRot: 0 }, 420));
        await moveTo(w, tx + 12 + rand(0, 10), 220, ease.outQuad); // rebote
      }
    }

    function impact(w, i, final) {
      w.sq = 1; w.sqV = 0; w.bellyV += 90; w.crestV += 260;
      if (i === 0) wallHit(final);
      else {
        const f = warriors[i - 1]; // choca con la espalda del compañero
        f.pushV -= 160; f.sq = Math.max(f.sq, 0.45); f.crestV += 150;
        if (!final && !reduceMotion) shake = Math.max(shake, 2.5);
      }
    }

    async function retreat(w, i) {
      const r = RETREAT[i];
      const react = [
        () => tween(900, (e, t) => { w.wob = Math.sin(t * Math.PI * 6) * 12 * (1 - t); }),
        () => tw(w, { headTilt: 16 }, 300).then(() => tw(w, { headTilt: -6 }, 450)),
        async () => { await hop(w, 8, 200); await hop(w, 5, 170); },
        () => tw(w, { lean: -16, headTilt: -10 }, 500),
        () => tw(w, { lean: 6, headTilt: 8 }, 300).then(() => tw(w, { lean: 0, headTilt: -4 }, 350)),
      ];
      react[i]();
      await wait(r.delay);
      await turn(w, -1);
      w.gait = SAD; w.amp = 0;
      tw(w, { amp: 1, lean: -10, headTilt: r.head, wob: 0, armAng: -10, spearAng: 42, shieldDrop: 14, shieldRot: 20 }, 450);
      r.looks.forEach((p) => wait(r.dur * p).then(async () => {
        await tw(w, { look: -1, headTilt: -2 }, 260);
        await wait(i === 0 ? 650 : 500);
        await tw(w, { look: 1, headTilt: r.head }, 300);
      }));
      const end = START_X + 80;
      if (r.pause) {
        const mid = w.x + (end - w.x) * r.pause;
        await moveTo(w, mid, r.dur * r.pause, ease.walk);
        await tw(w, { amp: 0, lean: -22, headTilt: -20 }, 300); // resopla
        await wait(380);
        w.sqV -= 3;
        await tw(w, { amp: 1, lean: -12, headTilt: r.head }, 300);
        await moveTo(w, end, r.dur * (1 - r.pause));
      } else await moveTo(w, end, r.dur, ease.walk);
      w.amp = 0;
    }

    // Victoria: cada uno celebra con su personalidad
    async function celebrate(w, i) {
      w.amp = 0;
      if (i === 0) {
        await tw(w, { armAng: -155, spearAng: 150, headTilt: 10, lean: 4 }, 280, ease.outQuad);
        for (let k = 0; k < 3; k++)
          await Promise.all([hop(w, 14, 260), tw(w, { armAng: -172 }, 130).then(() => tw(w, { armAng: -150 }, 130))]);
      } else if (i === 1) {
        await tw(w, { lean: -6 }, 160); w.sq = 0.5; await wait(120);
        await Promise.all([hop(w, 36, 560), tw(w, { armAng: -160, spearAng: 160, headTilt: 12 }, 300)]);
        await tween(500, (e, t) => { w.armAng = -160 + Math.sin(t * Math.PI * 4) * 14; });
      } else if (i === 2) {
        tw(w, { armAng: -150, spearAng: 145, headTilt: 12 }, 200);
        for (let k = 0; k < 4; k++) await hop(w, 22, 230);
      } else if (i === 3) {
        await wait(250);
        await tw(w, { armAng: -120, spearAng: 120, headTilt: 14, lean: -2 }, 600);
        await hop(w, 6, 220);
        await tw(w, { lean: -14, headTilt: 2 }, 500); // ¡ay, la espalda!
      } else {
        await wait(120);
        await hop(w, 12, 330); await hop(w, 14, 340);
        await tw(w, { armAng: -130, spearAng: 130, headTilt: 10 }, 300);
      }
    }
    async function marchOff(w, i) {
      const m = MARCH_T[i];
      await wait(m.delay);
      await turn(w, -1);
      w.gait = MARCH; w.amp = 0;
      tw(w, { amp: 1, lean: i === 3 ? -4 : 5, headTilt: 8, armAng: -6, spearAng: 2, shieldDrop: 0, shieldRot: 0 }, 400);
      m.looks.forEach((p) => wait(m.dur * p).then(async () => {
        await tw(w, { look: -1 }, 240); await wait(500); await tw(w, { look: 1 }, 260);
      }));
      await moveTo(w, START_X + 80, m.dur);
      w.amp = 0;
    }

    /* ================== DIOSES Y EFECTOS (variación cómica) ================== */
    let fxItems = []; // efectos con actualización propia (corazones, chispas…)
    function addFx(fn) { fxItems.push(fn); }
    function centerOf(node) {
      const r = node.getBoundingClientRect(), p = svg.createSVGPoint();
      p.x = r.x + r.width / 2; p.y = r.y + r.height / 2;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    }
    function hearts(x, y, n, spread = 14) {
      for (let i = 0; i < n; i++) {
        const h = el('path', { d: HEART, fill: RED, stroke: B, 'stroke-width': 0.6 }, fxG);
        const p = { x: x + rand(-spread, spread), y: y + rand(-6, 6), vy: rand(-70, -35), ph: rand(0, 6), s: rand(1.3, 2.3), life: 0, max: rand(1, 1.6) };
        addFx((dt) => {
          p.life += dt;
          if (p.life > p.max) { h.remove(); return false; }
          p.y += p.vy * dt; p.ph += dt * 5;
          const k = p.life / p.max, sc = p.s * (k < 0.15 ? k / 0.15 : 1);
          h.setAttribute('transform', `translate(${f1(p.x + Math.sin(p.ph) * 6)},${f1(p.y)}) scale(${sc.toFixed(2)})`);
          h.setAttribute('opacity', (1 - Math.max(0, (k - 0.6) / 0.4)).toFixed(2));
          return true;
        });
      }
    }
    function heartTrail(getPos, ms, every) {
      let t = 0, acc = 0;
      addFx((dt) => {
        t += dt; acc += dt;
        if (t > ms / 1000) return false;
        if (acc > every) { acc = 0; const [x, y] = getPos(); hearts(x, y, 1, 8); }
        return true;
      });
    }
    function sparks(node, ms) {
      let t = 0, acc = 0;
      addFx((dt) => {
        t += dt; acc += dt;
        if (t > ms / 1000) return false;
        if (acc > 0.05) {
          acc = 0;
          const c = centerOf(node), s = el('path', { d: STAR, fill: GLOW, stroke: B, 'stroke-width': 0.5 }, fxG);
          const p = { x: c.x + rand(-18, 18), y: c.y + rand(-18, 18), life: 0 };
          addFx((d2) => {
            p.life += d2;
            if (p.life > 0.35) { s.remove(); return false; }
            s.setAttribute('transform', `translate(${f1(p.x)},${f1(p.y)}) rotate(${f1(p.life * 400)}) scale(${(1.5 * (1 - p.life / 0.35)).toFixed(2)})`);
            return true;
          });
        }
        return true;
      });
    }
    function skid(x) {
      for (let i = 0; i < 7; i++) spawnDust(x + rand(0, 22), GROUND - 3, rand(40, 120), rand(-40, -10), rand(2, 5), rand(0.3, 0.6));
    }

    /* Globo de diálogo: la cola apunta a la cabeza de quien habla (hx) */
    function say(hx, y, text, ms = 1400) {
      const g = el('g', {}, fxG);
      const t = el('text', { x: 0, y: 7, 'text-anchor': 'middle', 'font-family': "Andika, 'Trebuchet MS', sans-serif", 'font-weight': 700, 'font-size': 21, fill: B }, g);
      t.textContent = text;
      const w = t.getBBox().width + 26;
      let cx = hx + w / 2 - 22;
      cx = Math.min(cx, 1192 - w / 2);
      const tx = clamp(hx - cx, -w / 2 + 14, w / 2 - 14);
      g.insertBefore(el('path', { d: `M${f1(tx - 7)},12 L${f1(tx - 3)},30 L${f1(tx + 8)},12 Z`, fill: C, stroke: B, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }), t);
      g.insertBefore(el('rect', { x: f1(-w / 2), y: -17, width: f1(w), height: 34, rx: 17, fill: C, stroke: B, 'stroke-width': 2.5 }), t);
      g.insertBefore(el('path', { d: `M${f1(tx - 5)},16 L${f1(tx + 6)},16`, stroke: C, 'stroke-width': 4 }), t);
      tween(220, (e, k) => {
        const sc = k < 0.7 ? k / 0.7 * 1.1 : 1.1 - (k - 0.7) / 0.3 * 0.1;
        g.setAttribute('transform', `translate(${f1(cx)},${y}) scale(${sc.toFixed(3)})`);
      });
      wait(ms).then(() => tween(200, (e) => g.setAttribute('opacity', (1 - e).toFixed(2)))).then(() => g.remove());
    }

    /* Flechas de Cupido (punta de corazón) */
    function arrowSVG(parent) {
      const g = el('g', {}, parent);
      g.innerHTML = `<line x1="2" y1="0" x2="38" y2="0" stroke="${B}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M33,0 L41,-5 L39,0 L41,5 Z" fill="${RED}" stroke="${B}" stroke-width=".6"/>
        <path d="${HEART}" transform="rotate(90) scale(1.5)" fill="${RED}" stroke="${B}" stroke-width=".7"/>`;
      return g;
    }
    function flyArrow(x1, y1, x2, y2, arc = 20) {
      const g = arrowSVG(fxG);
      const ms = Math.max(260, Math.hypot(x2 - x1, y2 - y1) / 1.1);
      let px = x1, py = y1;
      return tween(ms, (e, t) => {
        const x = lerp(x1, x2, t), y = lerp(y1, y2, t) - arc * Math.sin(Math.PI * t);
        if (t > 0) g.setAttribute('transform', `translate(${f1(x)},${f1(y)}) rotate(${f1(Math.atan2(y - py, x - px) * 180 / Math.PI + 180)})`);
        px = x; py = y;
      }).then(() => g);
    }

    /* Rayo de Zeus */
    function lightning(x1, y1, x2, y2) {
      const g = el('g', {}, fxG);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, N = 9;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const off = i === 0 || i === N ? 0 : rand(-24, 24);
        pts.push([x1 + dx * i / N + nx * off, y1 + dy * i / N + ny * off]);
      }
      const bp = [pts[4], [pts[4][0] - 40, pts[4][1] + rand(30, 50)], [pts[4][0] - 55, pts[4][1] + rand(60, 80)]];
      for (const set of [pts, bp]) {
        const d = set.map((p) => p.map(f1).join(',')).join(' ');
        el('polyline', { points: d, fill: 'none', stroke: GOLD, 'stroke-width': set === pts ? 11 : 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        el('polyline', { points: d, fill: 'none', stroke: '#FFFDF2', 'stroke-width': set === pts ? 4 : 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
      }
      tween(560, (e, t) => {
        const on = [1, 0.15, 1, 0.45, 1, 0.85][Math.min(5, Math.floor(t * 6))];
        g.setAttribute('opacity', (on * (t > 0.8 ? (1 - t) / 0.2 : 1)).toFixed(2));
      }).then(() => g.remove());
    }

    /* ---------- Construcción de los dioses ---------- */
    function buildGod(markup, s, extra) {
      const root = el('g', { style: 'display:none' }, godsG);
      root.innerHTML = markup;
      const qq = (sel) => root.querySelector(sel);
      return Object.assign({ root, q: qq, s, x: START_X + 200, prevX: START_X + 200, facing: 1, t: 0, ph: 0, on: false }, extra);
    }
    function showGod(g, x) { g.x = g.prevX = x; g.facing = 1; g.root.style.display = ''; g.on = true; }
    function hideGod(g) { g.root.style.display = 'none'; g.on = false; }
    function moveGod(g, x, ms, ez = ease.inOutSine) { const from = g.x; return tween(ms, (e) => { g.x = lerp(from, x, e); }, ez); }
    function turnGod(g, to) { const from = g.facing; return tween(280, (e, t) => { g.facing = lerp(from, to, ease.inOutSine(t)); }).then(() => { g.facing = to; }); }

    /* Cupido: niño regordete y alado con arco */
    const WING = 'M0,0 Q8,-32 32,-36 Q29,-28 37,-24 Q27,-19 33,-11 Q22,-9 25,-1 Q11,3 0,0Z';
    const CUPID_SVG = `
      <g class="wingB"><path d="${WING}" fill="${BK}" stroke="${B}" stroke-width="1.2"/></g>
      <path class="leg1" d="M-3,10 Q-6,22 -13,27" stroke="${B}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path class="leg2" d="M5,10 Q9,21 5,29" stroke="${B}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <line class="pull" x1="3" y1="-9" x2="-26" y2="-6" stroke="${B}" stroke-width="4.5" stroke-linecap="round"/>
      <ellipse rx="13" ry="15" fill="${B}"/>
      <circle cx="-3" cy="5" r="1.3" fill="${C}"/>
      <path d="M-11,-9 Q0,-2 11,8" stroke="${C}" stroke-width="2.2" fill="none"/>
      <circle cx="-5" cy="-23" r="11.5" fill="${B}"/>
      <path d="M-16,-25 Q-20,-21 -15,-18 Z" fill="${B}"/>
      <path d="M-13,-32 q2.5,-4.5 5,0 q2.5,-4.5 5,0 q2.5,-4.5 5,0" stroke="${C}" fill="none" stroke-width="1.3"/>
      <path d="M-13,-25 q2.2,-2.4 4.4,0" stroke="${C}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      <circle cx="-9" cy="-19.5" r="2.4" fill="${RED}"/>
      <path d="M-14,-15.5 q2,1.6 4,0" stroke="${C}" stroke-width="1.2" fill="none"/>
      <g class="nock"></g>
      <line x1="-4" y1="-4" x2="-28" y2="-6" stroke="${B}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-28,-30 Q-46,-6 -28,18" stroke="${B}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path class="string" stroke="${C}" stroke-width="1.3" fill="none"/>
      <circle class="hand" cx="-26" cy="-6" r="4" fill="${B}"/>
      <g class="wingF"><path d="${WING}" fill="${RED}" stroke="${B}" stroke-width="1.3"/>
        <path d="M5,-3 Q14,-18 28,-30 M6,-1 Q16,-10 30,-17 M6,0 Q15,-3 24,-4" stroke="${B}" fill="none" stroke-width="1"/></g>`;
    const cupid = buildGod(CUPID_SVG, 1.3, {
      baseY: 118, dy: 0, rot: 0, draw: 0, nock: 1, curY: 118,
      update(g) {
        const y = g.baseY + Math.sin(g.t * 3.2) * 7 + g.dy;
        g.curY = y;
        g.root.setAttribute('transform', `translate(${f1(g.x)},${f1(y)}) rotate(${f1(g.rot)}) scale(${(g.facing * g.s).toFixed(3)},${g.s})`);
        const flap = Math.sin(g.t * 22) * 16;
        g.wingF.setAttribute('transform', `translate(6,-6) rotate(${f1(flap)})`);
        g.wingB.setAttribute('transform', `translate(10,-10) rotate(${f1(flap * 0.8 - 10)})`);
        g.leg1.setAttribute('transform', `rotate(${f1(Math.sin(g.t * 6) * 14)} -3 10)`);
        g.leg2.setAttribute('transform', `rotate(${f1(-Math.sin(g.t * 6) * 12)} 5 10)`);
        const sx = lerp(-28, -6, g.draw);
        g.string.setAttribute('d', `M-28,-30 L${f1(sx)},-6 L-28,18`);
        g.hand.setAttribute('cx', f1(sx + 1)); g.pull.setAttribute('x2', f1(sx + 1));
        g.nockG.setAttribute('transform', `translate(${f1(sx - 40)},-6)`);
        g.nockG.setAttribute('opacity', g.nock);
      },
    });
    ['wingF', 'wingB', 'leg1', 'leg2', 'string', 'hand', 'pull'].forEach((k) => { cupid[k] = cupid.q('.' + k); });
    cupid.nockG = cupid.q('.nock'); arrowSVG(cupid.nockG);

    /* Medusa: túnica larga y cabellera de serpientes */
    const SNAKES = [[-9, -8, -42], [-2, -12, -14], [6, -11, 14], [11, -6, 42], [13, 1, 72], [11, 8, 102], [-12, -3, -72]];
    const zig = (x0, x1, ya, yb, st) => { const s = []; for (let x = x0, k = 0; x <= x1; x += st, k++) s.push(`${x},${k % 2 ? yb : ya}`); return s.join(' '); };
    const MEDUSA_SVG = `
      <g class="dress">
        <path d="M-15,-92 L15,-92 L25,0 L-29,0 Z" fill="${B}"/>
        <path d="M-7,-86 L-14,-16 M1,-86 L-1,-16 M9,-86 L13,-16" stroke="${C}" stroke-width="1.1" fill="none"/>
        <path d="M-28,-14 L24,-14 M-28.6,-3 L24.6,-3" stroke="${C}" stroke-width="1.4"/>
        <polyline points="${zig(-26, 22, -12, -5, 6)}" fill="none" stroke="${C}" stroke-width="1.2"/>
        <path d="M-15,-89 L15,-89" stroke="${RED}" stroke-width="3.5"/>
      </g>
      <path d="M-27,0 L-38,0 L-34,-5 L-27,-5 Z" fill="${B}"/>
      <path d="M-13,-91 L13,-91 L11,-122 Q0,-127 -12,-122 Z" fill="${B}"/>
      <path d="M-9,-117 Q0,-111 9,-117" stroke="${C}" stroke-width="1.1" fill="none"/>
      <rect x="-4" y="-131" width="8" height="11" fill="${B}"/>
      <g class="head">
        ${SNAKES.map(() => `<g class="snake"><path d="M0,0 Q5,-7 1,-14 Q-4,-21 2,-28" stroke="${B}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <ellipse cx="2.5" cy="-30" rx="4.2" ry="3" fill="${B}"/><circle cx="1" cy="-31" r=".9" fill="${C}"/>
          <path d="M2.5,-33 L1,-37.5 M2.5,-33 L4.5,-37" stroke="${RED}" stroke-width="1.1"/></g>`).join('')}
        <path d="M3,-8 Q16,-2 12,14 Q6,16 4,8 Z" fill="${B}"/>
        <circle r="13" fill="${B}"/>
        <path d="M-12,-5 L-17,2 L-11,3 Z" fill="${B}"/>
        <path d="M-13,7.5 q2,1.5 4,0" stroke="${RED}" stroke-width="1.8" fill="none"/>
        <circle class="glow" cx="-6" cy="-2" r="11" fill="${GLOW}" opacity="0"/>
        <ellipse class="eye" cx="-6" cy="-2" rx="4.2" ry="2.6" fill="${C}"/>
        <circle cx="-7.6" cy="-2" r="1.5" fill="${B}"/>
        <path d="M-11,-7 Q-6,-9.5 -1,-7" stroke="${C}" stroke-width="1.4" fill="none"/>
        <circle cx="2" cy="7" r="2.2" fill="${GOLD}"/>
      </g>
      <g class="arm"><polyline points="0,0 -5,20 -2,36" fill="none" stroke="${B}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="-2" cy="37" r="3.8" fill="${B}"/><path d="M-7,8 L3,8" stroke="${GOLD}" stroke-width="2"/></g>`;
    const medusa = buildGod(MEDUSA_SVG, 1.05, {
      armAng: 0, headTilt: 0, hiss: 0, glow: 0,
      update(g) {
        const mv = Math.abs(g.x - g.prevX) > 0.05; g.prevX = g.x;
        const bob = Math.sin(g.t * 2.2) * 1.5 - (mv ? Math.abs(Math.sin(g.t * 7)) * 2.5 : 0);
        g.root.setAttribute('transform', `translate(${f1(g.x)},${f1(GROUND + bob)}) scale(${(g.facing * g.s).toFixed(3)},${g.s})`);
        g.dress.setAttribute('transform', `skewX(${f1(Math.sin(g.t * 2) * 2 + (mv ? 4 : 0))})`);
        g.arm.setAttribute('transform', `translate(-4,-120) rotate(${f1(g.armAng)})`);
        g.head.setAttribute('transform', `translate(0,-141) rotate(${f1(g.headTilt)})`);
        g.snakes.forEach((sn, k) => {
          const [x, y, a] = SNAKES[k];
          sn.setAttribute('transform', `translate(${x},${y}) rotate(${f1(a + Math.sin(g.t * (4 + 9 * g.hiss) + k * 1.3) * (9 + 12 * g.hiss))})`);
        });
        g.glowEl.setAttribute('opacity', (g.glow * (0.7 + 0.3 * Math.sin(g.t * 30))).toFixed(2));
      },
    });
    medusa.dress = medusa.q('.dress'); medusa.arm = medusa.q('.arm'); medusa.head = medusa.q('.head');
    medusa.snakes = [...medusa.root.querySelectorAll('.snake')]; medusa.glowEl = medusa.q('.glow'); medusa.eyeEl = medusa.q('.eye');

    /* Zeus: barba, corona de laurel, manto rojo y rayo dorado */
    const ZEUS_SVG = `
      <path class="footB" d="M-2,0 L-13,0 L-10,-6 L-2,-6 Z" fill="${BK}"/>
      <g>
        <path d="M-18,-96 L18,-96 L27,0 L-26,0 Z" fill="${B}"/>
        <path d="M16,-92 Q-2,-66 -19,-24 M17,-74 Q4,-52 -11,-14" stroke="${C}" stroke-width="1.3" fill="none"/>
        <path d="M-25.5,-15 L26,-15 M-26,-4 L27,-4" stroke="${C}" stroke-width="1.4"/>
        ${[-21, -13, -5, 3, 11, 19].map((x) => `<rect x="${x}" y="-12" width="4" height="5" fill="${C}"/>`).join('')}
      </g>
      <path class="footF" d="M-4,0 L-17,0 L-13,-6 L-4,-6 Z" fill="${B}"/>
      <path d="M-18,-95 L18,-95 L20,-133 Q0,-141 -18,-133 Z" fill="${B}"/>
      <path d="M-12,-127 Q0,-117 12,-127" stroke="${C}" stroke-width="1.2" fill="none"/>
      <path d="M20,-133 Q29,-108 22,-84 L13,-90 L14,-128 Z" fill="${RED}" stroke="${B}" stroke-width="1.2"/>
      <g class="boltArm"><polyline points="0,0 5,20 3,38" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(3,40)"><circle class="aura" r="24" fill="${GLOW}" opacity="0"/>
          <polygon class="boltPoly" points="-3,-10 7,-10 2,2 9,2 -5,26 -1,8 -7,8" fill="${GOLD}" stroke="${B}" stroke-width="1.4" stroke-linejoin="round"/></g>
        <circle cx="3" cy="39" r="4.6" fill="${B}"/></g>
      <rect x="-5" y="-147" width="10" height="15" fill="${B}"/>
      <g class="head">
        <path d="M2,-12 Q19,-8 17,14 Q10,18 5,8 Z" fill="${B}"/>
        <circle r="14" fill="${B}"/>
        <path d="M-14,1 Q-19,22 -7,31 Q5,31 9,7 Z" fill="${B}"/>
        <path d="M-13,9 Q-15,16 -11,22 M-8,10 Q-10,18 -5,25 M-2,10 Q-3,17 1,22" stroke="${C}" stroke-width="1.1" fill="none"/>
        <path d="M-16,4 Q-10,7 -4,3" stroke="${C}" stroke-width="1.5" fill="none"/>
        <path d="M-13,-5 L-19,2 L-12,3 Z" fill="${B}"/>
        <path d="M-11,-4 q3,-2.6 6,0" stroke="${C}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
        <path d="M-13,-8.5 Q-8,-11.5 -3,-8.5" stroke="${C}" stroke-width="2.2" fill="none"/>
        ${[-160, -137, -114, -90, -66, -43, -20].map((a) => {
          const r = a * Math.PI / 180;
          return `<ellipse cx="${f1(Math.cos(r) * 15)}" cy="${f1(Math.sin(r) * 15)}" rx="4.5" ry="2" transform="rotate(${a + 90 + 30} ${f1(Math.cos(r) * 15)} ${f1(Math.sin(r) * 15)})" fill="${GOLD}" stroke="${B}" stroke-width=".5"/>`;
        }).join('')}
      </g>
      <g class="pointArm"><polyline points="0,0 -6,20 -4,38" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="-4" cy="39" r="4.6" fill="${B}"/></g>`;
    const zeus = buildGod(ZEUS_SVG, 1.3, {
      armAng: 0, pointAng: 0, headTilt: 0, hold: 1, aura: 0,
      update(g, dt) {
        const dx = g.x - g.prevX; g.prevX = g.x;
        g.ph += Math.abs(dx) / 80 * Math.PI * 2;
        const mv = Math.min(1, Math.abs(dx) / dt / 40), s = Math.sin(g.ph);
        const bob = -Math.abs(s) * 4 * mv + Math.sin(g.t * 1.8) * 1.2;
        g.root.setAttribute('transform', `translate(${f1(g.x)},${f1(GROUND + bob)}) scale(${(g.facing * g.s).toFixed(3)},${g.s})`);
        g.footF.setAttribute('transform', `translate(${f1(s * 7 * mv)},0)`);
        g.footB.setAttribute('transform', `translate(${f1(-s * 7 * mv)},0)`);
        g.boltArm.setAttribute('transform', `translate(11,-128) rotate(${f1(g.armAng + s * 8 * mv)})`);
        g.pointArm.setAttribute('transform', `translate(-10,-128) rotate(${f1(g.pointAng - s * 8 * mv)})`);
        g.head.setAttribute('transform', `translate(0,-153) rotate(${f1(g.headTilt)})`);
        g.boltPoly.setAttribute('opacity', g.hold);
        g.auraEl.setAttribute('opacity', (g.aura * (0.5 + 0.4 * Math.sin(g.t * 25))).toFixed(2));
      },
    });
    ['footF', 'footB', 'boltArm', 'pointArm', 'head', 'boltPoly'].forEach((k) => { zeus[k] = zeus.q('.' + k); });
    zeus.auraEl = zeus.q('.aura');
    const gods = [cupid, medusa, zeus];

    /* ---------- Acciones de los guerreros ---------- */
    async function walkIn(w, i, gait, pose = {}) {
      await wait([120, 0, 250, 330, 420][i]);
      Object.assign(w, { x: START_X + 20 + i * 8, facing: 1, look: 1, gait, amp: 0, lean: 0, headTilt: 0, wob: 0, armAng: -6, spearAng: 2,
        shieldDrop: 0, shieldRot: 0, jump: 0, frozen: false, tilt: 0 });
      w.prevX = w.x;
      await tw(w, { amp: 1, ...pose }, 250);
      await moveTo(w, TEAM_X[i], (w.x - TEAM_X[i]) / 0.16, decel);
      await tw(w, { amp: 0 }, 220);
    }
    // Pipo corre al muro, derrapa y le da dos cabezazos ("toc, toc")
    async function pipoToWall(p) {
      p.gait = RUN; tw(p, { amp: 1, lean: -12, headTilt: -4 }, 150);
      await moveTo(p, 652, (p.x - 652) / 0.42, ease.charge);
      tw(p, { amp: 0 }, 160); skid(p.x);
      await tw(p, { lean: 12, headTilt: 6 }, 140, ease.outQuad);
      await tw(p, { lean: 0, headTilt: 0 }, 200);
      for (let k = 0; k < 2; k++) {
        await tw(p, { lean: -36, headTilt: -10 }, 120, (t) => t * t);
        p.crestV += 220; p.sq = 0.4; shake = Math.max(shake, 1.5);
        spawnDust(WALL_RIGHT + 3, GROUND - 112, 40, -20, 3, 0.4);
        await tw(p, { lean: -6, headTilt: 0 }, 170, ease.outQuad);
      }
      await tw(p, { lean: 0 }, 120);
    }
    function petrify(p) {
      p.frozen = true; p.tilt = 0;
      p.root.setAttribute('filter', `url(#${pre}stone)`);
      for (let i = 0; i < 10; i++) spawnDust(p.x + rand(-20, 20), GROUND - rand(10, 140), rand(-40, 40), rand(-40, 0), rand(3, 7), rand(0.5, 0.9));
      tween(700, (e, t) => { p.tilt = Math.sin(t * Math.PI * 5) * 4 * (1 - t); });
    }
    function unpetrify(p) { p.frozen = false; p.tilt = 0; p.root.removeAttribute('filter'); }
    function removePipoArrow() { const p = warriors[2]; if (p.arrow) { p.arrow.remove(); p.arrow = null; } }
    function restoreOrder() { for (let i = warriors.length - 1; i >= 0; i--) armyG.appendChild(warriors[i].root); }

    /* ================== ESCENA 1: CUPIDO ================== */
    async function shoot(tx, ty, arc = 22) {
      await tween(360, (e) => { cupid.draw = e; }, ease.outQuad);
      await wait(140);
      const x1 = cupid.x - 50 * cupid.s, y1 = cupid.curY - 6 * cupid.s;
      cupid.draw = 0; cupid.nock = 0;
      tween(300, (e, t) => { cupid.rot = 8 * Math.sin(Math.PI * t); });
      wait(450).then(() => { cupid.nock = 1; });
      return flyArrow(x1, y1, tx, ty, arc);
    }
    async function sceneCupid() {
      removePipoArrow();
      showGod(cupid, START_X + 80); Object.assign(cupid, { dy: 0, rot: 0, draw: 0, nock: 1 });
      await Promise.all([...warriors.map((w, i) => walkIn(w, i, MARCH, { lean: 4, headTilt: 6 })),
        moveGod(cupid, 830, 2300, decel)]);
      const p = warriors[2];
      await pipoToWall(p);
      await turn(p, -1);
      say(p.x, 104, '¡Dispara!', 1500);
      await Promise.all([tw(p, { armAng: -110, spearAng: 30, headTilt: 8 }, 220), hop(p, 14, 260).then(() => hop(p, 12, 240))]);
      await wait(150);
      await turn(p, 1);
      tw(p, { armAng: 0, spearAng: 0, headTilt: -14, lean: -10, shieldDrop: -10 }, 300); // se agacha, de espaldas a Cupido
      // Dos flechas al muro: corazones y una grieta
      let a = await shoot(612, 108);
      cracksG.appendChild(a); hearts(606, 108, 6); crack(); shake = 4;
      a = await shoot(612, 146);
      cracksG.appendChild(a); hearts(606, 146, 6); shake = 4;
      await wait(300);
      // La tercera… ¡en el trasero de Pipo!
      a = await shoot(p.x + 8, GROUND - p.c.hipY + 4, 10);
      a.remove();
      p.arrow = arrowSVG(p.root);
      p.arrow.setAttribute('transform', `translate(4,${f1(-p.c.hipY + 8)}) rotate(-28) scale(.85)`);
      hearts(p.x, GROUND - 160, 8);
      say(p.x, 104, '¡Ay!', 900);
      await Promise.all([hop(p, 42, 480), tw(p, { headTilt: 14, lean: 6, shieldDrop: 0 }, 200)]);
      // Pipo se enamora del muro y lo abraza
      heartTrail(() => [p.x - 8, GROUND - 168], 2600, 0.14);
      p.gait = SAD; await tw(p, { amp: 0.7 }, 150);
      await moveTo(p, 640, 420);
      tw(p, { amp: 0 }, 150);
      await tw(p, { lean: -18, headTilt: 14, shieldDrop: 12, shieldRot: 30 }, 500);
      await wait(800);
      // Cupido se encoge de hombros y se va volando
      tween(500, (e, t) => { cupid.rot = Math.sin(t * Math.PI * 3) * 10; });
      const leave = (async () => {
        await wait(400); await turnGod(cupid, -1);
        await tween(1700, (e) => { cupid.x = lerp(830, START_X + 120, e); cupid.dy = lerp(0, -55, e); }, ease.inOutSine);
        hideGod(cupid);
      })();
      await wait(500);
      const outs = [0, 1, 3, 4].map((i) => retreat(warriors[i], i));
      const pOut = (async () => { // Pipo se va el último, sin dejar de mirar al muro
        await wait(1400);
        await tw(p, { lean: 0, shieldRot: 0 }, 200);
        await turn(p, -1);
        p.gait = SAD; tw(p, { amp: 1, look: -1, headTilt: 10, shieldDrop: 8 }, 300);
        heartTrail(() => [p.x, GROUND - 168], 2600, 0.2);
        await moveTo(p, START_X + 80, 2900, ease.walk);
        p.amp = 0; p.look = 1;
      })();
      await Promise.all([leave, pOut, ...outs]);
    }

    /* ================== ESCENA 2: MEDUSA ================== */
    function gaze(ms) {
      const g = el('g', {}, fxG);
      const cone = el('polygon', { fill: GLOW, opacity: 0 }, g);
      const waves = [0, 1, 2, 3].map(() => el('path', { fill: 'none', stroke: GLOW, 'stroke-width': 6, 'stroke-linecap': 'round' }, g));
      return tween(ms, (e, t) => {
        const eye = centerOf(medusa.eyeEl);
        const x2 = WALL_RIGHT - 2, yt = WALL.y + 18, yb = GROUND - 6;
        cone.setAttribute('points', `${f1(eye.x)},${f1(eye.y)} ${x2},${yt} ${x2},${yb}`);
        const fade = Math.min(1, t / 0.15, (1 - t) / 0.15);
        cone.setAttribute('opacity', (0.5 * fade * (0.8 + 0.2 * Math.sin(t * 60))).toFixed(2));
        waves.forEach((w, k) => {
          const qq = (t * 3 + k / 4) % 1, x = lerp(eye.x, x2, qq), cy = lerp(eye.y, (yt + yb) / 2, qq), h = lerp(6, yb - yt, qq) / 2;
          w.setAttribute('d', `M${f1(x + 6 * qq)},${f1(cy - h)} Q${f1(x - 16 * qq)},${f1(cy)} ${f1(x + 6 * qq)},${f1(cy + h)}`);
          w.setAttribute('opacity', (fade * (1 - qq * 0.6)).toFixed(2));
        });
        medusa.glow = fade;
      }).then(() => { g.remove(); medusa.glow = 0; });
    }
    async function fetchStatue(w, x, delay) {
      await wait(delay);
      w.gait = MARCH; await tw(w, { amp: 1, headTilt: -6 }, 200);
      await moveTo(w, x, Math.abs(w.x - x) / 0.17);
      await tw(w, { amp: 0 }, 200);
    }
    async function sceneMedusa() {
      removePipoArrow();
      showGod(medusa, START_X + 60); Object.assign(medusa, { armAng: 0, headTilt: 0, hiss: 0, glow: 0 });
      const noMirar = { headTilt: -24, shieldDrop: -30, shieldRot: -10, lean: 4 }; // ¡nadie la mira!
      await Promise.all([...warriors.map((w, i) => walkIn(w, i, MARCH, i === 2 ? { headTilt: 4 } : noMirar)),
        moveGod(medusa, 830, 2600, decel)]);
      const p = warriors[2];
      await pipoToWall(p);
      await turn(p, -1);
      say(p.x, 104, '¡Ahora!', 1200);
      await Promise.all([tw(p, { armAng: -110, spearAng: 30, headTilt: 8 }, 220), hop(p, 14, 260)]);
      // Medusa usa su poder… y Pipo está en medio
      medusa.hiss = 1;
      await tw(medusa, { armAng: 95, headTilt: -4 }, 350);
      const g = gaze(1600);
      await wait(330);
      petrify(p);
      await wait(450);
      wallHit(false);
      await g;
      tw(medusa, { armAng: 0, headTilt: 6 }, 300);
      medusa.hiss = 0.7; await wait(700); medusa.hiss = 0; // las serpientes se ríen
      await turnGod(medusa, -1);
      await moveGod(medusa, START_X + 100, 1800);
      hideGod(medusa);
      // Levantan la vista… y descubren a Pipo
      [0, 1, 3, 4].forEach((i) => tw(warriors[i], { headTilt: 0, shieldDrop: 0, shieldRot: 0, lean: 0 }, 400));
      await wait(450);
      const L = warriors[0], T = warriors[1], D = warriors[4];
      say(L.x, 62, '¡Pipo!', 1100);
      tw(L, { headTilt: -30 }, 300).then(() => tween(800, (e, t) => { L.wob = Math.sin(t * Math.PI * 4) * 8 * (1 - t); }));
      await Promise.all([fetchStatue(T, p.x + 46, 300), fetchStatue(D, p.x + 104, 450)]);
      // Se lo llevan a rastras
      await Promise.all([turn(T, -1), turn(D, -1)]);
      [T, D].forEach((w) => tw(w, { armAng: -85, spearAng: 85, lean: -18, headTilt: -8 }, 250));
      await tw(p, { tilt: 16 }, 300);
      const outs = [0, 3].map((i) => retreat(warriors[i], i));
      [T, D].forEach((w) => { w.gait = SAD; tw(w, { amp: 0.9 }, 200); });
      let acc = 0, dragging = true;
      addFx((dt) => { if (!dragging) return false; acc += dt; if (acc > 0.12) { acc = 0; spawnDust(p.x - 6, GROUND - 3, rand(-30, 10), rand(-30, -5), rand(2, 4), 0.5); } return true; });
      const tug = (t) => t - Math.sin(t * Math.PI * 10) / (Math.PI * 10); // tirones
      const dist = START_X + 160 - p.x, tx0 = T.x, dx0 = D.x, px0 = p.x;
      await Promise.all([...outs, tween(3600, (e) => {
        p.x = px0 + dist * e; T.x = tx0 + dist * e; D.x = dx0 + dist * e;
      }, tug)]);
      dragging = false;
      [T, D].forEach((w) => { w.amp = 0; });
    }

    /* ================== ESCENA 3: ZEUS ================== */
    async function sceneZeus() {
      const p = warriors[2], D = warriors[4], L = warriors[0];
      unpetrify(p); removePipoArrow();
      showGod(zeus, START_X + 80); Object.assign(zeus, { armAng: 0, pointAng: 0, headTilt: 0, hold: 1, aura: 0 });
      tween(1200, (e) => skyEl.setAttribute('opacity', (0.38 * e).toFixed(2)));
      shake = reduceMotion ? 0 : 3;
      await Promise.all([...warriors.map((w, i) => walkIn(w, i, MARCH, { lean: 5, headTilt: 8 })),
        moveGod(zeus, 840, 2800, decel)]);
      // Pipo arranca hacia el muro… y se arrepiente
      p.gait = RUN; tw(p, { amp: 1, lean: -12 }, 150);
      await moveTo(p, 745, 420, ease.charge);
      tw(p, { amp: 0 }, 120); skid(p.x);
      await tw(p, { lean: 14, headTilt: 6 }, 150, ease.outQuad);
      await tw(p, { look: -1, headTilt: 4, lean: 4 }, 220);
      say(p.x, 104, '¡Mejor no!', 1200);
      await tween(600, (e, t) => { p.wob = Math.sin(t * Math.PI * 10) * 7; });
      p.wob = 0; p.look = 1;
      await turn(p, -1);
      p.gait = RUN; tw(p, { amp: 1, lean: -14, headTilt: -6 }, 120);
      await moveTo(p, D.x + 32, Math.abs(D.x + 32 - p.x) / 0.5, ease.inOutSine);
      tw(p, { amp: 0 }, 120);
      armyG.appendChild(D.root); // se esconde detrás del grandote
      await turn(p, 1);
      tw(p, { lean: -12, headTilt: -20, shieldDrop: -34, shieldRot: -15 }, 250);
      let shiver = true;
      addFx(() => { if (!shiver) { p.wob = 0; return false; } p.wob = Math.sin(performance.now() / 30) * 4; return true; });
      // El capitán le pide a Zeus que actúe
      await tw(L, { armAng: 105, spearAng: -60, headTilt: 6 }, 300);
      say(L.x, 62, '¡Adelante, Zeus!', 1500);
      await wait(600);
      // Zeus carga el rayo
      await tw(zeus, { armAng: -125, pointAng: 40, headTilt: -4 }, 600, ease.outQuad);
      tw(zeus, { aura: 1 }, 300);
      sparks(zeus.boltPoly, 1000);
      tween(1000, () => skyEl.setAttribute('opacity', (Math.random() < 0.15 ? 0.58 : 0.38).toFixed(2)));
      await wait(1000);
      // ¡Lanza!
      await tw(zeus, { armAng: -150 }, 160, ease.outQuad);
      await tw(zeus, { armAng: 70, headTilt: 4 }, 130, (t) => t * t);
      const st = centerOf(zeus.boltPoly);
      zeus.hold = 0; zeus.aura = 0;
      lightning(st.x, st.y, 588, 168);
      tween(650, (e) => flashEl.setAttribute('opacity', (0.6 * (1 - e)).toFixed(2)), ease.outQuad);
      wallHit(true); shake = reduceMotion ? 0 : 14;
      tw(L, { armAng: 0, spearAng: 0 }, 300);
      await wait(500);
      tween(1000, (e) => skyEl.setAttribute('opacity', (0.38 * (1 - e)).toFixed(2)));
      await tw(zeus, { armAng: 10, pointAng: 0, headTilt: 0 }, 500);
      // Pipo se asoma… ¡y celebra con todos!
      shiver = false; await wait(80);
      await tw(p, { shieldDrop: 0, shieldRot: 0, lean: 0, headTilt: 0, look: -1 }, 300);
      await wait(250); p.look = 1;
      restoreOrder();
      tw(zeus, { headTilt: 12 }, 250).then(() => tw(zeus, { headTilt: 0 }, 300));
      await Promise.all(warriors.map((w, i) => celebrate(w, i)));
      const zOut = (async () => { await wait(700); await turnGod(zeus, -1); zeus.hold = 1; await moveGod(zeus, START_X + 120, 2800); hideGod(zeus); })();
      await Promise.all([zOut, ...warriors.map((w, i) => marchOff(w, i))]);
    }

    /* ================== BUCLE ================== */
    let last = performance.now();
    function loop(now) {
      if (!vivo) return;
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000)); last = now;
      for (const d of debris) {
        if (d.delay > 0) { d.delay -= dt; continue; }
        if (!d.resting) {
          d.vy += 1500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
          if (d.x < LEFT_LIMIT + d.w / 2) { d.x = LEFT_LIMIT + d.w / 2; d.vx = -d.vx * 0.3; }
          const floor = GROUND - d.h / 2;
          if (d.y > floor) {
            d.y = floor; d.vy = -d.vy * 0.25; d.vx *= 0.5; d.vr *= 0.4;
            if (Math.abs(d.vy) < 40) { d.vy = 0; d.resting = true; }
          }
        } else { d.vx *= 0.85; d.x += d.vx * dt; }
        d.g.setAttribute('transform', `translate(${f1(d.x)},${f1(d.y)}) rotate(${f1(d.rot)})`);
      }
      dust = dust.filter((p) => {
        p.life += dt;
        if (p.life > p.max) { p.c.remove(); return false; }
        p.vx *= 0.94; p.vy *= 0.94; p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = p.life / p.max;
        p.c.setAttribute('cx', f1(p.x)); p.c.setAttribute('cy', f1(p.y));
        p.c.setAttribute('r', f1(p.r * (1 + k))); p.c.setAttribute('opacity', (0.75 * (1 - k)).toFixed(2));
        return true;
      });
      const cur = fxItems; fxItems = [];
      fxItems = cur.filter((f) => f(dt)).concat(fxItems);
      shake = Math.max(0, shake - dt * 28);
      wallG.setAttribute('transform', `translate(${shake ? f1(rand(-shake, shake)) : 0},0)`);
      warriors.forEach((w) => updateWarrior(w, dt, spawnDust));
      gods.forEach((g) => { if (g.on) { g.t += dt; g.update(g, dt); } });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    /* ================== SECUENCIA ================== */
    // Un intento completo: los hoplitas solos, o la escena del dios que corresponde (Cupido, Medusa, Zeus)
    async function attack() {
      hits++;
      if (dioses) {
        if (hits >= HITS) await sceneZeus();
        else if (hits === 1) await sceneCupid();
        else await sceneMedusa();
        return;
      }
      const final = hits >= HITS;
      await Promise.all(warriors.map((w, i) => charge(w, i, final)));
      if (final) {
        await wait(150);
        await Promise.all(warriors.map((w, i) => celebrate(w, i)));
        await Promise.all(warriors.map((w, i) => marchOff(w, i)));
      } else {
        await wait(200);
        stars(warriors[0], 1500);
        await Promise.all(warriors.map((w, i) => retreat(w, i)));
      }
    }

    // Esperando la lectura: la palabra late
    function listo() {
      svg.classList.add('esperando');
      alListo(hits);
      if (pendiente) {
        pendiente = false;
        const g = gen;
        setTimeout(() => { if (g === gen && vivo) leer(); }, 250);
      }
    }

    async function intento() {
      const g = gen;
      busy = true;
      svg.classList.remove('esperando');
      alCorrer();
      await attack();
      busy = false;
      if (g !== gen || !vivo) return;
      if (hits >= HITS) {
        alRomper();
        await wait(600);
        if (g === gen && vivo) alTerminar();
        return;
      }
      listo();
    }

    function leer() {
      if (hits >= HITS) return;
      if (busy) { pendiente = true; return; }
      intento();
    }

    function reiniciar() {
      gen++;
      hits = 0; busy = false; pendiente = false;
      fxG.innerHTML = ''; dust = []; fxItems = [];
      gods.forEach(hideGod);
      skyEl.setAttribute('opacity', 0); flashEl.setAttribute('opacity', 0);
      unpetrify(warriors[2]); removePipoArrow(); restoreOrder();
      warriors.forEach((w) => Object.assign(w, { x: START_X + 300, prevX: START_X + 300, amp: 0, facing: 1, look: 1, wob: 0 }));
      buildWall();
    }

    return {
      // silabas se ignora (misma firma que Muro); se usa el texto de la palabra
      palabra(silabas, { texto = (silabas || []).join(''), dioses: conDioses = false } = {}) {
        palabraTexto = texto;
        dioses = conDioses;
        reiniciar();
        fitWord();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (vivo) fitWord(); });
        listo();
      },
      leer,
      destruir() { vivo = false; gen++; },
    };
  }

  global.MuroGriego = { crear };
})(window);
