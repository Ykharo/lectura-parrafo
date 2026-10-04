// Análisis de texto en español: sílabas, dificultad y comparación de palabras.
(function (global) {
  'use strict';

  const VOCALES = 'aeiouáéíóúü';
  const FUERTES = 'aeoáéóíú'; // í y ú con tilde forman hiato
  const GRUPOS = ['pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'pl', 'bl', 'cl', 'gl', 'fl', 'kr', 'kl'];

  const esVocal = (c) => VOCALES.includes(c);

  // Divide la palabra en unidades: vocales y consonantes (ch, ll, rr, qu, gu cuentan como una).
  function unidades(palabra) {
    const p = palabra.toLowerCase();
    const u = [];
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      const par = p.slice(i, i + 2);
      const sig = p[i + 2] || '';
      if (par === 'ch' || par === 'll' || par === 'rr') {
        u.push({ i, t: par, v: false });
        i++;
      } else if ((par === 'qu' || par === 'gu') && 'eiéí'.includes(sig) && sig) {
        u.push({ i, t: par, v: false });
        i++;
      } else if (c === 'y') {
        // "y" final tras vocal suena como vocal (hoy, muy)
        const vocal = i === p.length - 1 && i > 0 && esVocal(p[i - 1]);
        u.push({ i, t: c, v: vocal, fuerte: false });
      } else if (esVocal(c)) {
        u.push({ i, t: c, v: true, fuerte: FUERTES.includes(c) });
      } else {
        u.push({ i, t: c, v: false });
      }
    }
    return u;
  }

  // Separa una palabra en sílabas: "primavera" -> ["pri", "ma", "ve", "ra"]
  function silabas(palabra) {
    if (!palabra) return [];
    const u = unidades(palabra);

    // Núcleos vocálicos: vocales seguidas forman diptongo salvo dos fuertes (hiato).
    const nucleos = [];
    for (let i = 0; i < u.length; i++) {
      if (!u[i].v) continue;
      const ultimo = nucleos[nucleos.length - 1];
      if (ultimo && ultimo[1] === i - 1 && !(u[i - 1].fuerte && u[i].fuerte)) ultimo[1] = i;
      else nucleos.push([i, i]);
    }
    if (nucleos.length === 0) return [palabra];

    // Reparte las consonantes entre núcleos.
    const cortes = [];
    for (let n = 0; n < nucleos.length - 1; n++) {
      const a = nucleos[n][1] + 1;
      const b = nucleos[n + 1][0];
      const cons = u.slice(a, b).map((x) => x.t);
      const k = cons.length;
      let corte;
      if (k <= 1) corte = a;
      else if (k === 2) corte = GRUPOS.includes(cons[0] + cons[1]) ? a : a + 1;
      else if (k === 3) corte = GRUPOS.includes(cons[1] + cons[2]) ? a + 1 : a + 2;
      else corte = b - 2;
      cortes.push(u[corte].i);
    }

    const res = [];
    let inicio = 0;
    for (const pos of cortes) {
      res.push(palabra.slice(inicio, pos));
      inicio = pos;
    }
    res.push(palabra.slice(inicio));
    return res;
  }

  // Puntaje de dificultad lectora para un niño. Mayor = más difícil.
  function dificultad(palabra) {
    const p = palabra.toLowerCase();
    if (!p) return 0;
    const s = silabas(p).length;
    let puntos = 0;
    if (s >= 4) puntos += 2;
    else if (s === 3) puntos += 1;
    if (p.length >= 9) puntos += 1;
    for (const g of GRUPOS) if (p.includes(g)) puntos += 1; // sílabas trabadas
    if (/güe|güi|x|cc|ct|pt|ps|bs|ns[bcdfgklmnpqrstvz]/.test(p)) puntos += 1; // grupos poco frecuentes
    if (/ll|rr|ch|qu|gu[eiéí]|h/.test(p)) puntos += 0.5; // dígrafos y h muda
    const sinUMuda = p.replace(/([qg])u(?=[eiéí])/g, '$1');
    if (/[aeoáéó][iuy]|[iuü][aeoáéó]|[íú][aeo]|[aeo][íú]/.test(sinUMuda)) puntos += 0.5; // diptongo o hiato
    return puntos;
  }

  // Minúsculas, sin tildes ni puntuación (ñ -> n), para comparar.
  function normalizar(t) {
    return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }

  function distancia(a, b) {
    const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let diag = fila[0];
      fila[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = tmp;
      }
    }
    return fila[b.length];
  }

  // ¿La palabra reconocida se parece lo suficiente a la esperada? (ambas normalizadas)
  function parecidas(dicha, esperada) {
    if (dicha === esperada) return true;
    if (esperada.length <= 3) return false;
    const umbral = esperada.length <= 5 ? 0.75 : 0.7;
    return 1 - distancia(dicha, esperada) / Math.max(dicha.length, esperada.length) >= umbral;
  }

  // Avanza por el texto según las palabras reconocidas, tolerando palabras
  // mal reconocidas y saltos de hasta `ventana` palabras.
  function alinear(esperadas, dichas, inicio, estadosBase, ventana = 4) {
    const estados = estadosBase.slice();
    let pos = inicio;
    for (let i = 0; i < dichas.length && pos < esperadas.length; i++) {
      let enc = -1;
      let usadas = 1;
      const fin = Math.min(pos + ventana, esperadas.length);
      for (let k = pos; k < fin; k++) {
        if (parecidas(dichas[i], esperadas[k])) { enc = k; break; }
        // el reconocedor a veces parte una palabra en dos ("capa razón")
        if (i + 1 < dichas.length && parecidas(dichas[i] + dichas[i + 1], esperadas[k])) { enc = k; usadas = 2; break; }
      }
      if (enc < 0) continue;
      for (let k = pos; k < enc; k++) estados[k] = 'saltada';
      estados[enc] = 'leida';
      pos = enc + 1;
      i += usadas - 1;
    }
    return { pos, estados };
  }

  // ---------- Oraciones y bloques con sentido ----------
  // Palabras antes de las que conviene cortar un bloque largo (de más a menos preferidas).
  const CORTE_MEDIO = new Set(['y', 'e', 'o', 'u', 'ni', 'pero', 'porque', 'aunque', 'cuando', 'donde', 'que', 'mientras', 'como', 'si', 'sino', 'pues']);
  // (no se corta antes de "de/del": casi siempre continúan la frase anterior)
  const CORTE_DEBIL = new Set(['en', 'con', 'por', 'para', 'desde', 'hasta', 'entre', 'sin', 'sobre', 'hacia', 'bajo', 'tras', 'a', 'al']);
  const FIN_ORACION = /[.?!…]["'»”)]*$/;
  const PAUSA = /[,;:]["'»”)]*$/;

  // palabras: [{ bruta, norm, corte }] (corte = el usuario marcó "/" antes de esta palabra)
  // Devuelve [{ inicio, fin, bloques: [[inicio, fin], …] }] con índices de palabra (fin exclusivo).
  function oraciones(palabras, { maxBloque = 7, minBloque = 2 } = {}) {
    const manual = palabras.some((p) => p.corte);

    // Parte un tramo largo cerca de la mitad, en la palabra de corte más adecuada.
    function partir(s, e) {
      if (e - s <= maxBloque) return [[s, e]];
      for (const nivel of [CORTE_MEDIO, CORTE_DEBIL]) {
        const opciones = [];
        for (let k = s + minBloque; k <= e - minBloque; k++) if (nivel.has(palabras[k].norm)) opciones.push(k);
        if (opciones.length) {
          const mitad = (s + e) / 2;
          const k = opciones.reduce((a, b) => (Math.abs(b - mitad) < Math.abs(a - mitad) ? b : a));
          return [...partir(s, k), ...partir(k, e)];
        }
      }
      return [[s, e]];
    }

    const res = [];
    let inicio = 0;
    palabras.forEach((p, i) => {
      if (FIN_ORACION.test(p.bruta) || i === palabras.length - 1) {
        res.push({ inicio, fin: i + 1 });
        inicio = i + 1;
      }
    });

    for (const o of res) {
      // Primero se corta en la puntuación (o en las marcas "/" si el texto las tiene).
      const tramos = [];
      let s = o.inicio;
      for (let i = o.inicio; i < o.fin; i++) {
        if (manual && palabras[i].corte && i > s) { tramos.push([s, i]); s = i; }
        if (!manual && i < o.fin - 1 && PAUSA.test(palabras[i].bruta)) { tramos.push([s, i + 1]); s = i + 1; }
      }
      tramos.push([s, o.fin]);
      // Enumeraciones ("Mercurio, Venus, …"): un tramo de una palabra se une al siguiente.
      if (!manual) {
        for (let k = 0; k < tramos.length - 1; k++) {
          const [a, b] = tramos[k];
          if (b - a < minBloque && tramos[k + 1][1] - a <= maxBloque) {
            tramos.splice(k, 2, [a, tramos[k + 1][1]]);
            k--;
          }
        }
      }
      o.bloques = manual ? tramos : tramos.reduce((todos, [a, b]) => todos.concat(partir(a, b)), []);
    }
    return res;
  }

  global.Analisis = { silabas, dificultad, normalizar, parecidas, alinear, oraciones };
})(typeof window !== 'undefined' ? window : globalThis);
