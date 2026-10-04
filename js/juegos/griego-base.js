// Base común del estilo griego (cerámica de figuras negras sobre terracota): utilidades de
// animación y los cinco hoplitas. Viene de Antecedentes/derriba-el-muro*.html, sin cambios de
// estilo ni de tiempos. La usan js/juegos/muro-griego.js y js/juegos/escalera-griega.js.
(function (global) {
  'use strict';

  /* ================== UTILIDADES ================== */
  const NS = 'http://www.w3.org/2000/svg';
  const GROUND = 262;
  const B = '#1E1410', C = '#F3DDB3', RED = '#A8321F', BK = '#3A2A1F';
  const STONES = ['#E9C893', '#E2BC82', '#EDD3A2', '#DDB577'];
  const STAR = 'M0,-5 L1.5,-1.5 L5,-1.5 L2.2,0.8 L3.2,4.5 L0,2.3 L-3.2,4.5 L-2.2,0.8 L-5,-1.5 L-1.5,-1.5Z';
  const reduceMotion = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = (v) => v.toFixed(1);
  const ease = {
    charge: (t) => 0.25 * t + 0.75 * t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    walk: (t) => 0.2 * t * t + 0.8 * t,
  };
  function tween(ms, fn, ez = (t) => t) {
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        fn(ez(t), t);
        if (t < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Fondo de jarrón: terracota con grecas arriba y abajo (ids únicos por instancia)
  function fondo(pre, ancho, alto, conSuelo = true) {
    return `
      <defs>
        <radialGradient id="${pre}clay" cx="50%" cy="45%" r="75%">
          <stop offset="0" stop-color="#D9773D"/><stop offset="1" stop-color="#BF5A28"/>
        </radialGradient>
        <pattern id="${pre}meander" width="24" height="22" patternUnits="userSpaceOnUse">
          <rect width="24" height="22" fill="#C35E2B"/>
          <path d="M0 19 H24 M20 19 V3 H5 V14 H15 V8 H11" fill="none" stroke="#1E1410" stroke-width="2.6"/>
        </pattern>
        <filter id="${pre}stone" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="0.11 0.11 0.11 0 0.40  0.11 0.11 0.11 0 0.37  0.11 0.11 0.11 0 0.33  0 0 0 1 0"/>
        </filter>
      </defs>
      <rect width="${ancho}" height="${alto}" fill="url(#${pre}clay)"/>
      <rect class="cielo" width="${ancho}" height="${alto}" fill="${B}" opacity="0"/>
      <rect y="0" width="${ancho}" height="22" fill="url(#${pre}meander)"/>
      <rect y="22" width="${ancho}" height="3" fill="${B}"/>
      ${conSuelo ? `
      <rect y="${alto - 34}" width="${ancho}" height="5" fill="${B}"/>
      <rect y="${alto - 29}" width="${ancho}" height="3" fill="#C35E2B"/>
      <rect y="${alto - 26}" width="${ancho}" height="2" fill="${B}"/>
      <rect y="${alto - 24}" width="${ancho}" height="22" fill="url(#${pre}meander)" transform="translate(0,${2 * alto - 26}) scale(1,-1)"/>
      <rect y="${alto - 2}" width="${ancho}" height="2" fill="${B}"/>` : ''}`;
  }

  /* ================== PERSONAJES ================== */
  /* Cinco hoplitas con proporciones y carácter propios, mismo estilo de figuras negras. */
  const CHARS = [
    { name: 'Leandro, el capitán', T: 34, S: 34, H: 44, W: 24, hs: 1.00, R: 28, crest: 'big', crestCol: RED, emblem: 0, spear: 1.0, stride: 150, hunch: 0, bounce: 1.0 },
    { name: 'Teo, el larguirucho', T: 44, S: 44, H: 48, W: 19, hs: 0.92, R: 25, crest: 'long', crestCol: B, emblem: 3, spear: 1.15, stride: 195, hunch: -3, bounce: 0.8 },
    { name: 'Pipo, el pequeño', T: 21, S: 21, H: 32, W: 20, hs: 1.06, R: 21, crest: 'tall', crestCol: RED, emblem: 2, spear: 0.8, stride: 80, hunch: 0, bounce: 1.4 },
    { name: 'Néstor, el veterano', T: 30, S: 31, H: 41, W: 24, hs: 1.00, R: 27, crest: 'droop', crestCol: B, emblem: 4, spear: 1.0, stride: 120, hunch: -9, bounce: 0.9, beard: 1, limp: 1 },
    { name: 'Dimas, el grandote', T: 25, S: 25, H: 44, W: 30, hs: 1.08, R: 31, crest: 'short', crestCol: RED, emblem: 1, spear: 0.95, stride: 105, hunch: 0, bounce: 1.5, belly: 1, waddle: 1 },
  ];
  CHARS.forEach((c) => { c.hipY = (c.T + c.S) * 0.97; c.scx = -c.W * 0.45 - c.R * 0.3; c.scy = -c.H * 0.55; });

  const EMBLEMS = [
    `<circle r="5" fill="${C}"/><g stroke="${C}" stroke-width="1.6">` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line y1="-8" y2="-12" transform="rotate(${a})"/>`).join('') + '</g>',
    `<path d="M3,-9 A9.5,9.5 0 1,0 3,9 A7,7 0 1,1 3,-9 Z" fill="${C}"/>`,
    `<circle cy="-6" r="3" fill="${C}"/><circle cx="-5.5" cy="4" r="3" fill="${C}"/><circle cx="5.5" cy="4" r="3" fill="${C}"/>`,
    `<path d="M-10,4 L-5,-5 L0,4 L5,-5 L10,4" fill="none" stroke="${C}" stroke-width="2.4" stroke-linejoin="round"/>`,
    `<circle r="7" fill="none" stroke="${C}" stroke-width="2"/><circle r="2.8" fill="${C}"/>`,
  ];
  const CRESTS = {
    big: 'M-12,-28 Q4,-53 30,-32 Q34,-22 27,-9 Q22,-28 6,-33 Q-4,-34 -12,-28 Z',
    long: 'M-10,-28 Q6,-50 42,-30 Q48,-20 41,-5 Q30,-26 8,-33 Q-2,-34 -10,-28 Z',
    tall: 'M-8,-29 Q0,-62 22,-41 Q27,-31 22,-18 Q16,-34 6,-34 Q-2,-34 -8,-29 Z',
    droop: 'M-10,-28 Q8,-44 26,-26 Q30,-14 24,1 Q18,-22 6,-32 Q-2,-34 -10,-28 Z',
    short: 'M-8,-27 Q4,-42 20,-30 Q22,-22 18,-16 Q14,-28 4,-31 Q-2,-31 -8,-27 Z',
  };

  function legSVG(T, S, wf, fill) {
    const a = 6.5 * wf, b = 5 * wf, c = 4.6 * wf;
    return `<path d="M${-a},-3 L${a},-3 L${b},${T} L${-b},${T} Z" fill="${fill}" stroke="${C}" stroke-width=".7"/>
      <g class="shin"><circle r="${b + 0.4}" fill="${fill}"/>
        <path d="M${-b},0 L${b},0 L${c},${S - 7} L${-c},${S - 7} Z" fill="${fill}" stroke="${C}" stroke-width=".7"/>
        <path d="M${-c},${S - 8} L${c},${S - 8} L${c},${S} L-17,${S} L-15,${S - 4} Z" fill="${fill}"/>
        <path d="M${-c + 1},${S * 0.35} Q0,${S * 0.42} ${c - 1},${S * 0.35}" stroke="${C}" stroke-width="1.1" fill="none"/>
      </g>`;
  }

  // x0: posición inicial. El dibujo mira hacia la izquierda (facing = 1).
  function buildWarrior(c, idx, parent, x0) {
    const wf = c.belly ? 1.35 : (c.W < 20 ? 0.85 : 1);
    const hw = c.W / 2, H = c.H, L = 150 * c.spear;
    const pleats = [-0.7, -0.25, 0.2, 0.65].map((k) => `M${f1(k * hw * 2)},-2 L${f1(k * hw * 2.2)},12`).join(' ');
    const strand = c.crestCol === B ? C : B;
    const root = el('g', {}, parent);
    root.innerHTML = `
    <g class="body">
      <g class="legB">${legSVG(c.T, c.S, wf, BK)}</g>
      <g class="torso">
        <g class="arm">
          <polyline points="0,0 7,14 -1,25" fill="none" stroke="${B}" stroke-width="${6 * wf}" stroke-linecap="round" stroke-linejoin="round"/>
          <g class="spear">
            <line y1="${f1(0.35 * L)}" y2="${f1(-0.65 * L)}" stroke="${B}" stroke-width="3.2" stroke-linecap="round"/>
            <path d="M-4.5,${f1(-0.65 * L + 2)} L0,${f1(-0.65 * L - 18)} L4.5,${f1(-0.65 * L + 2)} Z" fill="${B}"/>
          </g>
          <circle cx="-1" cy="25" r="${4.2 * wf}" fill="${B}"/>
        </g>
        <path d="M${-hw * 0.85},2 L${hw * 0.85},2 L${hw * 1.05},${-H} Q0,${-H - 6} ${-hw * 0.95},${-H} Z" fill="${B}"/>
        ${c.belly ? `<g class="belly"><ellipse cx="${-hw * 0.5}" cy="${-H * 0.36}" rx="${hw * 0.95}" ry="${H * 0.33}" fill="${B}"/>
          <path d="M${-hw * 1.2},${-H * 0.5} Q${-hw * 1.5},${-H * 0.3} ${-hw * 1.1},${-H * 0.1}" fill="none" stroke="${C}" stroke-width="1.1"/></g>` : ''}
        <path d="M${-hw * 0.6},${-H * 0.82} Q${hw * 0.1},${-H * 0.62} ${hw * 0.8},${-H * 0.8}" fill="none" stroke="${C}" stroke-width="1.2"/>
        <rect x="-3" y="${-H - 5}" width="9" height="9" fill="${B}"/>
        <g class="head">
          ${c.beard ? `<path d="M-15,0 Q-20,14 -9,20 Q-1,20 3,6 L-6,3 Z" fill="${B}"/>
            <path d="M-13,6 Q-15,11 -11,16 M-8,7 Q-10,12 -6,17" fill="none" stroke="${C}" stroke-width="1"/>` : ''}
          <path d="M-15,4 L-17,-10 Q-16,-26 0,-27 Q15,-26 15,-10 L14,2 Q10,10 4,6 L2,-4 L-6,-4 L-7,6 Z" fill="${B}" stroke="${C}" stroke-width=".6"/>
          <path d="M-15,-12 Q-10,-15 -4,-12" fill="none" stroke="${C}" stroke-width="2.2"/>
          <circle cx="-10.5" cy="-12.6" r="1.5" fill="${B}"/>
          <rect x="0" y="-32" width="4" height="6" fill="${B}"/>
          <g class="crest">
            <path d="${CRESTS[c.crest]}" fill="${c.crestCol}" stroke="${B}" stroke-width="1.2"/>
            <path d="M-4,-35 Q9,-43 23,-30 M0,-38 Q12,-44 27,-25" fill="none" stroke="${strand}" stroke-width=".8" opacity=".6"/>
          </g>
        </g>
      </g>
      <g class="legF">${legSVG(c.T, c.S, wf, B)}</g>
      <g class="skirt">
        <path d="M${-hw * 1.15},14 L${hw * 1.15},14 L${hw * 0.95},-6 L${-hw * 0.95},-6 Z" fill="${B}" stroke="${C}" stroke-width=".7"/>
        <path d="M${-hw * 0.95},-4 L${hw * 0.95},-4 ${pleats}" stroke="${C}" stroke-width="1.1"/>
      </g>
      <g class="shield"><g transform="translate(${f1(c.scx)},${f1(c.scy)})">
        <circle r="${c.R}" fill="${B}" stroke="${C}" stroke-width="2"/>
        <circle r="${f1(c.R * 0.78)}" fill="none" stroke="${C}" stroke-width="1"/>
        <g transform="scale(${f1(c.R / 27)})">${EMBLEMS[c.emblem]}</g>
      </g></g>
    </g>`;
    const q = (s) => root.querySelector(s);
    return {
      c, idx, root, body: q('.body'), legB: q('.legB'), legF: q('.legF'),
      shinB: q('.legB .shin'), shinF: q('.legF .shin'), torso: q('.torso'), arm: q('.arm'),
      spearG: q('.spear'), head: q('.head'), crestG: q('.crest'), skirt: q('.skirt'),
      shield: q('.shield'), bellyG: q('.belly'),
      // estado animable
      x: x0, prevX: x0, facing: 1, look: 1, ph: rand(0, 6), amp: 0, gait: null,
      lean: 0, headTilt: 0, wob: 0, armAng: 0, spearAng: 0, shieldDrop: 0, shieldRot: 0, jump: 0,
      // muelles (movimiento secundario)
      sq: 0, sqV: 0, push: 0, pushV: 0, crest: 0, crestV: 0, belly: 0, bellyV: 0,
      by: 0, byV: 0, t: rand(0, 10), lastStep: 0,
      // agregados para la app: suelo propio y escala (1 = tamaño original)
      suelo: GROUND, escala: 1,
    };
  }

  /* Andares: correr, caminar derrotado, marchar orgulloso */
  const RUN = { thigh: 42, knee0: 12, knee: 72, bob: 6, arm: 20, waddle: 4, sm: 1, dust: true };
  const SAD = { thigh: 15, knee0: 6, knee: 22, bob: 1.8, arm: 5, waddle: 6, sm: 0.42 };
  const MARCH = { thigh: 30, knee0: 8, knee: 42, bob: 5, arm: 12, waddle: 4, sm: 0.62 };

  // polvo(x, y, vx, vy, r, max): genera polvo al pisar corriendo (opcional)
  function updateWarrior(w, dt, polvo) {
    const e = w.escala;
    if (w.frozen) { // petrificado: queda como estatua, solo se mueve (o lo arrastran)
      w.root.setAttribute('transform', `translate(${f1(w.x)},${f1(w.suelo - w.jump)}) rotate(${f1(w.tilt || 0)}) scale(${w.facing * e},${e})`);
      w.prevX = w.x;
      return;
    }
    const c = w.c, g = w.gait;
    w.t += dt;
    const dx = (w.x - w.prevX) / e; w.prevX = w.x;
    const vx = dx / dt;
    w.ph += Math.abs(dx) / (c.stride * g.sm) * Math.PI * 2;

    // muelles: squash & stretch, empujones, cresta y barriga con inercia
    w.sqV += (-320 * w.sq - 15 * w.sqV) * dt; w.sq += w.sqV * dt;
    w.pushV += (-220 * w.push - 14 * w.pushV) * dt; w.push += w.pushV * dt;

    const a = w.amp, ph = w.ph, s = Math.sin(ph), co = Math.cos(ph);
    const limp = c.limp && g !== RUN;
    let bob = -a * g.bob * c.bounce * Math.abs(co);
    if (limp) bob += a * 3.5 * Math.max(0, -s);
    const breath = Math.sin(w.t * 2.4 + w.idx * 1.7) * 1.3 * (1 - a);
    const by = bob - w.jump;
    const byV = (by - w.by) / dt, byA = (byV - w.byV) / dt;
    w.by = by; w.byV = byV;

    const fwd = -vx * Math.sign(w.facing || 1);
    const crestT = clamp(fwd * 0.03, -8, 26) + clamp(-byV * 0.04, -12, 12);
    w.crestV += (120 * (crestT - w.crest) - 9 * w.crestV) * dt; w.crest += w.crestV * dt;
    w.bellyV += (-260 * w.belly - 10 * w.bellyV + clamp(-byA * 0.012, -400, 400)) * dt;
    w.belly = clamp(w.belly + w.bellyV * dt, -5, 5);

    // polvo de las pisadas al correr
    if (g.dust && a > 0.6 && polvo) {
      const step = Math.floor(ph / Math.PI);
      if (step !== w.lastStep) {
        w.lastStep = step;
        polvo(w.x + w.push + 6, w.suelo - 2, rand(30, 80), rand(-30, -10), rand(2, 4), rand(0.3, 0.5));
      }
    }

    // pose
    let kneeF = -a * (g.knee0 + g.knee * Math.pow(Math.max(0, co), 1.4));
    let kneeB = -a * (g.knee0 + g.knee * Math.pow(Math.max(0, -co), 1.4));
    let thF = a * g.thigh * s, thB = -a * g.thigh * s * (limp ? 0.55 : 1);
    const sway = (c.waddle || 0) * a * g.waddle * s;
    const lean = c.hunch + w.lean + sway + breath * 0.6;
    const fx = w.facing * (1 - 0.2 * w.sq), sy = 1 + 0.12 * w.sq;
    let hipY = -c.hipY + bob + breath * 0.4;
    // agregado para la escalera: sentado en el borde (piernas colgando) o en cuclillas
    if (w.sentado) {
      const k = w.sentado;
      hipY = lerp(hipY, -2, k);
      thF = lerp(thF, w.cuclillas ? 70 : 84, k); thB = lerp(thB, w.cuclillas ? 62 : 76, k);
      kneeF = lerp(kneeF, w.cuclillas ? -150 : -84 + Math.sin(w.t * 2.6 + w.idx) * 10, k);
      kneeB = lerp(kneeB, w.cuclillas ? -140 : -76 + Math.sin(w.t * 2.6 + w.idx + 1.7) * 10, k);
    }

    w.root.setAttribute('transform', `translate(${f1(w.x + w.push * e)},${f1(w.suelo - w.jump)}) scale(${(fx * e).toFixed(3)},${(sy * e).toFixed(3)})`);
    w.body.setAttribute('transform', `translate(0,${f1(hipY)})`);
    w.legF.setAttribute('transform', `rotate(${f1(thF)})`);
    w.legB.setAttribute('transform', `rotate(${f1(thB)})`);
    w.shinF.setAttribute('transform', `translate(0,${c.T}) rotate(${f1(kneeF)})`);
    w.shinB.setAttribute('transform', `translate(0,${c.T}) rotate(${f1(kneeB)})`);
    w.torso.setAttribute('transform', `rotate(${f1(lean)})`);
    w.skirt.setAttribute('transform', `rotate(${f1(lean * 0.5)})`);
    w.arm.setAttribute('transform', `translate(${f1(c.W * 0.15)},${-c.H + 7}) rotate(${f1(w.armAng + a * g.arm * s)})`);
    w.spearG.setAttribute('transform', `translate(-1,25) rotate(${f1(w.spearAng + a * g.arm * 0.3 * s)})`);
    w.head.setAttribute('transform', `translate(2,${-c.H - 1}) rotate(${f1(w.headTilt + w.wob + a * 2 * Math.sin(2 * ph))}) scale(${(w.look * c.hs).toFixed(3)},${c.hs})`);
    w.crestG.setAttribute('transform', `rotate(${f1(w.crest)} 2 -27)`);
    if (w.bellyG) w.bellyG.setAttribute('transform', `translate(0,${f1(w.belly)})`);
    const drop = w.shieldDrop + w.belly * 0.6 + a * 1.5 * Math.cos(2 * ph);
    w.shield.setAttribute('transform', `rotate(${f1(lean)}) translate(0,${f1(drop)}) rotate(${f1(w.shieldRot - a * g.arm * 0.25 * s)} ${f1(c.scx)} ${f1(c.scy)})`);
  }

  /* ================== HERRAMIENTAS DE ANIMACIÓN ================== */
  function tw(w, props, ms, ez = ease.inOutSine) {
    const from = {};
    for (const k in props) from[k] = w[k];
    return tween(ms, (e) => { for (const k in props) w[k] = lerp(from[k], props[k], e); }, ez);
  }
  function moveTo(w, x, ms, ez = (t) => t) {
    const from = w.x;
    return tween(ms, (e) => { w.x = lerp(from, x, e); }, ez);
  }
  async function hop(w, h, ms) {
    w.sqV -= 7; // se estira al despegar
    await tween(ms, (e, t) => { w.jump = h * Math.sin(Math.PI * t); });
    w.jump = 0; w.sq = Math.max(w.sq, 0.6); w.bellyV += 70; w.crestV += 120; // aplasta al aterrizar
  }
  async function turn(w, to) {
    const from = w.facing;
    w.sqV -= 3;
    await tween(240, (e, t) => { w.facing = lerp(from, to, ease.inOutSine(t)); w.jump = 6 * Math.sin(Math.PI * t); });
    w.jump = 0; w.facing = to;
  }

  global.Griego = {
    NS, GROUND, B, C, RED, BK, STONES, STAR, reduceMotion,
    el, rand, lerp, clamp, f1, ease, tween, wait, fondo,
    CHARS, buildWarrior, updateWarrior, RUN, SAD, MARCH, tw, moveTo, hop, turn,
  };
})(window);
