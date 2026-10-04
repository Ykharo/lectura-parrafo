// Datos guardados en el navegador del iPad: textos propios, palabras difíciles elegidas e historial.
(function (global) {
  'use strict';

  const CLAVE = 'lectura-parrafo:v1';
  const vacio = () => ({ textos: [], dificiles: {}, historial: [], leidos: [] });

  function leer() {
    try {
      return { ...vacio(), ...JSON.parse(localStorage.getItem(CLAVE)) };
    } catch {
      return vacio();
    }
  }

  function escribir(datos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch {
      // sin almacenamiento disponible (navegación privada): los datos duran hasta cerrar
    }
  }

  function modificar(cambio) {
    const datos = leer();
    cambio(datos);
    escribir(datos);
  }

  const esTexto = (t) => t && typeof t.id === 'string' && typeof t.titulo === 'string' && typeof t.parrafo === 'string';
  const esLectura = (r) => r && typeof r.fecha === 'string' && typeof r.titulo === 'string' && Number.isFinite(r.ppm);
  const claveLectura = (r) => r.fecha + '|' + r.textoId;

  global.Almacen = {
    textosPropios: () => leer().textos,
    agregarTexto: (t) => modificar((d) => { d.textos.push(t); }),
    borrarTexto: (id) => modificar((d) => {
      d.textos = d.textos.filter((t) => t.id !== id);
      delete d.dificiles[id];
    }),

    dificiles: (id) => leer().dificiles[id] || null,
    guardarDificiles: (id, lista) => modificar((d) => { d.dificiles[id] = lista; }),

    // Textos que ya se leyeron completos al menos una vez
    leido: (id) => leer().leidos.indexOf(id) >= 0,
    marcarLeido: (id) => modificar((d) => { if (d.leidos.indexOf(id) < 0) d.leidos.push(id); }),

    historial: () => leer().historial,
    agregarLectura: (r) => modificar((d) => { d.historial.push(r); }),

    exportar: () => leer(),
    // Mezcla un respaldo con lo que ya hay, sin duplicar.
    importar: (respaldo) => modificar((d) => {
      for (const t of respaldo.textos || []) {
        if (esTexto(t) && !d.textos.some((x) => x.id === t.id)) d.textos.push(t);
      }
      Object.assign(d.dificiles, respaldo.dificiles || {});
      const existentes = new Set(d.historial.map(claveLectura));
      for (const r of respaldo.historial || []) {
        if (esLectura(r) && !existentes.has(claveLectura(r))) d.historial.push(r);
      }
      d.historial.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }),
  };
})(window);
