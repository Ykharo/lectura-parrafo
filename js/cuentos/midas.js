// «El rey Midas»: 5 escenas en estilo de jarrón griego de figuras negras (terracota, figuras
// negras con incisiones crema y detalles rojos). Cada escena agrupa dos oraciones del texto.
// data-p = índice de la palabra dentro de la escena (ver js/cuento.js).
// Clases propias (css/styles.css, .escena-griega): .surge aparece, .dora se vuelve oro,
// .atenua-final se apaga al terminar la escena.
(function () {
  'use strict';

  const { fondo } = window.Griego;
  const B = '#1E1410', C = '#F3DDB3', R = '#A8321F', BK = '#3A2A1F', ORO = '#E8B53A';

  // Envoltorio que aparece al decir la palabra p (con retraso d)
  const surge = (p, d, contenido, extra = '') => `<g class="surge${extra}" data-p="${p}" data-d="${d}">${contenido}</g>`;
  // Destello dorado de cuatro puntas
  const brillo = (x, y, t, p, d) => surge(p, d,
    `<path d="M${x},${y - t} L${x + t * 0.22},${y - t * 0.22} L${x + t},${y} L${x + t * 0.22},${y + t * 0.22} L${x},${y + t} L${x - t * 0.22},${y + t * 0.22} L${x - t},${y} L${x - t * 0.22},${y - t * 0.22} Z" fill="${ORO}" stroke="${B}" stroke-width="1"/>`, ' flota');

  // ---------- Midas (mira a la izquierda; dir = -1 lo da vuelta) ----------
  const BRAZOS = {
    abajo: [[-6, -122], [-10, -102], [-8, -86]],
    extendido: [[-6, -122], [-24, -112], [-42, -108]],
    arriba: [[-6, -122], [-20, -138], [-24, -158]],
    ruego: [[-6, -122], [-24, -120], [-34, -134]],
  };
  // manoOro: { p, hasta } muestra la mano dorada desde la palabra p (y la quita en `hasta`)
  function rey({ x, y, escala = 1.45, dir = -1, pose = 'pie', brazo = 'extendido', manoOro = null }) {
    const sube = pose === 'sentado' ? 42 : pose === 'rodillas' ? 34 : 0;
    const pts = BRAZOS[brazo].map(([a, b]) => [a, b + sube]);
    const mano = pts[pts.length - 1];
    let bajo = '';
    if (pose === 'pie') {
      bajo = `
        <path d="M10,0 L-1,0 L2,-6 L10,-6 Z" fill="${BK}"/>
        <path d="M-4,0 L-17,0 L-13,-6 L-4,-6 Z" fill="${B}"/>
        <path d="M-16,-92 L16,-92 L25,0 L-24,0 Z" fill="${B}"/>
        <path d="M-6,-86 L-12,-14 M2,-86 L0,-14 M10,-86 L15,-14" stroke="${C}" stroke-width="1.2" fill="none"/>
        <path d="M-23.6,-12 L24,-12 L25,-3 L-24,-3 Z" fill="${R}"/>
        <path d="M-22,-7.5 H23" stroke="${C}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    } else if (pose === 'sentado') {
      bajo = `
        <path d="M16,-40 Q30,-72 40,-104" stroke="${B}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M16,-34 Q26,-16 36,0 M-14,-34 Q-22,-16 -30,0" stroke="${B}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="-22" y="-40" width="44" height="7" fill="${B}"/>
        <path d="M-16,-50 L18,-50 L18,-36 L-40,-36 L-42,-46 Z" fill="${B}"/>
        <path d="M-30,-45 L10,-45" stroke="${C}" stroke-width="1.1"/>
        <path d="M-46,-40 L-28,-40 L-26,-6 L-48,-6 Z" fill="${B}"/>
        <path d="M-48,-14 L-26,-14 L-26,-6 L-48,-6 Z" fill="${R}"/>
        <path d="M-30,0 L-48,0 L-44,-6 L-30,-6 Z" fill="${B}"/>`;
    } else { // de rodillas
      bajo = `
        <path d="M14,-12 L44,-12 L46,0 L12,0 Z" fill="${B}"/>
        <path d="M-16,-58 L18,-58 L22,-4 L-20,-4 Z" fill="${B}"/>
        <path d="M-6,-52 L-10,-10 M6,-52 L8,-10" stroke="${C}" stroke-width="1.1" fill="none"/>
        <path d="M-20,-12 L22,-12 L22,-4 L-20,-4 Z" fill="${R}"/>`;
    }
    const alto = `<g transform="translate(0 ${sube})">
        <polyline points="8,-122 12,-102 10,-86" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="10" cy="-84" r="4.4" fill="${B}"/>
        <path d="M-16,-92 L16,-92 L18,-128 Q0,-136 -16,-128 Z" fill="${B}"/>
        <path d="M-10,-122 Q0,-114 10,-122" stroke="${C}" stroke-width="1.2" fill="none"/>
        <path d="M18,-128 Q28,-104 21,-80 L12,-86 L13,-124 Z" fill="${R}" stroke="${B}" stroke-width="1.2"/>
        <rect x="-5" y="-142" width="10" height="15" fill="${B}"/>
        <g transform="translate(0 -152)">
          <path d="M2,-12 Q18,-8 16,12 Q10,16 5,7 Z" fill="${B}"/>
          <circle r="13" fill="${B}"/>
          <path d="M-13,1 Q-18,20 -7,28 Q4,28 8,7 Z" fill="${B}"/>
          <path d="M-12,8 Q-14,15 -10,21 M-7,9 Q-9,16 -4,23" stroke="${C}" stroke-width="1" fill="none"/>
          <path d="M-15,4 Q-10,7 -4,3" stroke="${C}" stroke-width="1.4" fill="none"/>
          <path d="M-12,-5 L-18,2 L-11,3 Z" fill="${B}"/>
          <path d="M-11,-4 q3,-2.6 6,0" stroke="${C}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
          <path d="M-13,-8.5 Q-8,-11.5 -3,-8.5" stroke="${C}" stroke-width="2" fill="none"/>
          <path d="M-11,-10 L-10,-22 L-5,-14 L0,-24 L5,-14 L10,-22 L11,-10 Z" fill="${ORO}" stroke="${B}" stroke-width="1.2"/>
        </g>
      </g>
      <polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${mano[0]}" cy="${mano[1]}" r="4.8" fill="${B}"/>
      ${manoOro ? `<circle class="aparece" data-p="${manoOro.p}" data-d="${manoOro.d || 0}"${manoOro.hasta !== undefined ? ` data-hasta="${manoOro.hasta}"` : ''} cx="${mano[0]}" cy="${mano[1]}" r="6" fill="${ORO}" stroke="${B}" stroke-width="1.2"/>
        <circle class="aparece" data-p="${manoOro.p}" data-d="${manoOro.d || 0}"${manoOro.hasta !== undefined ? ` data-hasta="${manoOro.hasta}"` : ''} cx="10" cy="${-84 + sube}" r="5.6" fill="${ORO}" stroke="${B}" stroke-width="1.2"/>` : ''}`;
    return `<g transform="translate(${x} ${y}) scale(${dir * escala} ${escala})">${bajo}${alto}</g>`;
  }

  // ---------- Dioniso: túnica larga, barba, corona de hiedra, tirso y copa ----------
  function dioniso({ x, y, escala = 1.45, dir = 1 }) {
    const hojas = [-150, -125, -100, -75, -50, -25].map((a) => {
      const r = (a * Math.PI) / 180;
      const cx = (Math.cos(r) * 13).toFixed(1), cy = (Math.sin(r) * 13).toFixed(1);
      return `<path d="M${cx},${cy} q-3,-6 0,-9 q3,3 0,9 Z" transform="rotate(${a + 90} ${cx} ${cy})" fill="${C}" stroke="${B}" stroke-width=".6"/>`;
    }).join('');
    return `<g transform="translate(${x} ${y}) scale(${dir * escala} ${escala})">
      <line x1="22" y1="-186" x2="20" y2="0" stroke="${B}" stroke-width="3.6" stroke-linecap="round"/>
      <ellipse cx="22" cy="-194" rx="6.5" ry="11" fill="${B}"/>
      <path d="M17,-200 L27,-190 M17,-192 L27,-182 M27,-200 L17,-190 M27,-192 L17,-182" stroke="${C}" stroke-width=".9"/>
      <path d="M16,-176 q-8,-3 -9,4 q8,2 9,-4 Z M27,-168 q8,-3 9,4 q-8,2 -9,-4 Z" fill="${B}"/>
      <polyline points="10,-120 20,-104 21,-94" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="21" cy="-94" r="4.4" fill="${B}"/>
      <path d="M-15,-92 L15,-92 L25,0 L-29,0 Z" fill="${B}"/>
      <path d="M-7,-86 L-14,-16 M1,-86 L-1,-16 M9,-86 L13,-16" stroke="${C}" stroke-width="1.1" fill="none"/>
      <path d="M-28,-14 L24,-14 M-28.6,-3 L24.6,-3" stroke="${C}" stroke-width="1.4"/>
      <path d="M14,-92 L-20,-30 L-26,-40 L8,-96 Z" fill="${R}" stroke="${B}" stroke-width="1.1"/>
      <path d="M-27,0 L-38,0 L-34,-5 L-27,-5 Z" fill="${B}"/>
      <path d="M-13,-91 L13,-91 L11,-124 Q0,-130 -12,-124 Z" fill="${B}"/>
      <path d="M-9,-117 Q0,-111 9,-117" stroke="${C}" stroke-width="1.1" fill="none"/>
      <rect x="-4" y="-134" width="8" height="12" fill="${B}"/>
      <g transform="translate(0 -146)">
        <path d="M2,-10 Q20,-4 18,22 Q10,24 4,10 Z" fill="${B}"/>
        <circle r="12.5" fill="${B}"/>
        <path d="M-12,2 Q-17,24 -4,34 Q4,26 8,6 Z" fill="${B}"/>
        <path d="M-10,9 Q-12,18 -6,26 M-5,10 Q-6,19 -1,26" stroke="${C}" stroke-width="1" fill="none"/>
        <path d="M-12,-5 L-17,2 L-11,3 Z" fill="${B}"/>
        <path d="M-11,-4 q3,-2.6 6,0" stroke="${C}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        ${hojas}
      </g>
      <polyline points="-6,-120 -22,-112 -36,-116" fill="none" stroke="${B}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="-37" cy="-116" r="4.4" fill="${B}"/>
      <path d="M-52,-134 L-26,-134 Q-28,-120 -39,-118 Q-50,-120 -52,-134 Z" fill="${B}"/>
      <path d="M-52,-131 q-9,4 -2,11 M-26,-131 q9,4 2,11" stroke="${B}" stroke-width="2.4" fill="none"/>
      <path d="M-49,-129 H-29" stroke="${C}" stroke-width="1"/>
    </g>`;
  }

  // ---------- Objetos ----------
  function flor(x, y, h, p, pOro, d) {
    const tallo = `M${x},${y} Q${x - 8},${y - h * 0.5} ${x},${y - h}`;
    return surge(p, d, `
      <path class="dora-linea" data-p="${pOro}" data-d="${d}" d="${tallo}" stroke="${B}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path class="dora" data-p="${pOro}" data-d="${d}" d="M${x - 4},${y - h * 0.45} q-14,-6 -16,4 q10,4 16,-4 Z M${x - 2},${y - h * 0.65} q14,-8 17,2 q-10,5 -17,-2 Z" fill="${B}"/>
      ${[0, 72, 144, 216, 288].map((a) => {
        const r = (a * Math.PI) / 180;
        return `<circle class="dora" data-p="${pOro}" data-d="${d}" cx="${(x + Math.cos(r) * 9).toFixed(1)}" cy="${(y - h + Math.sin(r) * 9).toFixed(1)}" r="7" fill="${R}" stroke="${B}" stroke-width="1.2"/>`;
      }).join('')}
      <circle class="dora" data-p="${pOro}" data-d="${d}" cx="${x}" cy="${y - h}" r="5" fill="${C}" stroke="${B}" stroke-width="1.2"/>`);
  }
  function silla(x, y, e, p, pOro) {
    return surge(p, 0.2, `<g transform="translate(${x} ${y}) scale(${e})">
      <path class="dora-linea" data-p="${pOro}" d="M18,-40 Q34,-74 46,-108 M16,-34 Q28,-16 38,0 M-18,-34 Q-28,-16 -38,0" stroke="${B}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <rect class="dora" data-p="${pOro}" x="-26" y="-42" width="50" height="9" rx="2" fill="${B}"/>
      <path class="dora" data-p="${pOro}" d="M30,-86 L52,-96 L50,-84 L30,-76 Z" fill="${B}"/>
      <path d="M-20,-38 H18" stroke="${C}" stroke-width="1.2"/>
    </g>`);
  }
  function piedra(x, y, rx, ry, p, pOro, d) {
    return surge(p, d, `
      <path class="dora" data-p="${pOro}" data-d="${d}" d="M${x - rx},${y} Q${x - rx},${y - ry * 1.6} ${x},${y - ry * 1.7} Q${x + rx * 1.1},${y - ry * 1.5} ${x + rx},${y} Z" fill="${BK}" stroke="${B}" stroke-width="2"/>
      <path d="M${x - rx * 0.5},${y - ry * 0.7} q${rx * 0.3},-${ry * 0.4} ${rx * 0.7},-${ry * 0.2}" stroke="${C}" stroke-width="1.2" fill="none"/>`);
  }
  function arbol(x, y, p) {
    const hojas = [[-30, -150], [-12, -170], [12, -160], [30, -140], [-38, -120], [36, -112], [0, -136]].map(([a, b]) =>
      `<ellipse cx="${x + a}" cy="${y + b}" rx="16" ry="8" transform="rotate(${a} ${x + a} ${y + b})" fill="${B}"/>` +
      `<path d="M${x + a - 8},${y + b} H${x + a + 8}" stroke="${C}" stroke-width=".9"/>`).join('');
    return surge(p, 0, `<path d="M${x},${y} Q${x - 10},${y - 60} ${x},${y - 110} M${x},${y - 80} Q${x + 18},${y - 100} ${x + 24},${y - 118}" stroke="${B}" stroke-width="8" fill="none" stroke-linecap="round"/>${hojas}
      ${[[-20, -140], [18, -128], [4, -158]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b + 10}" r="4" fill="${R}" stroke="${B}"/>`).join('')}`);
  }
  // Mesa griega de tres patas curvas
  function mesa(x1, x2, y, p) {
    const top = y - 108;
    return surge(p, 0, `
      <rect x="${x1}" y="${top}" width="${x2 - x1}" height="10" fill="${B}"/>
      <path d="M${x1 + 10},${top} H${x2 - 10}" stroke="${C}" stroke-width="1.2" stroke-dasharray="6 4"/>
      <path d="M${x1 + 18},${top + 10} Q${x1 + 6},${top + 60} ${x1 + 16},${y} M${x2 - 18},${top + 10} Q${x2 - 6},${top + 60} ${x2 - 16},${y} M${(x1 + x2) / 2},${top + 10} Q${(x1 + x2) / 2 + 8},${top + 60} ${(x1 + x2) / 2},${y}" stroke="${B}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M${x1 + 10},${y} h12 M${x2 - 22},${y} h12" stroke="${B}" stroke-width="5" stroke-linecap="round"/>`);
  }
  function pan(x, y, p, pOro) {
    return surge(p, 0, `<ellipse class="dora" data-p="${pOro}" cx="${x}" cy="${y}" rx="28" ry="13" fill="${BK}" stroke="${B}" stroke-width="2"/>
      <path d="M${x - 14},${y - 6} l6,8 M${x - 2},${y - 9} l6,9 M${x + 10},${y - 7} l6,8" stroke="${C}" stroke-width="1.6"/>`);
  }
  function uvas(x, y, p, pOro) {
    const bolas = [[0, 0], [-9, -4], [9, -4], [-5, 8], [5, 8], [0, 16], [-13, 6], [13, 6], [0, -8]];
    return surge(p, 0, `<path d="M${x},${y - 14} q4,-10 12,-12" stroke="${B}" stroke-width="2.5" fill="none"/>
      <path d="M${x + 4},${y - 18} q12,-8 18,2 q-10,6 -18,-2 Z" fill="${B}"/>
      ${bolas.map(([a, b]) => `<circle class="dora" data-p="${pOro}" cx="${x + a}" cy="${y + b}" r="6" fill="${R}" stroke="${B}" stroke-width="1.3"/>`).join('')}`);
  }
  function copa(x, y, p, pOro) {
    return surge(p, 0.2, `<path class="dora" data-p="${pOro}" d="M${x - 24},${y - 22} L${x + 24},${y - 22} Q${x + 18},${y - 6} ${x},${y - 5} Q${x - 18},${y - 6} ${x - 24},${y - 22} Z" fill="${B}"/>
      <path class="dora-linea" data-p="${pOro}" d="M${x - 24},${y - 19} q-10,1 -6,9 M${x + 24},${y - 19} q10,1 6,9 M${x},${y - 5} V${y - 1}" stroke="${B}" stroke-width="2.6" fill="none"/>
      <path class="dora" data-p="${pOro}" d="M${x - 8},${y} L${x + 8},${y} L${x + 5},${y - 3} L${x - 5},${y - 3} Z" fill="${B}"/>
      <path d="M${x - 18},${y - 17} H${x + 18}" stroke="${C}" stroke-width="1.1"/>`);
  }
  function anfora(x, y, e, p, pOro) {
    return surge(p, 0.3, `<g transform="translate(${x} ${y}) scale(${e})">
      <path class="dora" data-p="${pOro}" d="M-6,-62 L6,-62 L7,-52 Q22,-44 20,-20 Q16,-4 6,0 L-6,0 Q-16,-4 -20,-20 Q-22,-44 -7,-52 Z" fill="${B}"/>
      <path d="M-7,-56 q-12,0 -11,12 M7,-56 q12,0 11,12" stroke="${B}" stroke-width="3" fill="none"/>
      <path d="M-17,-30 H17 M-15,-24 H15" stroke="${C}" stroke-width="1.2"/>
      <path d="M-13,-27 l4,-3 l4,3 l4,-3 l4,3 l4,-3 l4,3" stroke="${R}" stroke-width="1.4" fill="none"/>
    </g>`);
  }
  function monedas(x, y, p) {
    let html = '';
    [[0, 0], [24, 0], [48, 0], [12, -9], [36, -9], [24, -18], [-20, 0], [-8, -9]].forEach(([a, b], k) => {
      html += `<ellipse cx="${x + a}" cy="${y + b - 5}" rx="13" ry="5" fill="${ORO}" stroke="${B}" stroke-width="1.4"/>`;
      if (k % 2 === 0) html += `<path d="M${x + a - 6},${y + b - 5} h12" stroke="${B}" stroke-width=".8"/>`;
    });
    return surge(p, 0.1, html + `<g transform="translate(${x + 96} ${y})"><path d="M-6,-62 L6,-62 L7,-52 Q22,-44 20,-20 Q16,-4 6,0 L-6,0 Q-16,-4 -20,-20 Q-22,-44 -7,-52 Z" fill="${ORO}" stroke="${B}" stroke-width="1.6"/>
      <path d="M-17,-30 H17 M-15,-24 H15" stroke="${B}" stroke-width="1.2"/></g>`);
  }
  function lagrimas(x, y, p) {
    return [0, 1, 2].map((k) => surge(p, k * 0.35,
      `<path d="M${x},${y + k * 18} q-4,7 0,10 q4,-3 0,-10 Z" fill="${C}" stroke="${B}" stroke-width=".8"/>`)).join('');
  }
  function rio(y, p) {
    let olas = '';
    for (let fila = 0; fila < 3; fila++) {
      let d = `M${10 + fila * 30},${y + 14 + fila * 11}`;
      for (let k = 0; k < 24; k++) d += ' q10,-7 20,0 t20,0';
      olas += `<path class="trazo crema" data-p="${p}" data-d="${0.3 + fila * 0.2}" data-dur="1.6" pathLength="1" d="${d}"/>`;
    }
    return surge(p, 0, `<path d="M0,${y} Q125,${y - 14} 250,${y} T500,${y} T750,${y} T1000,${y} L1000,486 L0,486 Z" fill="${B}"/>`) + olas;
  }
  function templo(x, y, e, p) {
    const cols = [0, 1, 2, 3, 4].map((k) => `<rect x="${-80 + k * 36}" y="-100" width="16" height="92" fill="${ORO}" stroke="${B}" stroke-width="2"/>` +
      `<path d="M${-76 + k * 36},-96 V-12 M${-68 + k * 36},-96 V-12" stroke="${B}" stroke-width=".9"/>`).join('');
    return surge(p, 0, `<g transform="translate(${x} ${y}) scale(${e})">
      <path d="M-100,0 H100 V-8 H-100 Z M-94,-8 H94 V-14 H-94 Z" fill="${ORO}" stroke="${B}" stroke-width="2"/>
      ${cols}
      <rect x="-96" y="-114" width="192" height="14" fill="${ORO}" stroke="${B}" stroke-width="2"/>
      <path d="M-102,-114 L0,-156 L102,-114 Z" fill="${ORO}" stroke="${B}" stroke-width="2"/>
      <path d="M-70,-120 L0,-148 L70,-120" stroke="${B}" stroke-width="1.2" fill="none"/>
    </g>`, ' atenua-final');
  }
  const puntos = (x1, y1, cx, cy, x2, y2, n, p) => {
    let html = '';
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      html += `<circle class="aparece" data-p="${p}" data-d="${(k * 0.07).toFixed(2)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${ORO}" stroke="${B}" stroke-width=".8"/>`;
    }
    return html;
  };

  // ---------- Escenas ----------
  // 1 · El(0) rey(1) Midas(2) amaba(3) el(4) oro(5) más(6) que(7) nada(8) en(9) el(10) mundo.(11)
  //     Un(12) día,(13) el(14) dios(15) Dioniso(16) le(17) concedió(18) un(19) deseo(20) muy(21) especial.(22)
  const escena1 = (pre) => `
    ${fondo(pre, 1000, 520)}
    ${surge(1, 0, rey({ x: 280, y: 486, brazo: 'extendido' }))}
    ${monedas(380, 486, 5)}
    ${surge(15, 0, dioniso({ x: 760, y: 486 }))}
    ${puntos(690, 300, 540, 150, 360, 320, 9, 18)}
    ${brillo(330, 300, 16, 20, 0)}${brillo(250, 210, 11, 21, 0.1)}${brillo(370, 250, 9, 22, 0.2)}${brillo(210, 300, 8, 22, 0.35)}`;

  // 2 · Midas(0) pidió(1) que(2) todo(3) lo(4) que(5) tocara(6) se(7) convirtiera(8) en(9) oro(10) brillante.(11)
  //     Al(12) principio(13) estaba(14) feliz(15) y(16) tocó(17) las(18) flores,(19) las(20) sillas(21) y(22) las(23) piedras(24) del(25) jardín.(26)
  const escena2 = (pre) => `
    ${fondo(pre, 1000, 520)}
    ${surge(0, 0, rey({ x: 200, y: 486, brazo: 'extendido', manoOro: { p: 6 } }))}
    ${brillo(276, 318, 13, 10, 0)}${brillo(300, 290, 8, 11, 0.1)}${brillo(258, 286, 7, 11, 0.25)}
    ${brillo(170, 230, 9, 15, 0)}${brillo(250, 190, 7, 15, 0.2)}
    ${flor(430, 486, 110, 13, 19, 0)}${flor(470, 486, 86, 13, 19, 0.15)}${flor(508, 486, 122, 13, 19, 0.3)}
    ${silla(650, 486, 1.35, 13, 21)}
    ${piedra(790, 486, 34, 22, 13, 24, 0)}${piedra(850, 486, 24, 16, 13, 24, 0.15)}${piedra(818, 486, 18, 12, 13, 24, 0.3)}
    ${arbol(940, 486, 26)}`;

  // 3 · Pero(0) cuando(1) quiso(2) comer,(3) el(4) pan(5) y(6) las(7) uvas(8) también(9) se(10) volvieron(11) de(12) oro.(13)
  //     Tenía(14) mucha(15) hambre(16) y(17) mucha(18) sed,(19) y(20) comenzó(21) a(22) llorar.(23)
  const escena3 = (pre) => `
    ${fondo(pre, 1000, 520)}
    ${surge(0, 0, rey({ x: 300, y: 486, pose: 'sentado', brazo: 'extendido', manoOro: { p: 0, d: 0.6 } }))}
    ${mesa(430, 660, 486, 3)}
    ${pan(490, 365, 5, 13)}
    ${uvas(560, 360, 8, 13)}
    ${copa(620, 378, 3, 19)}
    ${anfora(720, 486, 1.3, 3, 99)}
    ${lagrimas(313, 322, 23)}`;

  // 4 · Entonces(0) le(1) rogó(2) a(3) Dioniso(4) que(5) le(6) quitara(7) ese(8) poder.(9)
  //     El(10) dios(11) le(12) dijo(13) que(14) se(15) lavara(16) en(17) el(18) río,(19) y(20) así(21) lo(22) hizo.(23)
  const escena4 = (pre) => `
    ${fondo(pre, 1000, 520)}
    ${surge(0, 0, rey({ x: 300, y: 440, pose: 'rodillas', brazo: 'ruego', manoOro: { p: 0, d: 0.6, hasta: 23 } }))}
    ${surge(4, 0, dioniso({ x: 760, y: 440 }))}
    ${surge(9, 0, `<circle cx="351" cy="291" r="26" fill="none" stroke="${ORO}" stroke-width="3" stroke-dasharray="5 6"/>`, ' flota')}
    ${puntos(700, 262, 560, 300, 420, 452, 8, 13)}
    ${rio(444, 19)}
    ${[0, 1, 2, 3, 4, 5].map((k) => surge(23, 0.15 * k, `<circle cx="${352 + (k % 3) * 8 - 8}" cy="${310 + k * 22}" r="3.4" fill="${ORO}" stroke="${B}" stroke-width=".8"/>`)).join('')}
    ${surge(23, 0.9, `<path d="M318,452 q16,-8 32,0 t32,0 M330,464 q14,-6 28,0" stroke="${C}" stroke-width="2" fill="none"/>`)}`;

  // 5 · Desde(0) ese(1) día,(2) Midas(3) prefirió(4) una(5) mesa(6) con(7) comida(8) antes(9) que(10) un(11) palacio(12) de(13) oro.(14)
  const escena5 = (pre) => `
    ${fondo(pre, 1000, 520)}
    ${templo(850, 486, 1.25, 12)}
    ${brillo(790, 300, 10, 14, 0)}${brillo(915, 290, 8, 14, 0.2)}
    ${surge(3, 0, rey({ x: 260, y: 486, pose: 'sentado', brazo: 'extendido' }))}
    ${mesa(390, 620, 486, 6)}
    ${pan(445, 365, 8, 99)}
    ${uvas(512, 360, 8, 99)}
    ${copa(575, 378, 8, 99)}
    ${anfora(660, 486, 1.2, 8, 99)}`;

  window.CUENTOS.midas = {
    audio: 'assets/audio/midas.wav',
    tiempos: 'assets/audio/midas.json',
    // escenas: grupos de oraciones del texto (9 oraciones → 5 escenas)
    grupos: [[0, 1], [2, 3], [4, 5], [6, 7], [8]],
    estilo: 'griego',
    escenas: [escena1('md1-'), escena2('md2-'), escena3('md3-'), escena4('md4-'), escena5('md5-')],
    juegos: { muro: true, escalera: true },
  };
})();
