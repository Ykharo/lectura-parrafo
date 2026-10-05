// «El león y el ratón»: 5 escenas en stop motion de papel recortado (motor en js/papel.js).
// El león usa las piezas recortadas de la ilustración (assets/leon-raton/leon/); el ratón, el
// paisaje, la red y los efectos se recortan en papel por código. Cada escena agrupa oraciones.
// Los números de los eventos son el índice de la palabra dentro de la escena.
(function () {
  'use strict';

  const L = 'assets/leon-raton/leon/';
  const MEDIDAS = {
    torso: [350, 217], melena: [291, 299], 'cola-base': [307, 86], 'cola-punta': [273, 147],
    'pata-trasera': [126, 228], 'pata-delantera': [119, 223], 'pata-delantera-3': [117, 225], 'pata-trasera-2': [120, 224],
    'pata-grande': [194, 217],
    'cara-dormido': [216, 203], 'cara-sorprendido': [213, 201], 'cara-rugiendo': [220, 211],
    'cara-riendo': [215, 209], 'cara-triste': [212, 203], 'cara-amable': [212, 201],
  };
  const CARAS = ['dormido', 'sorprendido', 'rugiendo', 'riendo', 'triste', 'amable'];
  const img = (e, nombre, px, py, extra = '') => e.imagen(L + nombre + '.png', MEDIDAS[nombre][0], MEDIDAS[nombre][1], px, py, extra);

  const SUELO = 445;
  const VERDE = '#7FA35A', VERDE2 = '#5F8443', VERDE3 = '#8DB062', CAFE = '#7A5230', CIELO = '#CFE4EA';
  const GRIS = '#A79F96', CLARO = '#D6CEC3', ROSA = '#E8A39C', OSCURO = '#2A1D14', CREMA = '#FFF8EC';

  // ================= Paisaje =================
  function sabana(e, { arbol = null } = {}) {
    const fondo = e.actor(e.camara, { temblor: 0 });
    fondo.g.innerHTML = `<rect x="-60" y="-60" width="1120" height="640" fill="${CIELO}"/><rect x="-60" y="-60" width="1120" height="640" fill="url(#${e.id('papel')})"/>`;
    const nube = (x, y, s) => e.actor(e.camara, { x, y, esc: s, temblor: 0.4 }, e.papel(e.contorno([
      [-40, 8], [-46, -4], [-30, -14], [-18, -26], [2, -28], [16, -18], [34, -22], [48, -8], [42, 8],
    ], 1.5), '#FBF6EC', { filo: 2 }));
    const nubes = [nube(180, 70, 1), nube(620, 110, 0.8)];
    nubes.forEach((n, k) => e.alCuadro(() => { n.x += 0.25 + k * 0.1; if (n.x > 1100) n.x = -100; }));
    const sol = e.actor(e.camara, { x: 870, y: 92, temblor: 0.5 }, e.papel(e.elipse(0, 0, 40, 40, 30, 1.2), '#F4C24A'));
    const luna = e.actor(e.camara, { x: 870, y: 640, temblor: 0.5 }, e.papel(e.contorno([
      [0, -38], [22, -30], [34, -8], [30, 16], [12, 34], [-10, 36], [6, 22], [14, 2], [10, -20],
    ], 0.8), '#F3E3A0'));
    e.actor(e.camara, { temblor: 0.3 },
      e.papel(e.franja(300, 0, 2, 18), '#C5D59A', { sombra: false }) +
      e.papel(e.franja(345, 0, 3, 12), '#A7BF77') +
      e.papel(e.franja(398, 0, 4, 5), '#D7B56E'));
    if (arbol !== null) {
      const x = arbol;
      const copa = (cy, rx, ry, color) => {
        const pts = [];
        for (let k = 0; k < 34; k++) {
          const a = (k / 34) * Math.PI * 2, v = 1 + 0.09 * Math.sin(a * 7) * (Math.sin(a) < 0 ? 1 : 0.2);
          pts.push([x + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v]);
        }
        return e.papel(e.contorno(pts, 1.5), color);
      };
      e.actor(e.camara, { temblor: 0.4 },
        e.papel(e.recto([[x - 12, 445], [x - 7, 300], [x - 46, 222], [x - 34, 214], [x - 2, 278], [x + 2, 186], [x + 14, 186],
          [x + 12, 280], [x + 44, 214], [x + 56, 222], [x + 18, 300], [x + 14, 445]], 1.2), CAFE) +
        copa(196, 178, 46, VERDE2) + copa(178, 150, 34, VERDE3));
    }
    return { sol, luna };
  }
  function pastoDelante(e) {
    e.actor(e.camara, { temblor: 0.5 },
      e.papel(e.franja(470, 24, 30, 4, { puntas: true }), VERDE) +
      e.papel(e.franja(492, 16, 36, 3, { puntas: true }), '#6E9450', { sombra: false }));
  }

  // ================= León (piezas recortadas) =================
  function leon(e, padre, { x, suelo = SUELO, esc = 0.6, pose = 'acostado', cara = 'amable' }) {
    const raiz = e.actor(padre, { x, y: 0, esc, temblor: 0.7 });
    const lejos = `filter="url(#${e.id('lejos')})"`;
    const pTL = e.actor(raiz, { x: -99, y: 60 }, img(e, 'pata-trasera-2', 60, 22, lejos));
    const pDL = e.actor(raiz, { x: 105, y: 60 }, img(e, 'pata-delantera-3', 58, 20, lejos));
    const cola = e.actor(raiz, { x: -160, y: -40, rot: 170, esc: 0.72 }, img(e, 'cola-base', 16, 46));
    const colaPunta = e.actor(cola, { x: 276, y: -6, rot: -18 }, img(e, 'cola-punta', 12, 128));
    colaPunta.sy = -1;
    e.actor(raiz, {}, img(e, 'torso', 175, 108));
    const pTC = e.actor(raiz, { x: -107, y: 62 }, img(e, 'pata-trasera', 66, 24));
    const pDC = e.actor(raiz, { x: 97, y: 62 }, img(e, 'pata-delantera', 60, 20));
    const cuello = e.actor(raiz, { x: 160, y: -64 });
    e.actor(cuello, { x: -10, y: -6 }, img(e, 'melena', 148, 146));
    const caras = {};
    CARAS.forEach((n) => {
      const [w, h] = MEDIDAS['cara-' + n];
      caras[n] = e.actor(cuello, { x: 8, y: 0, temblor: 0.5 }, img(e, 'cara-' + n, w / 2, h / 2));
    });
    e.mostrar(caras, cara);

    const POSES = {
      acostado: { alto: 107, dc: -80, dl: -74, tc: -68, tl: -62, cola: 170 },
      parado: { alto: 262, dc: 0, dl: 5, tc: 0, tl: -5, cola: 200 },
    };
    const patas = [pDC, pDL, pTC, pTL];
    function poner(nombre, ms = 0) {
      const p = POSES[nombre];
      const objetivo = { raiz: { y: suelo - p.alto * esc }, pDC: { rot: p.dc }, pDL: { rot: p.dl }, pTC: { rot: p.tc }, pTL: { rot: p.tl }, cola: { rot: p.cola } };
      const piezas = { raiz, pDC, pDL, pTC, pTL, cola };
      if (!ms) { for (const k in objetivo) Object.assign(piezas[k], objetivo[k]); return Promise.resolve(); }
      return Promise.all(Object.keys(objetivo).map((k) => e.anim(piezas[k], objetivo[k], ms, 'sale')));
    }
    poner(pose);

    let caminando = false, respirando = false, paso = 0;
    e.alCuadro((t) => {
      if (caminando) {
        paso++;
        const s = paso % 4 < 2 ? 1 : -1; // cambia de pose cada 2 cuadros
        pDC.rot = 16 * s; pTL.rot = 14 * s; pDL.rot = -16 * s; pTC.rot = -14 * s;
        cuello.rot = s * 2;
      }
      if (respirando) raiz.sy = esc * (1 + 0.014 * Math.sin(t * 3.4));
      cola.rot += Math.sin(t * 2.2) * 0.8;
    });
    return {
      raiz, cuello, caras, patas, pDC, pDL, pTC, pTL, cola, colaPunta, esc,
      cara: (n) => e.mostrar(caras, n),
      pose: poner,
      // camina hasta x en ms (se puede interrumpir con detener())
      async caminar(x, ms) {
        caminando = true;
        const x0 = raiz.x;
        await e.tween(ms, (t) => { if (caminando) raiz.x = e.lerp(x0, x, t); });
        if (caminando) { caminando = false; cuello.rot = 0; await poner('parado', 200); }
      },
      detener() { caminando = false; cuello.rot = 0; },
      respirar(si) { respirando = si; if (!si) raiz.sy = esc; },
      // posición de la boca en la escena (para rugidos)
      boca: () => [raiz.x + (160 + 70) * esc, raiz.y + (-64 + 30) * esc],
    };
  }

  // ================= Ratón (recortado por código) =================
  function raton(e, padre, { x, suelo = SUELO, esc = 1, dir = 1, cara = 'normal' }) {
    const raiz = e.actor(padre, { x, y: suelo, esc, temblor: 0.8 });
    raiz.sx = esc * dir;
    const p = (d, c, o) => e.papel(d, c, Object.assign({ filo: 2 }, o || {}));
    const cola = e.actor(raiz, { x: -24, y: -16 }, p(e.contorno([[2, 2], [-14, -2], [-28, -12], [-36, -26], [-31, -36], [-27, -26], [-18, -13], [-4, -4]], 0.4), ROSA));
    const patasA = e.actor(raiz, {}, p(e.elipse(-13, -4, 8, 4.5, 14, 0.4), GRIS) + p(e.elipse(13, -4, 8, 4.5, 14, 0.4), GRIS));
    const patasB = e.actor(raiz, {}, p(e.elipse(-4, -5, 9, 4.5, 14, 0.4), GRIS) + p(e.elipse(8, -7, 7, 4, 14, 0.4), GRIS));
    patasB.g.style.display = 'none';
    e.actor(raiz, {}, p(e.elipse(0, -21, 27, 17, 22, 0.6), GRIS, { filo: 3 }) + p(e.elipse(6, -15, 15, 8.5, 16, 0.4), CLARO, { sombra: false, filo: 1.2 }));
    const cabeza = e.actor(raiz, { x: 20, y: -32 });
    e.actor(cabeza, { x: -7, y: -12 }, p(e.elipse(0, 0, 11, 12, 16, 0.5), GRIS) + p(e.elipse(1, 1, 6.5, 7.5, 14, 0.3), ROSA, { sombra: false, filo: 1 }));
    e.actor(cabeza, {}, p(e.contorno([[-13, -7], [-3, -13], [9, -9], [21, -1], [25, 4], [12, 9], [-5, 11], [-14, 4]], 0.5), GRIS, { filo: 2.5 }) +
      p(e.elipse(25, 3, 3.4, 3, 10, 0.2), '#D9706C', { sombra: false, filo: 1 }) +
      `<path d="M19,5 l13,-4 M19,7 l13,2" stroke="${OSCURO}" stroke-width=".8" stroke-linecap="round"/>`);
    const ojo = (contenido) => e.actor(cabeza, { temblor: 0.3 }, contenido);
    const ojos = {
      normal: ojo(`<circle cx="7" cy="-3" r="3.2" fill="${OSCURO}"/><circle cx="8" cy="-4" r="1" fill="#fff"/>`),
      asustado: ojo(`<circle cx="7" cy="-3" r="4.3" fill="${OSCURO}"/><circle cx="8.4" cy="-4.4" r="1.4" fill="#fff"/><path d="M1,-11 l10,-3" stroke="${OSCURO}" stroke-width="1.2" stroke-linecap="round"/><path d="M5,3 q-2.5,4.5 0,6.5 q2.5,-2 0,-6.5 Z" fill="#9AD0F0" stroke="#fff" stroke-width=".6"/>`),
      feliz: ojo(`<path d="M3,-3 q4,-5 8,0" fill="none" stroke="${OSCURO}" stroke-width="1.8" stroke-linecap="round"/><path d="M14,7 q5,5 10,0" fill="#8a2a2a" stroke="${OSCURO}" stroke-width=".8"/>`),
      royendo: ojo(`<circle cx="7" cy="-3" r="3" fill="${OSCURO}"/><circle cx="8" cy="-4" r="1" fill="#fff"/><rect x="19" y="7" width="3" height="4.5" fill="#fff" stroke="${OSCURO}" stroke-width=".6"/><rect x="22" y="7" width="3" height="4.5" fill="#fff" stroke="${OSCURO}" stroke-width=".6"/>`),
    };
    const brazos = {
      abajo: e.actor(raiz, {}, p(e.elipse(14, -13, 4.5, 7, 12, 0.3), GRIS)),
      suplica: e.actor(raiz, {}, p(e.elipse(30, -30, 4, 6, 12, 0.3), ROSA) + p(e.elipse(33, -28, 4, 6, 12, 0.3), ROSA)),
      arriba: e.actor(raiz, {}, p(e.contorno([[-2, -26], [-12, -50], [-7, -52], [4, -28]], 0.3), GRIS, { filo: 1.5 }) + p(e.elipse(-10, -53, 4, 4, 10, 0.2), ROSA, { filo: 1 }) +
        p(e.contorno([[30, -28], [44, -54], [49, -51], [36, -26]], 0.3), GRIS, { filo: 1.5 }) + p(e.elipse(46, -55, 4, 4, 10, 0.2), ROSA, { filo: 1 })),
      sostiene: e.actor(raiz, {}, p(e.elipse(33, -24, 4.5, 4.5, 12, 0.3), ROSA)),
    };
    e.mostrar(ojos, cara);
    e.mostrar(brazos, 'abajo');

    let corriendo = false, royendo = false, k = 0;
    e.alCuadro(() => {
      k++;
      if (corriendo) {
        const a = k % 2 === 0;
        patasA.g.style.display = a ? '' : 'none';
        patasB.g.style.display = a ? 'none' : '';
        raiz.y += a ? -2 : 2;
        cola.rot = a ? -8 : 6;
      }
      if (royendo) cabeza.rot = k % 2 ? 6 : -2;
    });
    return {
      raiz, cabeza, cola, esc,
      cara: (n) => e.mostrar(ojos, n),
      brazos: (n) => e.mostrar(brazos, n),
      correr(si) {
        corriendo = si;
        if (!si) { patasA.g.style.display = ''; patasB.g.style.display = 'none'; cola.rot = 0; }
      },
      roer(si) { royendo = si; if (!si) cabeza.rot = 0; },
    };
  }

  // ================= Efectos de papel =================
  function zetas(e, origen) {
    let activo = true;
    const lanzar = async () => {
      while (activo && e.vigente()) {
        const [x, y] = origen();
        const z = e.actor(e.camara, { x, y, esc: 0.6, op: 0, temblor: 0.6 },
          e.papel(e.recto([[0, 0], [18, 0], [18, 5], [6, 16], [18, 16], [18, 21], [0, 21], [0, 16], [12, 5], [0, 5]], 0.6), '#6F8FC4', { filo: 2 }));
        e.anim(z, { y: y - 70, x: x + 26, sx: 1.2, sy: 1.2 }, 2200, 'lineal');
        e.anim(z, { op: 1 }, 400).then(() => e.espera(1100)).then(() => e.anim(z, { op: 0 }, 700));
        await e.espera(1000);
      }
    };
    lanzar();
    return { parar() { activo = false; } };
  }
  function hojasCaen(e, n, x0, x1) {
    for (let k = 0; k < n; k++) {
      const x = e.azar(x0, x1);
      const h = e.actor(e.camara, { x, y: e.azar(150, 220), rot: e.azar(0, 360), esc: e.azar(0.7, 1), temblor: 0.5 },
        e.papel(e.contorno([[-12, 0], [-4, -6], [10, -4], [14, 0], [10, 4], [-4, 6]], 0.5), k % 2 ? VERDE3 : VERDE2, { filo: 1.5 }));
      const caida = e.azar(1800, 2800);
      e.tween(caida, (t) => { h.y = 200 + t * 250; h.x = x + Math.sin(t * 9 + k) * 22; h.rot += 2; });
      e.espera(caida * 0.75).then(() => e.anim(h, { op: 0 }, caida * 0.25));
    }
  }
  function polvo(e, x, y, n = 6) {
    for (let k = 0; k < n; k++) {
      const p = e.actor(e.camara, { x, y, esc: e.azar(0.6, 1.1), temblor: 0.6 }, e.papel(e.elipse(0, 0, 9, 7, 12, 0.6), '#EADBC0', { sombra: false, filo: 1.5 }));
      const dx = e.azar(-60, 60), dy = e.azar(-40, -10);
      e.anim(p, { x: x + dx, y: y + dy, sx: 1.6, sy: 1.6 }, 600, 'sale');
      e.espera(250).then(() => e.anim(p, { op: 0 }, 400));
    }
  }
  function sacudir(e, fuerza = 8, cuadros = 6) {
    let n = 0;
    e.alCuadro(() => {
      n++;
      e.camara.x = n < cuadros ? (n % 2 ? fuerza : -fuerza) * (1 - n / cuadros) : 0;
      e.camara.y = n < cuadros ? (n % 2 ? -fuerza / 2 : fuerza / 2) * (1 - n / cuadros) : 0;
      return n < cuadros;
    });
  }
  const CORAZON = 'M0,8 C-10,0 -14,-8 -8,-13 C-4,-16 0,-12 0,-9 C0,-12 4,-16 8,-13 C14,-8 10,0 0,8 Z';
  function corazon(e, x, y, esc = 1) {
    const c = e.actor(e.camara, { x, y, esc: 0.1, temblor: 0.6 }, e.papel(e.contorno([[0, 9], [-11, 0], [-14, -9], [-7, -15], [0, -10], [7, -15], [14, -9], [11, 0]], 0.4), '#E05A5A', { filo: 2 }));
    e.anim(c, { sx: esc, sy: esc }, 400, 'rebota');
    return c;
  }
  function flor(e, x, y, color) {
    const f = e.actor(e.camara, { x, y, esc: 0.1, temblor: 0.6 },
      `<path d="M0,0 Q-3,-14 0,-28" stroke="${VERDE2}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      [0, 72, 144, 216, 288].map((a) => {
        const r = (a * Math.PI) / 180;
        return e.papel(e.elipse(Math.cos(r) * 8, -30 + Math.sin(r) * 8, 6.5, 6.5, 12, 0.4), color, { filo: 1.5, sombra: false });
      }).join('') + e.papel(e.elipse(0, -30, 5, 5, 10, 0.3), '#F4C24A', { filo: 1.2, sombra: false }));
    e.anim(f, { sx: 1, sy: 1 }, 450, 'rebota');
    return f;
  }
  function texto(e, x, y, t, color = '#F4C24A') {
    const a = e.actor(e.camara, { x, y, esc: 0.2, temblor: 1 },
      `<text x="0" y="0" text-anchor="middle" font-family="Andika, 'Trebuchet MS', sans-serif" font-weight="700" font-size="38" fill="${color}" stroke="${CREMA}" stroke-width="5" paint-order="stroke">${t}</text>`);
    e.anim(a, { sx: 1, sy: 1 }, 300, 'rebota');
    return a;
  }

  // ================= Red de cuerdas =================
  function red(e, padre, { cx, base = SUELO, ancho = 330, alto = 215 }) {
    const raiz = e.actor(padre, { temblor: 0.5 });
    const F = 5, C = 8;
    const nodo = (i, j) => {
      const y = base - alto * (1 - j / F) * 0.98 - 2;
      const v = Math.min(1, (base - y) / alto);
      const medio = (ancho / 2) * Math.sqrt(Math.max(0, 1 - v * v));
      return [cx + (i / C - 0.5) * 2 * medio, y];
    };
    const segmentos = [];
    const cuerda = (a, b) => {
      const mx = (a[0] + b[0]) / 2 + e.azar(-3, 3), my = (a[1] + b[1]) / 2 + e.azar(2, 6);
      const d = `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
      const s = e.actor(raiz, { temblor: 0.3 },
        `<path d="${d}" stroke="#3a2410" stroke-width="6" opacity=".18" fill="none" transform="translate(2 3)"/>` +
        `<path d="${d}" stroke="#9C6B3E" stroke-width="5.5" fill="none" stroke-linecap="round"/>` +
        `<path d="${d}" stroke="#C8975F" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        `<path d="${d}" stroke="#7A532E" stroke-width="1.2" fill="none" stroke-dasharray="3 4" opacity=".7"/>`);
      segmentos.push({ s, x: mx, y: my, cortada: false });
    };
    for (let j = 0; j <= F; j++) for (let i = 0; i < C; i++) cuerda(nodo(i, j), nodo(i + 1, j));
    for (let j = 0; j < F; j++) for (let i = 0; i <= C; i++) cuerda(nodo(i, j), nodo(i, j + 1));
    // corta las cuerdas más cercanas a (x, y), con trocitos que caen
    function cortar(x, y, n = 2) {
      segmentos.filter((s) => !s.cortada).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, n).forEach((s, k) => {
        s.cortada = true;
        e.espera(k * 150).then(() => {
          e.anim(s.s, { op: 0 }, 150);
          for (let q = 0; q < 2; q++) {
            const t = e.actor(e.camara, { x: s.x, y: s.y, rot: e.azar(0, 180), temblor: 0.6 }, `<path d="M-7,0 H7" stroke="#9C6B3E" stroke-width="4.5" stroke-linecap="round"/>`);
            e.anim(t, { y: SUELO - 4, x: s.x + e.azar(-20, 20), rot: e.azar(-90, 90) }, 500, 'entra');
          }
        });
      });
    }
    function caer() {
      segmentos.forEach((s) => {
        if (s.cortada) return;
        e.anim(s.s, { y: e.azar(30, 90), x: e.azar(-40, 40), rot: e.azar(-12, 12), op: 0 }, e.azar(500, 900), 'entra');
      });
    }
    return { raiz, cortar, caer };
  }

  // ================= Escenas =================
  // 1 · Un(0) león(1) dormía(2) tranquilamente(3) bajo(4) la(5) sombra(6) de(7) un(8) árbol.(9)
  //     De(10) pronto,(11) un(12) pequeño(13) ratón(14) pasó(15) corriendo(16) sobre(17) su(18) cuerpo.(19)
  //     El(20) león(21) despertó(22) y(23) lo(24) atrapó(25) con(26) una(27) de(28) sus(29) enormes(30) patas.(31)
  const escena1 = (svg) => Papel.escena(svg, (e) => {
    sabana(e, { arbol: 360 });
    const leo = leon(e, e.camara, { x: 420, pose: 'acostado', cara: 'dormido' });
    leo.cuello.rot = 10;
    const rat = raton(e, e.camara, { x: -110, esc: 1.35 });
    const pata = e.actor(e.camara, { x: 720, y: -260, esc: 0.62, temblor: 0.6 }, img(e, 'pata-grande', 97, 190));
    pastoDelante(e);
    let z = null;
    return {
      eventos: [
        [-1, () => { leo.respirar(true); z = zetas(e, () => [leo.raiz.x + 200 * leo.esc, leo.raiz.y - 150 * leo.esc]); }],
        [9, () => hojasCaen(e, 3, 260, 460)],
        [14, async () => { rat.correr(true); await e.anim(rat.raiz, { x: 200 }, 1300, 'lineal'); }],
        [17, async () => {
          rat.correr(true);
          const x0 = rat.raiz.x;
          await e.tween(1500, (t) => { rat.raiz.x = e.lerp(x0, 715, t); rat.raiz.y = SUELO - Math.sin(Math.PI * t) * 170; });
          rat.correr(false);
          polvo(e, 715, SUELO - 4, 4);
        }],
        [22, async () => {
          if (z) z.parar();
          leo.respirar(false);
          leo.cara('sorprendido');
          await e.anim(leo.cuello, { rot: -6 }, 250, 'sale');
        }],
        [25, async () => {
          rat.cara('asustado');
          await e.anim(pata, { y: SUELO + 8 }, 280, 'entra');
          sacudir(e, 9);
          polvo(e, 720, SUELO - 6, 8);
        }],
      ],
      final() { e.alCuadro((t) => { rat.cola.rot = Math.sin(t * 9) * 10; }); },
    };
  }, { semilla: 11 });

  // 2 · —¡Por(0) favor,(1) déjame(2) ir!(3) —suplicó(4) el(5) ratón—.(6) Algún(7) día(8) podría(9) ayudarte.(10)
  //     El(11) león(12) se(13) rio,(14) pero(15) decidió(16) dejarlo(17) libre.(18)
  const escena2 = (svg) => Papel.escena(svg, (e) => {
    sabana(e, {});
    // primer plano: el león acostado a la izquierda, el ratón atrapado bajo su pata a la derecha
    const cab = leon(e, e.camara, { x: 230, esc: 1.05, pose: 'acostado', cara: 'sorprendido' });
    const rat = raton(e, e.camara, { x: 720, esc: 2.4, dir: -1, cara: 'asustado' });
    const pata = e.actor(e.camara, { x: 840, y: SUELO + 10, esc: 1.05, temblor: 0.6 }, img(e, 'pata-grande', 97, 200));
    pastoDelante(e);
    let globo = null;
    return {
      eventos: [
        [0, () => { rat.brazos('suplica'); rat.raiz.temblor = 2.4; }],
        [4, async () => {
          for (let k = 0; k < 2; k++) { await e.anim(rat.raiz, { rot: -9 }, 220); await e.anim(rat.raiz, { rot: 0 }, 220); }
        }],
        [7, () => {
          rat.raiz.temblor = 0.8;
          globo = e.actor(e.camara, { x: 640, y: 105, esc: 0.1, temblor: 0.6 },
            e.papel(e.elipse(50, 118, 7, 7, 10, 0.3), CREMA, { filo: 1.5 }) + e.papel(e.elipse(36, 90, 11, 11, 12, 0.4), CREMA, { filo: 1.5 }) +
            e.papel(e.elipse(0, 0, 92, 62, 30, 1.2), CREMA, { filo: 2 }));
          e.anim(globo, { sx: 1, sy: 1 }, 400, 'rebota');
          const mini = raton(e, globo, { x: -26, suelo: 30, esc: 1.1, cara: 'feliz' });
          mini.brazos('arriba');
          const cor = e.actor(globo, { x: 40, y: -10, temblor: 0.6 }, e.papel(e.contorno([[0, 9], [-11, 0], [-14, -9], [-7, -15], [0, -10], [7, -15], [14, -9], [11, 0]], 0.4), '#E05A5A', { filo: 2 }));
          e.alCuadro((t) => { cor.sx = cor.sy = 1 + 0.12 * Math.sin(t * 6); });
        }],
        [11, () => { if (globo) e.anim(globo, { op: 0 }, 400); }],
        [14, async () => {
          cab.cara('riendo');
          const ja1 = texto(e, 290, 95, 'JA');
          await e.espera(350);
          const ja2 = texto(e, 530, 80, 'JA');
          await e.tween(1400, (t) => { cab.cuello.rot = Math.sin(t * 30) * 5; });
          cab.cuello.rot = 0;
          e.anim(ja1, { op: 0, y: 80 }, 500); e.anim(ja2, { op: 0, y: 50 }, 500);
        }],
        [16, async () => {
          cab.cara('amable');
          await e.anim(pata, { y: -280 }, 600, 'sale');
        }],
        [17, async () => {
          rat.cara('feliz'); rat.brazos('arriba');
          for (let k = 0; k < 2; k++) { await e.anim(rat.raiz, { y: SUELO - 40 }, 200, 'sale'); await e.anim(rat.raiz, { y: SUELO }, 200, 'entra'); }
          rat.brazos('abajo');
          rat.raiz.sx = rat.esc; // se da vuelta y se va corriendo
          rat.correr(true);
          await e.anim(rat.raiz, { x: 1180 }, 1200, 'entra');
          rat.correr(false);
        }],
      ],
      final() { e.alCuadro((t) => { cab.cuello.rot = Math.sin(t * 2) * 2; }); },
    };
  }, { semilla: 22 });

  // 3 · Días(0) después,(1) el(2) león(3) quedó(4) atrapado(5) en(6) una(7) red.(8) Intentó(9) escapar,(10) pero(11) no(12) pudo.(13)
  const escena3 = (svg) => Papel.escena(svg, (e) => {
    const cielo = sabana(e, { arbol: 150 });
    const leo = leon(e, e.camara, { x: -260, pose: 'parado', cara: 'amable' });
    const malla = red(e, e.camara, { cx: 520 });
    malla.raiz.y = -560;
    pastoDelante(e);
    const noche = e.actor(e.camara, { op: 0, temblor: 0 }, `<rect x="-60" y="-60" width="1120" height="640" fill="#1E2A55"/>`);
    return {
      eventos: [
        [0, async () => {
          // pasan los días: el sol se pone, sale la luna, vuelve el sol
          await Promise.all([e.anim(cielo.sol, { y: 640 }, 700, 'entra'), e.anim(noche, { op: 0.5 }, 700)]);
          await e.anim(cielo.luna, { y: 92 }, 600, 'sale');
          await e.espera(250);
          await e.anim(cielo.luna, { y: 640 }, 500, 'entra');
          await Promise.all([e.anim(cielo.sol, { y: 92 }, 700, 'sale'), e.anim(noche, { op: 0 }, 700)]);
        }],
        [2, () => leo.caminar(470, 2400)],
        [5, async () => {
          leo.detener();
          e.anim(leo.raiz, { x: 470 }, 200);
          leo.cara('sorprendido');
          await e.anim(malla.raiz, { y: 0 }, 650, 'rebota');
          sacudir(e, 7);
          polvo(e, 380, SUELO - 4, 5); polvo(e, 660, SUELO - 4, 5);
          await leo.pose('acostado', 350);
        }],
        [9, async () => {
          leo.cara('rugiendo');
          await e.tween(1700, (t) => {
            const s = Math.sin(t * 40);
            leo.raiz.rot = s * 3; malla.raiz.rot = -s * 1.2;
            leo.pDC.rot = -80 + s * 18; leo.pTC.rot = -68 - s * 16;
          });
          leo.raiz.rot = 0; malla.raiz.rot = 0;
        }],
        [12, async () => {
          leo.cara('triste');
          await e.anim(leo.cuello, { rot: 14 }, 500);
        }],
      ],
      final() { leo.respirar(true); },
    };
  }, { semilla: 33 });

  // 4 · Al(0) escuchar(1) sus(2) rugidos,(3) el(4) ratón(5) llegó(6) rápidamente(7) y(8) comenzó(9) a(10) roer(11) las(12) cuerdas.(13)
  //     Poco(14) después,(15) el(16) león(17) quedó(18) libre.(19)
  const escena4 = (svg) => Papel.escena(svg, (e) => {
    sabana(e, { arbol: 150 });
    const leo = leon(e, e.camara, { x: 470, pose: 'acostado', cara: 'triste' });
    leo.cuello.rot = 14;
    const malla = red(e, e.camara, { cx: 520 });
    const rat = raton(e, e.camara, { x: -110, esc: 1.4 });
    pastoDelante(e);
    const rugido = async () => {
      const [bx, by] = leo.boca();
      for (let k = 0; k < 3; k++) {
        const r = e.actor(e.camara, { x: bx + 20, y: by, esc: 0.5, temblor: 0.8 },
          [-30, 0, 30].map((a) => `<path d="M0,0 m30,-40 q22,40 0,80" transform="rotate(${a})" fill="none" stroke="#F4C24A" stroke-width="7" stroke-linecap="round"/>`).join(''));
        e.anim(r, { sx: 1.6, sy: 1.6, x: bx + 70, op: 0 }, 700, 'sale');
        await e.espera(350);
      }
    };
    return {
      eventos: [
        [3, async () => {
          leo.cara('rugiendo');
          await e.anim(leo.cuello, { rot: -8 }, 200, 'sale');
          sacudir(e, 6, 8);
          hojasCaen(e, 4, 80, 260);
          await rugido();
          leo.cara('triste');
          e.anim(leo.cuello, { rot: 8 }, 400);
        }],
        [6, async () => {
          rat.correr(true);
          // líneas de velocidad detrás del ratón
          const lineas = e.actor(e.camara, { x: 0, y: SUELO - 26, temblor: 0.6 },
            [0, 12, 24].map((dy, k) => e.papel(e.recto([[-60 - k * 10, dy - 3], [-12, dy - 2], [-12, dy + 2], [-60 - k * 10, dy + 3]], 0.4), CREMA, { filo: 1, sombra: false })).join(''));
          e.alCuadro(() => { lineas.x = rat.raiz.x - 14; return rat.raiz.x < 330; });
          await e.anim(rat.raiz, { x: 335 }, 900, 'lineal');
          rat.correr(false);
          e.anim(lineas, { op: 0 }, 200);
        }],
        [9, () => { rat.cara('royendo'); rat.brazos('sostiene'); rat.roer(true); malla.cortar(360, SUELO - 20, 2); }],
        [11, () => malla.cortar(370, SUELO - 50, 2)],
        [13, () => malla.cortar(390, SUELO - 80, 3)],
        [14, () => malla.cortar(410, SUELO - 40, 3)],
        [18, async () => {
          rat.roer(false);
          malla.caer();
          leo.cara('amable');
          leo.cuello.rot = 0;
          await leo.pose('parado', 600);
          rat.cara('feliz'); rat.brazos('arriba');
          for (let k = 0; k < 2; k++) { await e.anim(rat.raiz, { y: SUELO - 30 }, 200, 'sale'); await e.anim(rat.raiz, { y: SUELO }, 200, 'entra'); }
        }],
      ],
      final() { corazon(e, 345, 300, 1.4); },
    };
  }, { semilla: 44 });

  // 5 · Nadie(0) es(1) tan(2) pequeño(3) que(4) no(5) pueda(6) ayudar(7) a(8) los(9) demás.(10)
  const escena5 = (svg) => Papel.escena(svg, (e) => {
    sabana(e, { arbol: 820 });
    const leo = leon(e, e.camara, { x: 470, pose: 'acostado', cara: 'amable' });
    const rat = raton(e, e.camara, { x: 470 + 130 * 0.6, suelo: 470 - 280 * 0.6 + 6, esc: 1.25, cara: 'feliz' });
    pastoDelante(e);
    const colores = ['#E36F5A', '#F2A7C3', '#9DB7E8', '#F4C24A', '#C79BE0'];
    const lugares = [[90, 478], [180, 470], [270, 482], [700, 476], [800, 484], [900, 472], [140, 500], [330, 498], [650, 500], [760, 502], [940, 498]];
    const flores = [];
    const eventos = lugares.map(([x, y], k) => [k, () => flores.push(flor(e, x, y, colores[k % colores.length]))]);
    eventos.push([-1, () => leo.respirar(true)]);
    eventos.push([3, async () => { rat.brazos('arriba'); await e.espera(900); rat.brazos('abajo'); }]);
    eventos.push([7, () => corazon(e, 560, 170, 1.5)]);
    return {
      eventos,
      final() {
        rat.brazos('arriba');
        e.alCuadro((t) => { flores.forEach((f, k) => { f.rot = Math.sin(t * 2.4 + k) * 6; }); });
      },
    };
  }, { semilla: 55 });

  // piezas compartidas con los juegos de papel (js/juegos/muro-cuerda.js, js/juegos/escalera-piedras.js)
  window.PapelLeon = {
    leon, raton, corazon, texto, polvo, sacudir,
    colores: { VERDE, VERDE2, VERDE3, CAFE, CIELO, GRIS, CLARO, ROSA, OSCURO, CREMA },
  };

  window.CUENTOS['leon-raton'] = {
    audio: 'assets/audio/leon-raton.wav',
    tiempos: 'assets/audio/leon-raton.json',
    grupos: [[0, 1, 2], [3, 4, 5, 6], [7, 8], [9, 10], [11]],
    estilo: 'papel',
    escenas: [escena1, escena2, escena3, escena4, escena5],
    juegos: { muro: true, escalera: true },
  };
})();
