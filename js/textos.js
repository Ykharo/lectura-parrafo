// Textos incluidos en la aplicación. Los que se agregan desde la app se guardan en el iPad.
// Para sumar uno aquí: copia un bloque y usa un `id` nuevo (sin espacios ni tildes).
// Opcional: marca con " / " los bloques con sentido para la etapa «Frases». Si un texto no
// tiene ninguna marca, los bloques se calculan solos (puntuación y palabras como y, que, con…).
// Opcional: `cuento` enlaza escenas animadas (js/cuentos/<id>.js): una por oración o por grupo de oraciones.
window.TEXTOS = [
  {
    id: 'tortuga',
    titulo: 'La tortuga del jardín',
    parrafo:
      'Una mañana de primavera, Sofía descubrió una pequeña tortuga escondida entre las flores del jardín. ' +
      'Tenía un caparazón brillante con manchas amarillas. Sofía la llevó con mucho cuidado hasta el estanque, ' +
      'donde la tortuga nadó tranquila entre los peces. Desde ese día, todas las tardes, Sofía la visitaba ' +
      'y le llevaba hojas frescas de lechuga.',
  },
  {
    id: 'midas',
    titulo: 'El rey Midas',
    cuento: 'midas', // escenas en estilo jarrón griego en js/cuentos/midas.js
    parrafo:
      'El rey Midas amaba el oro más que nada en el mundo. Un día, el dios Dioniso le concedió un deseo muy especial. ' +
      'Midas pidió que todo lo que tocara se convirtiera en oro brillante. Al principio estaba feliz y tocó las flores, ' +
      'las sillas y las piedras del jardín. Pero cuando quiso comer, el pan y las uvas también se volvieron de oro. ' +
      'Tenía mucha hambre y mucha sed, y comenzó a llorar. Entonces le rogó a Dioniso que le quitara ese poder. ' +
      'El dios le dijo que se lavara en el río, y así lo hizo. Desde ese día, Midas prefirió una mesa con comida ' +
      'antes que un palacio de oro.',
  },
  {
    id: 'ballena',
    titulo: 'La ballena del sur',
    parrafo:
      'En las frías aguas del sur de Chile / vive una ballena azul enorme, / más grande que un bus. ' +
      'Cada mañana / sale a respirar / y lanza un chorro de agua muy alto. Los pescadores la saludan / desde ' +
      'sus botes de colores. Aunque es gigante, / la ballena se alimenta / de animales diminutos / llamados krill. ' +
      'Cuando nada tranquila, / parece una isla / que se mueve lentamente por el mar.',
  },
  {
    id: 'copihue',
    titulo: 'El copihue',
    parrafo:
      'En el bosque del sur / crece una flor roja / con forma de campana / llamada copihue. Es la flor nacional ' +
      'de Chile. Sus pétalos brillan / entre las hojas verdes / de los árboles más altos. Cuenta una leyenda / ' +
      'que el copihue nació / de las lágrimas / de dos jóvenes enamorados. Por eso, / cada vez que alguien ' +
      'encuentra uno, / lo mira con cariño / y nunca lo arranca.',
  },
  {
    id: 'empanadas',
    titulo: 'Las empanadas de la abuela',
    parrafo:
      'Para las Fiestas Patrias, la abuela Rosa prepara empanadas de pino. Primero amasa con sus manos ' +
      'fuertes y luego pica la cebolla, la carne y los huevos. Martina la ayuda a poner una aceituna dentro ' +
      'de cada empanada. Cuando salen del horno, toda la casa huele delicioso. La familia se sienta junta ' +
      'a la mesa y celebra con alegría.',
  },
  {
    id: 'astronauta',
    titulo: 'El astronauta curioso',
    cuento: 'astronauta', // escenas animadas en js/cuentos/astronauta.js
    parrafo:
      'Lucas sueña con ser astronauta. Todas las noches mira las estrellas con su telescopio desde la ' +
      'ventana de su habitación. Ya conoce el nombre de varios planetas: Mercurio, Venus, Marte y Júpiter. ' +
      'Su favorito es Saturno, porque tiene unos anillos espectaculares. Algún día, Lucas quiere viajar por ' +
      'el espacio y descubrir un planeta nuevo para ponerle el nombre de su perro.',
  },
];
