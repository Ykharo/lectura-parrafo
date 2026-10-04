// «El astronauta curioso»: una escena animada por oración.
// data-p = índice de la palabra dentro de su oración (ver js/cuento.js).
(function () {
  'use strict';

  const { estrellas, destello, puntos, astronauta, nino } = window.Cuento;

  // 1 · Lucas(0) sueña(1) con(2) ser(3) astronauta.(4)
  const escena1 = `
    ${estrellas({ n: 22, x: [80, 980], y: [20, 240], semilla: 3 })}
    <path class="trazo tenue" data-p="-1" data-dur="1.4" pathLength="1" d="M60,440 H940"/>

    <path class="trazo" data-p="0" pathLength="1" d="M210,440 V330 Q210,316 224,316 H246 Q260,316 260,330 V440"/>
    <rect class="trazo cuerpo" data-p="0" data-d=".3" pathLength="1" x="260" y="386" width="420" height="30" rx="6"/>
    <path class="trazo" data-p="0" data-d=".5" pathLength="1" d="M680,440 V366 Q680,356 690,356 H700 Q710,356 710,366 V440"/>
    <ellipse class="trazo cuerpo" data-p="0" data-d=".6" pathLength="1" cx="302" cy="376" rx="36" ry="11"/>
    <circle class="trazo cuerpo" data-p="0" data-d=".8" pathLength="1" cx="312" cy="356" r="17"/>
    <path class="trazo fino" data-p="0" data-d="1.1" pathLength="1" d="M298,346 q9,-16 28,-7"/>
    <path class="trazo fino" data-p="0" data-d="1.2" pathLength="1" d="M318,357 q4,3 8,0"/>
    <path class="trazo" data-p="0" data-d="1" data-dur="1.2" pathLength="1" d="M330,374 C390,342 500,344 600,354 C640,358 664,366 678,380"/>
    <text class="zeta aparece" data-p="0" data-d="1.6" x="282" y="322">z</text>
    <text class="zeta aparece" data-p="0" data-d="1.9" x="264" y="300" style="font-size:20px">z</text>
    <text class="zeta aparece" data-p="0" data-d="2.2" x="242" y="274" style="font-size:26px">z</text>

    <g class="flota">
      <circle class="trazo fino" data-p="1" pathLength="1" cx="352" cy="322" r="4"/>
      <circle class="trazo fino" data-p="1" data-d=".2" pathLength="1" cx="382" cy="292" r="7"/>
      <circle class="trazo fino" data-p="1" data-d=".4" pathLength="1" cx="420" cy="258" r="11"/>
      <ellipse class="trazo cuerpo" data-p="1" data-d=".6" data-dur="1.4" pathLength="1" cx="625" cy="170" rx="190" ry="112"/>
      ${astronauta(625, 248, { p: 4, escala: 2.2, brazo: 'saluda' })}
      ${destello(520, 110, 6, 4, 1)}
      ${destello(735, 105, 5, 4, 1.15)}
      ${destello(540, 225, 4, 4, 1.3)}
      ${destello(725, 230, 6, 4, 1.45)}
    </g>`;

  // 2 · Todas(0) las(1) noches(2) mira(3) las(4) estrellas(5) con(6) su(7) telescopio(8)
  //     desde(9) la(10) ventana(11) de(12) su(13) habitación.(14)
  const estrellasVentana = [[640, 92], [700, 140], [662, 232], [782, 104], [872, 214], [712, 262], [852, 272], [630, 152], [796, 236], [690, 210]];
  const escena2 = `
    <path class="trazo tenue" data-p="-1" data-dur="1.4" pathLength="1" d="M60,440 H940"/>

    <path class="trazo" data-p="2" data-dur="1.2" pathLength="1" d="M836,92 A34,34 0 1 0 836,152 A28,28 0 1 1 836,92"/>
    ${nino(330, 440, { p: 3, escala: 1.9, brazo: 'mira' })}
    ${estrellasVentana.map(([x, y], k) => destello(x, y, 3 + (k % 3), 5, k * 0.12)).join('')}

    <path class="trazo cuerpo" data-p="8" pathLength="1" d="M353.8,329.5 L531.4,237.4 L540.2,255.4 L358.2,338.5 Z"/>
    <path class="trazo" data-p="8" data-d=".5" pathLength="1" d="M458,296 L420,440"/>
    <path class="trazo" data-p="8" data-d=".6" pathLength="1" d="M458,296 L500,440"/>
    <path class="trazo" data-p="8" data-d=".7" pathLength="1" d="M458,296 L462,440"/>

    <rect class="trazo" data-p="11" data-dur="1.3" pathLength="1" x="600" y="60" width="300" height="240" rx="4"/>
    <path class="trazo fino" data-p="11" data-d=".6" pathLength="1" d="M750,60 V300"/>
    <path class="trazo fino" data-p="11" data-d=".7" pathLength="1" d="M600,180 H900"/>
    <path class="trazo" data-p="11" data-d=".9" pathLength="1" d="M584,300 H916"/>

    <path class="trazo tenue" data-p="14" pathLength="1" d="M572,46 H928"/>
    <path class="trazo fino" data-p="14" data-d=".2" pathLength="1" d="M600,46 C588,110 612,190 594,300"/>
    <path class="trazo fino" data-p="14" data-d=".3" pathLength="1" d="M616,46 C604,110 628,190 610,300"/>
    <path class="trazo fino" data-p="14" data-d=".2" pathLength="1" d="M900,46 C912,110 888,190 906,300"/>
    <path class="trazo fino" data-p="14" data-d=".3" pathLength="1" d="M884,46 C896,110 872,190 890,300"/>
    <rect class="trazo fino" data-p="14" data-d=".5" pathLength="1" x="120" y="120" width="110" height="80" rx="3"/>
    <circle class="trazo fino" data-p="14" data-d=".8" pathLength="1" cx="175" cy="160" r="14"/>
    <ellipse class="trazo fino" data-p="14" data-d=".9" pathLength="1" cx="175" cy="160" rx="27" ry="6"/>`;

  // 3 · Ya(0) conoce(1) el(2) nombre(3) de(4) varios(5) planetas:(6) Mercurio,(7) Venus,(8) Marte(9) y(10) Júpiter.(11)
  const escena3 = `
    ${estrellas({ n: 46, x: [180, 980], y: [20, 420], semilla: 7 })}
    <path class="trazo tenue" data-p="-1" data-dur="1.4" pathLength="1" d="M20,474 Q170,452 330,476"/>

    <circle class="trazo fino" data-p="5" data-dur="1.6" pathLength="1" cx="-60" cy="40" r="150"/>
    <line class="trazo fino" data-p="5" data-d=".6" pathLength="1" x1="105" y1="40" x2="125" y2="40"/>
    <line class="trazo fino" data-p="5" data-d=".75" pathLength="1" x1="95" y1="96" x2="114" y2="103"/>
    <line class="trazo fino" data-p="5" data-d=".9" pathLength="1" x1="66" y1="146" x2="82" y2="159"/>
    <line class="trazo fino" data-p="5" data-d="1.05" pathLength="1" x1="22" y1="183" x2="32" y2="200"/>

    <path class="trazo tenue" data-p="6" data-dur="1.6" pathLength="1" d="M110,150 Q480,330 960,200"/>

    <g class="flota" style="--f:0s">
      <circle class="trazo cuerpo" data-p="7" pathLength="1" cx="247" cy="205" r="11"/>
      <circle class="trazo fino" data-p="7" data-d=".5" pathLength="1" cx="243" cy="202" r="2.2"/>
      <circle class="trazo fino" data-p="7" data-d=".65" pathLength="1" cx="251" cy="209" r="1.6"/>
      <text class="rotulo aparece" data-p="7" data-d=".3" x="247" y="244">Mercurio</text>
    </g>
    <g class="flota" style="--f:-1.2s">
      <circle class="trazo cuerpo" data-p="8" pathLength="1" cx="391" cy="239" r="19"/>
      <path class="trazo fino" data-p="8" data-d=".5" pathLength="1" d="M378,234 q8,-6 18,-1"/>
      <path class="trazo fino" data-p="8" data-d=".65" pathLength="1" d="M381,246 q9,5 19,-2"/>
      <text class="rotulo aparece" data-p="8" data-d=".3" x="391" y="286">Venus</text>
    </g>
    <g class="flota" style="--f:-2.3s">
      <circle class="trazo cuerpo" data-p="9" pathLength="1" cx="559" cy="254" r="15"/>
      <path class="trazo fino" data-p="9" data-d=".5" pathLength="1" d="M551,243 q8,-5 16,0"/>
      <circle class="trazo fino" data-p="9" data-d=".65" pathLength="1" cx="563" cy="258" r="3"/>
      <text class="rotulo aparece" data-p="9" data-d=".3" x="559" y="297">Marte</text>
    </g>
    <g class="flota" style="--f:-3.1s">
      <circle class="trazo cuerpo" data-p="11" data-dur="1.2" pathLength="1" cx="791" cy="237" r="50"/>
      <path class="trazo fino" data-p="11" data-d=".5" pathLength="1" d="M748,211 H834"/>
      <path class="trazo fino" data-p="11" data-d=".6" pathLength="1" d="M742,228 H840"/>
      <path class="trazo fino" data-p="11" data-d=".7" pathLength="1" d="M742,245 H840"/>
      <path class="trazo fino" data-p="11" data-d=".8" pathLength="1" d="M748,262 H834"/>
      <ellipse class="trazo cuerpo" data-p="11" data-d="1" pathLength="1" cx="808" cy="252" rx="9" ry="5"/>
      <text class="rotulo aparece" data-p="11" data-d=".4" x="791" y="317">Júpiter</text>
    </g>

    <circle class="fantasma aparece" data-p="6" data-d=".9" data-hasta="7" cx="247" cy="205" r="11"/>
    <circle class="fantasma aparece" data-p="6" data-d="1.1" data-hasta="8" cx="391" cy="239" r="19"/>
    <circle class="fantasma aparece" data-p="6" data-d="1.3" data-hasta="9" cx="559" cy="254" r="15"/>
    <circle class="fantasma aparece" data-p="6" data-d="1.5" data-hasta="11" cx="791" cy="237" r="50"/>

    ${astronauta(150, 468, { p: 0, escala: 1.5, brazo: 'saluda' })}
    ${puntos(186, 380, 224, 268, 7, 3)}`;

  // 4 · Su(0) favorito(1) es(2) Saturno,(3) porque(4) tiene(5) unos(6) anillos(7) espectaculares.(8)
  const escena4 = `
    ${estrellas({ n: 46, x: [40, 980], y: [20, 440], semilla: 11 })}
    <path class="trazo tenue" data-p="-1" data-dur="1.2" pathLength="1" d="M40,472 H300"/>
    ${nino(150, 470, { p: 0, escala: 1.2, brazo: 'apunta' })}
    <path class="trazo" data-p="1" pathLength="1" d="M165,366 C161,356 145,357 147,370 C149,380 165,388 165,388 C165,388 181,380 183,370 C185,357 169,356 165,366 Z"/>

    <g class="flota">
      <g transform="rotate(-14 600 240)">
        <path class="trazo fino" data-p="7" data-dur="1.2" pathLength="1" d="M380,240 A220,50 0 0 1 820,240"/>
        <path class="trazo tenue" data-p="7" data-d=".3" data-dur="1.2" pathLength="1" d="M415,240 A185,40 0 0 1 785,240"/>
      </g>
      <circle class="trazo cuerpo" data-p="3" data-dur="1.4" pathLength="1" cx="600" cy="240" r="100"/>
      <path class="trazo fino" data-p="3" data-d=".6" pathLength="1" d="M515,200 Q600,186 685,200"/>
      <path class="trazo fino" data-p="3" data-d=".75" pathLength="1" d="M504,252 Q600,238 696,252"/>
      <g transform="rotate(-14 600 240)">
        <path class="trazo" data-p="7" data-dur="1.2" pathLength="1" d="M380,240 A220,50 0 0 0 820,240"/>
        <path class="trazo fino" data-p="7" data-d=".3" data-dur="1.2" pathLength="1" d="M415,240 A185,40 0 0 0 785,240"/>
      </g>
    </g>
    ${destello(352, 190, 8, 8, 0)}
    ${destello(858, 300, 7, 8, 0.15)}
    ${destello(470, 338, 6, 8, 0.3)}
    ${destello(762, 150, 6, 8, 0.45)}
    ${destello(828, 208, 4, 8, 0.6)}
    <text class="rotulo aparece" data-p="3" data-d=".8" x="600" y="390">Saturno</text>`;

  // 5 · Algún(0) día,(1) Lucas(2) quiere(3) viajar(4) por(5) el(6) espacio(7) y(8) descubrir(9) un(10)
  //     planeta(11) nuevo(12) para(13) ponerle(14) el(15) nombre(16) de(17) su(18) perro.(19)
  const cohete = `
    <g transform="translate(240 444) scale(1.3)" style="--g:1.54">
      <path class="trazo cuerpo" data-p="4" pathLength="1" d="M-12,0 L-12,-52 Q0,-86 12,-52 L12,0 Z"/>
      <circle class="trazo fino" data-p="4" data-d=".5" pathLength="1" cx="0" cy="-50" r="5"/>
      <path class="trazo" data-p="4" data-d=".6" pathLength="1" d="M-12,-12 L-22,4 L-12,0"/>
      <path class="trazo" data-p="4" data-d=".7" pathLength="1" d="M12,-12 L22,4 L12,0"/>
      <path class="trazo fino" data-p="7" pathLength="1" d="M-6,4 L0,20 L6,4"/>
    </g>`;
  const perro = `
    <g transform="translate(842 241) scale(1.3)" style="--g:1.54">
      <ellipse class="trazo cuerpo" data-p="19" pathLength="1" cx="0" cy="-12" rx="13" ry="7"/>
      <path class="trazo" data-p="19" data-d=".2" pathLength="1" d="M-8,-6 V0 M-3,-6 V0 M4,-6 V0 M9,-6 V0"/>
      <path class="trazo" data-p="19" data-d=".35" pathLength="1" d="M-13,-14 q-8,-4 -7,-11"/>
      <circle class="trazo cuerpo" data-p="19" data-d=".4" pathLength="1" cx="13" cy="-22" r="6"/>
      <path class="trazo" data-p="19" data-d=".6" pathLength="1" d="M10,-27 L8,-34 L15,-28"/>
      <circle class="trazo fino" data-p="19" data-d=".8" pathLength="1" cx="13" cy="-22" r="10"/>
    </g>`;
  const escena5 = `
    ${estrellas({ n: 50, x: [20, 980], y: [20, 360], semilla: 19 })}
    <circle class="trazo" data-p="1" data-dur="1.6" pathLength="1" cx="60" cy="650" r="270"/>
    <path class="trazo fino" data-p="1" data-d=".7" pathLength="1" d="M40,422 q30,-14 55,4 q20,16 48,2"/>
    ${astronauta(165, 401, { p: 2, escala: 1.4, brazo: 'saluda' })}
    ${cohete}
    ${puntos(240, 330, 728, 250, 16, 7, { retraso: 0.07, control: [500, 20] })}

    <g class="flota">
      <circle class="trazo cuerpo" data-p="11" data-dur="1.2" pathLength="1" cx="800" cy="300" r="72"/>
      <circle class="trazo fino" data-p="12" pathLength="1" cx="782" cy="290" r="8"/>
      <circle class="trazo fino" data-p="12" data-d=".2" pathLength="1" cx="820" cy="322" r="5"/>
      <circle class="trazo fino" data-p="12" data-d=".3" pathLength="1" cx="770" cy="330" r="3"/>
      <path class="trazo" data-p="14" pathLength="1" d="M800,228 V160"/>
      <path class="trazo" data-p="14" data-d=".4" pathLength="1" d="M800,160 L846,171 L800,183"/>
      ${perro}
    </g>
    ${destello(890, 230, 6, 12, 0.4)}
    ${destello(712, 236, 5, 12, 0.55)}`;

  window.CUENTOS.astronauta = {
    audio: 'assets/audio/astronauta.wav',
    tiempos: 'assets/audio/astronauta.json',
    escenas: [escena1, escena2, escena3, escena4, escena5],
  };
})();
