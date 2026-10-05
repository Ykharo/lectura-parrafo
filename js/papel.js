// Motor de stop motion de papel recortado.
//
// - Las piezas son papel: textura de fibra, borde cortado a tijera con filo blanco y sombra de diorama.
// - El movimiento se calcula de forma continua, pero la imagen se actualiza a 12 cuadros por segundo,
//   y en cada cuadro las piezas tiemblan apenas, como si un animador las moviera a mano.
//
// Una escena se escribe como un guion:
//   Papel.escena(svg, (e) => { …montar actores…; return { eventos: [[palabra, accion], …], final } })
// y devuelve { hasta(i), reiniciar(), final() } (la misma interfaz que Cuento.controlador).
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FPS = 12;
  let contador = 0;

  const lerp = (a, b, t) => a + (b - a) * t;
  const facil = {
    lineal: (t) => t,
    suave: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    sale: (t) => 1 - (1 - t) * (1 - t),
    entra: (t) => t * t,
    rebota: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  // Números al azar repetibles (las formas recortadas salen iguales cada vez)
  function semillaAzar(s) {
    return () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Textura de papel: grano, fibras y manchas de pincel (se genera una sola vez) ----------
  let textura = null;
  function texturaPapel() {
    if (textura) return textura;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = Math.random() < 0.5 ? 255 : 70;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.random() * 20;
    }
    x.putImageData(img, 0, 0);
    for (let k = 0; k < 16; k++) {
      const gx = Math.random() * 256, gy = Math.random() * 256, r = 20 + Math.random() * 50;
      const gr = x.createRadialGradient(gx, gy, 0, gx, gy, r);
      const claro = Math.random() < 0.5;
      gr.addColorStop(0, claro ? 'rgba(255,255,255,0.10)' : 'rgba(80,50,20,0.08)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr;
      // repetida en los bordes para que el mosaico no muestre costuras
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.save(); x.translate(ox, oy); x.fillRect(-ox, -oy, 256, 256); x.restore(); }
    }
    for (let k = 0; k < 130; k++) {
      x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(70,45,20,0.09)';
      x.lineWidth = 0.5 + Math.random();
      const x0 = Math.random() * 256, y0 = Math.random() * 256, a = Math.random() * Math.PI * 2, l = 8 + Math.random() * 30;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        const sx = x0 + ox, sy = y0 + oy;
        x.beginPath();
        x.moveTo(sx, sy);
        x.quadraticCurveTo(sx + Math.cos(a + 0.7) * l / 2, sy + Math.sin(a + 0.7) * l / 2, sx + Math.cos(a) * l, sy + Math.sin(a) * l);
        x.stroke();
      }
    }
    textura = c.toDataURL('image/png');
    return textura;
  }

  // ================= Escena =================
  function escena(svg, guion, { semilla = 1 } = {}) {
    let gen = 0;
    let actores = [], tweens = [], cuadros = [], eventos = [], alFinal = null;
    let azar = semillaAzar(semilla);
    let ultimoCuadro = 0, t0 = performance.now();

    const fmt = (v) => (Math.round(v * 10) / 10).toString();
    const r = (a, b) => a + azar() * (b - a);

    // ---------- Formas recortadas ----------
    const medio = (a, b) => `${fmt((a[0] + b[0]) / 2)},${fmt((a[1] + b[1]) / 2)}`;
    // Curva cerrada suave que pasa cerca de los puntos, con la irregularidad de la tijera
    function contorno(pts, irr = 1.2) {
      const p = pts.map(([x, y]) => [x + r(-irr, irr), y + r(-irr, irr)]);
      let d = `M${medio(p[p.length - 1], p[0])}`;
      for (let i = 0; i < p.length; i++) d += ` Q${fmt(p[i][0])},${fmt(p[i][1])} ${medio(p[i], p[(i + 1) % p.length])}`;
      return d + 'Z';
    }
    // Polígono de cortes rectos (tijera)
    function recto(pts, irr = 1) {
      return 'M' + pts.map(([x, y]) => `${fmt(x + r(-irr, irr))},${fmt(y + r(-irr, irr))}`).join(' L') + 'Z';
    }
    function elipse(cx, cy, rx, ry, n = 26, irr = 1) {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, v = 1 + r(-0.025, 0.025);
        pts.push([cx + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v]);
      }
      return contorno(pts, irr);
    }
    // Banda horizontal con borde superior ondulado o de puntas (colinas, pasto)
    function franja(y, alto, ondas, amp, { puntas = false, desde = -40, hasta = 1040, fondo = 560 } = {}) {
      const pts = [];
      const n = ondas * (puntas ? 2 : 4);
      for (let k = 0; k <= n; k++) {
        const x = desde + ((hasta - desde) * k) / n;
        const yy = puntas ? y + (k % 2 ? 0 : alto) + r(-amp, amp) : y + Math.sin((k / n) * ondas * Math.PI * 2) * amp + r(-2, 2);
        pts.push([x, yy]);
      }
      pts.push([hasta, fondo], [desde, fondo]);
      return puntas ? recto(pts, 1.5) : 'M' + pts.map(([x, yy]) => `${fmt(x)},${fmt(yy)}`).join(' L') + 'Z';
    }

    function montar() {
      gen++;
      actores = []; tweens = []; cuadros = []; alFinal = null;
      azar = semillaAzar(semilla);
      const pre = `pp${++contador}-`;
      svg.innerHTML = `<defs>
          <pattern id="${pre}papel" patternUnits="userSpaceOnUse" width="256" height="256"><image href="${texturaPapel()}" width="256" height="256"/></pattern>
          <filter id="${pre}lejos" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".8 0 0 0 0  0 .76 0 0 0  0 0 .72 0 0  0 0 0 1 0"/></filter>
          <filter id="${pre}sombra" x="-15%" y="-15%" width="140%" height="140%"><feDropShadow dx="3" dy="5" stdDeviation="2.5" flood-color="#3a2410" flood-opacity=".3"/></filter>
        </defs>`;

      // Pieza de papel dibujada: sombra + filo blanco + color + textura
      const papel = (d, color, { sombra = true, filo = 3, extra = '' } = {}) =>
        (sombra ? `<path d="${d}" fill="#3a2410" opacity=".2" transform="translate(2.5 3.5)"/>` : '') +
        `<path d="${d}" fill="${color}" stroke="#FFF8EC" stroke-width="${filo}" stroke-linejoin="round" paint-order="stroke" ${extra}/>` +
        `<path d="${d}" fill="url(#${pre}papel)"/>`;

      function actor(padre, { x = 0, y = 0, rot = 0, esc = 1, temblor = 1, op = 1 } = {}, contenido = '') {
        const g = document.createElementNS(NS, 'g');
        (padre.g || padre).appendChild(g);
        if (contenido) g.innerHTML = contenido;
        const a = { g, x, y, rot, sx: esc, sy: esc, op, temblor, jx: 0, jy: 0, jr: 0 };
        actores.push(a);
        dibujar(a);
        return a;
      }

      const miGen = gen;
      const e = {
        azar: r, lerp, facil, contorno, recto, elipse, franja, papel,
        id: (n) => pre + n,
        vigente: () => miGen === gen,
        actor,
        // Imagen recortada con su punto de giro (px, py) dentro de la imagen
        imagen: (href, w, h, px, py, extra = '') => `<image href="${href}" x="${-px}" y="${-py}" width="${w}" height="${h}" ${extra}/>`,
        // Anima propiedades de un actor (x, y, rot, sx, sy, op…)
        anim(a, props, ms, ez = 'suave') {
          return new Promise((res) => {
            const desde = {};
            for (const k in props) desde[k] = a[k];
            tweens.push({ gen: miGen, t0: performance.now(), ms, ez: facil[ez] || ez, f: (t) => { for (const k in props) a[k] = lerp(desde[k], props[k], t); }, res });
          });
        },
        // Interpolación libre: f(t) con t de 0 a 1
        tween(ms, f, ez = 'lineal') {
          return new Promise((res) => tweens.push({ gen: miGen, t0: performance.now(), ms, ez: facil[ez] || ez, f, res }));
        },
        espera: (ms) => new Promise((res) => setTimeout(res, ms)),
        // Función que se llama en cada cuadro (12 por segundo); si devuelve false, se quita
        alCuadro(f) { cuadros.push({ gen: miGen, f }); },
        // Un actor por cada imagen de un conjunto; solo uno visible a la vez (reemplazo)
        mostrar(grupo, nombre) { for (const k in grupo) grupo[k].g.style.display = k === nombre ? '' : 'none'; },
      };
      e.camara = actor(svg, { temblor: 0 });
      const guionArmado = guion(e) || {};
      eventos = (guionArmado.eventos || []).map(([p, f]) => ({ p, f, hecho: false }));
      alFinal = guionArmado.final || null;
    }

    function dibujar(a) {
      a.g.setAttribute('transform', `translate(${fmt(a.x + a.jx)} ${fmt(a.y + a.jy)}) rotate(${fmt(a.rot + a.jr)}) scale(${a.sx.toFixed(3)} ${a.sy.toFixed(3)})`);
      a.g.setAttribute('opacity', a.op.toFixed(2));
    }

    function bucle(ahora) {
      if (!svg.isConnected) return; // la escena se quitó de la pantalla
      // los movimientos avanzan siempre…
      tweens = tweens.filter((tw) => {
        if (tw.gen !== gen) return false;
        const t = Math.min(1, (ahora - tw.t0) / tw.ms);
        tw.f(tw.ez(t), t);
        if (t >= 1) { tw.res(); return false; }
        return true;
      });
      // …pero la imagen cambia a saltos, 12 veces por segundo, con un leve temblor de mano
      if (ahora - ultimoCuadro >= 1000 / FPS) {
        ultimoCuadro = ahora;
        const t = (ahora - t0) / 1000;
        cuadros = cuadros.filter((c) => c.gen === gen && c.f(t) !== false);
        for (const a of actores) {
          if (a.temblor) {
            a.jx = (Math.random() - 0.5) * 1.1 * a.temblor;
            a.jy = (Math.random() - 0.5) * 1.1 * a.temblor;
            a.jr = (Math.random() - 0.5) * 0.9 * a.temblor;
          }
          dibujar(a);
        }
      }
      requestAnimationFrame(bucle);
    }

    montar();
    requestAnimationFrame(bucle);

    return {
      reiniciar() { svg.classList.remove('final'); montar(); },
      hasta(i) {
        for (const ev of eventos) {
          if (!ev.hecho && ev.p <= i) { ev.hecho = true; ev.f(); }
        }
      },
      final() { svg.classList.add('final'); if (alFinal) alFinal(); },
    };
  }

  global.Papel = { escena, facil, FPS };
})(window);
