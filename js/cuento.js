// Escenas animadas de los cuentos: dibujos de líneas que se trazan al ritmo de la voz.
//
// Cada elemento del dibujo lleva:
//   data-p     índice de la palabra (dentro de la oración) que lo hace aparecer; -1 = al empezar
//   data-d     retraso en segundos (para que las partes se dibujen en orden)
//   data-dur   duración del trazo en segundos
//   data-hasta índice de la palabra en que desaparece
// Clases: .trazo (línea que se dibuja sola, requiere pathLength="1"), .aparece (se funde),
//         .flota (se mece al terminar), .estrella (titila al terminar).
(function (global) {
  'use strict';

  function azar(semilla) {
    let s = semilla;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }

  // Estrellas de fondo en posiciones fijas
  function estrellas({ n = 40, x = [120, 980], y = [20, 400], semilla = 7, p = -1 } = {}) {
    const r = azar(semilla);
    let html = '';
    for (let i = 0; i < n; i++) {
      const cx = x[0] + r() * (x[1] - x[0]);
      const cy = y[0] + r() * (y[1] - y[0]);
      html += `<circle class="estrella aparece" data-p="${p}" data-d="${(r() * 1.5).toFixed(2)}" ` +
        `style="--f:${(-r() * 3).toFixed(2)}s" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(0.6 + r() * 1.1).toFixed(2)}"/>`;
    }
    return html;
  }

  // Estrellita de cuatro puntas trazada
  function destello(x, y, t, p, d = 0) {
    return `<path class="trazo fino" data-p="${p}" data-d="${d}" pathLength="1" d="M${x},${y - t} V${y + t} M${x - t},${y} H${x + t}"/>`;
  }

  // Línea de puntitos (recta, o curva si se da un punto de control)
  function puntos(x1, y1, x2, y2, n, p, { retraso = 0.08, control = null } = {}) {
    let html = '';
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      let x;
      let y;
      if (control) {
        const [cx, cy] = control;
        x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
        y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      } else {
        x = x1 + (x2 - x1) * t;
        y = y1 + (y2 - y1) * t;
      }
      html += `<circle class="puntero aparece" data-p="${p}" data-d="${(k * retraso).toFixed(2)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6"/>`;
    }
    return html;
  }

  const BRAZOS = {
    saluda: 'M1,-40 L9,-48 L13,-58',
    apunta: 'M1,-40 L9,-50 L14,-60',
    mira: 'M1,-40 L9,-43 L15,-51',
    abajo: 'M1,-40 L4,-31 L5,-24',
  };

  function figura(x, y, { p, escala = 1, brazo = 'saluda', d = 0 }, cabeza) {
    const t = (clase, dd, attrs) => `<${attrs[0]} class="${clase}" data-p="${p}" data-d="${(d + dd).toFixed(2)}" pathLength="1" ${attrs[1]}/>`;
    return `<g transform="translate(${x} ${y}) scale(${escala})" style="--g:${(2 / escala).toFixed(2)}">` +
      cabeza(t) +
      t('trazo', 0.3, ['path', 'd="M0,-22 L1,-44"']) +
      t('trazo', 0.5, ['path', 'd="M0,-22 L2,-11 L0,0 L4,0"']) +
      t('trazo', 0.6, ['path', 'd="M0,-22 L-2,-11 L-3,0 L1,0"']) +
      t('trazo', 0.7, ['path', 'd="M1,-40 L-3,-31 L-4,-24"']) +
      t('trazo', 0.8, ['path', `d="${BRAZOS[brazo]}"`]) +
      '</g>';
  }

  // Astronauta de líneas (casco con visor y mochila). (x, y) = pies.
  function astronauta(x, y, opciones) {
    return figura(x, y, opciones, (t) =>
      t('trazo cuerpo', 0.5, ['rect', 'x="-9" y="-43" width="7" height="14" rx="2"']) +
      t('trazo cuerpo', 0, ['circle', 'cx="1" cy="-55" r="10"']) +
      t('trazo fino', 0.6, ['path', 'd="M3,-61 A6,6 0 0 1 3,-49"']));
  }

  // Lucas de niño, sin traje. (x, y) = pies.
  function nino(x, y, opciones) {
    return figura(x, y, opciones, (t) =>
      t('trazo cuerpo', 0, ['circle', 'cx="1" cy="-53" r="9"']) +
      t('trazo fino', 0.4, ['path', 'd="M-7,-56 q6,-11 17,-5"']));
  }

  // Controla una escena ya insertada en la página
  function controlador(svg) {
    const elementos = [...svg.querySelectorAll('[data-p]')];
    return {
      reiniciar() {
        svg.classList.add('sin-trans');
        svg.classList.remove('final');
        for (const el of elementos) el.classList.remove('on', 'off');
        svg.getBoundingClientRect();
        svg.classList.remove('sin-trans');
      },
      // Dibuja todo lo asociado a las palabras hasta la i (incluye las saltadas)
      hasta(i) {
        for (const el of elementos) {
          if (Number(el.dataset.p) <= i && !el.classList.contains('on')) {
            el.style.transitionDelay = `${el.dataset.d || 0}s`;
            if (el.dataset.dur) el.style.transitionDuration = `${el.dataset.dur}s`;
            el.classList.add('on');
          }
          if (el.dataset.hasta !== undefined && Number(el.dataset.hasta) <= i) el.classList.add('off');
        }
      },
      final() { svg.classList.add('final'); },
    };
  }

  global.Cuento = { estrellas, destello, puntos, astronauta, nino, controlador };
  global.CUENTOS = global.CUENTOS || {};
})(window);
