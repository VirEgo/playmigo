import {
  Activity,
  ChoicePuzzle,
  Colour,
  Constraint,
  Difficulty,
  Hints,
  LogicIconName,
  PlacementPuzzle,
  Puzzle,
  Shape,
  Tile,
} from './logic-exercise';

export const COLOURS = { red: 'rojo', blue: 'azul', green: 'verde', yellow: 'amarillo' };
const SHAPES = { circle: 'círculo', triangle: 'triángulo', square: 'cuadrado', star: 'estrella' };
function figure(id: string, shape: Shape, colour: Colour, small = false): Tile {
  return {
    id,
    shape,
    colour,
    small,
    label: `${SHAPES[shape]} ${COLOURS[colour]}${small ? ' pequeño' : ' grande'}`,
  };
}
function tile(label: string, id = label, icon?: LogicIconName): Tile {
  return { id, label, icon };
}
function numbers(values: readonly number[]): Tile[] {
  return values.map((value) => tile(String(value)));
}
function hints(attention: string, strategy: string, example: string): Hints {
  return [attention, strategy, example];
}
function choice(
  instructions: string,
  display: readonly Tile[],
  options: readonly Tile[],
  solution: string,
  explanation: string,
  help: Hints,
): ChoicePuzzle {
  return { kind: 'choice', instructions, display, options, solution, explanation, hints: help };
}
const animals = [
  tile('Zorro', 'fox', 'fox'),
  tile('Gato', 'cat', 'cat'),
  tile('Conejo', 'rabbit', 'rabbit'),
];
const houses = [
  tile('Casa roja', 'red', 'house'),
  tile('Casa azul', 'blue', 'house'),
  tile('Casa verde', 'green', 'house'),
];
function deduction(
  layout: PlacementPuzzle['layout'],
  items: readonly Tile[],
  targets: readonly Tile[],
  variant: number,
  instructions: string,
): PlacementPuzzle {
  const assigned = items.map((_, i) => targets[(i + variant) % 3]);
  const constraints: Constraint[] = [
    { type: 'at', item: items[0].id, target: assigned[0].id },
    { type: 'not-at', item: items[1].id, target: assigned[2].id },
  ];
  return {
    kind: 'placement',
    layout,
    items,
    targets,
    exclusive: true,
    constraints,
    instructions,
    clues: [
      `${items[0].label}: ${assigned[0].label}.`,
      `${items[1].label} no corresponde a ${assigned[2].label}.`,
      'Hay uno en cada lugar.',
    ],
    solution: Object.fromEntries(items.map((item, i) => [item.id, assigned[i].id])),
    hints: hints(
      'Empieza por la pista que dice un lugar exacto.',
      'Ocupa ese lugar. Usa la pista con «no» para los dos que quedan.',
      `${items[0].label} ya tiene lugar. Para ${items[1].label}, descarta ${assigned[2].label}.`,
    ),
    explanation:
      'La primera pista fija un lugar. La segunda descarta otro. El último lugar se deduce porque no se repiten.',
  };
}
const activities: Activity[] = [];
function add(
  id: string,
  title: string,
  objective: string,
  difficulty: Difficulty,
  icon: LogicIconName,
  build: (v: number) => Puzzle,
  count = 3,
): void {
  activities.push({
    id,
    title,
    objective,
    difficulty,
    icon,
    variants: Array.from({ length: count }, (_, v) => ({ id: `v${v + 1}`, puzzle: build(v) })),
  });
}

add(
  'logic-01',
  '¿Qué figura sigue?',
  'Reconocer una unidad que se repite.',
  1,
  'circle',
  (v) => {
    const a = figure('a', 'circle', 'red');
    const b = figure('b', 'square', 'blue');
    const c = figure('c', 'triangle', 'green');
    const unit = [
      [a, b],
      [a, a, b],
      [a, b, b],
      [a, b, c],
    ][v];
    const sequence = [...unit, ...unit];
    return choice(
      'La misma regla se repite. ¿Qué figura viene ahora?',
      sequence.map((item, i) => ({ ...item, id: `s${i}` })),
      [b, c, a, figure('d', 'star', 'yellow')],
      'a',
      'La secuencia vuelve al principio de su grupo. La primera figura del grupo va otra vez.',
      hints(
        'Mira la forma y el color.',
        'Busca un grupo que aparezca dos veces.',
        `El grupo tiene ${unit.length} figuras. Después de dos grupos, empieza otro igual.`,
      ),
    );
  },
  4,
);
add(
  'logic-02',
  'El intruso',
  'Clasificar por una sola propiedad y explicar la decisión.',
  1,
  'search',
  (v) => {
    const shapes: Shape[] = ['circle', 'triangle', 'square'];
    const items = Array.from({ length: 5 }, (_, i) =>
      figure(`o${i}`, i === v + 1 ? 'star' : shapes[v], 'red'),
    );
    return {
      ...choice(
        'Todas son rojas. Busca la figura con otra forma y explica por qué.',
        [],
        items,
        `o${v + 1}`,
        'El intruso tiene otra forma. Todas las figuras tienen el mismo color y tamaño.',
        hints(
          'Fíjate solo en la forma.',
          'Busca la forma que se repite cuatro veces.',
          'Compara el contorno de cada figura con el de sus vecinas.',
        ),
      ),
      reasons: [
        tile('Tiene otra forma.', 'shape'),
        tile('Tiene otro color.', 'colour'),
        tile('Tiene otro tamaño.', 'size'),
      ],
      reason: 'shape',
    };
  },
);
add('logic-03', 'Las cajas mágicas', 'Agrupar objetos según una regla visible.', 1, 'box', (v) => {
  const items = [
    figure('a', 'circle', 'red', true),
    figure('b', 'square', 'blue'),
    figure('c', 'circle', 'blue'),
    figure('d', 'square', 'red', true),
  ];
  const targets =
    v === 0
      ? [tile('Rojo', 'red'), tile('Azul', 'blue')]
      : v === 1
        ? [tile('Círculos', 'circle'), tile('Cuadrados', 'square')]
        : [tile('Pequeñas', 'small'), tile('Grandes', 'large')];
  return {
    kind: 'placement',
    layout: 'boxes',
    instructions: `Guarda cada figura en su caja según ${['el color', 'la forma', 'el tamaño'][v]}.`,
    items,
    targets,
    exclusive: false,
    clues: [],
    solution: Object.fromEntries(
      items.map((item) => [
        item.id,
        v === 0 ? item.colour! : v === 1 ? item.shape! : item.small ? 'small' : 'large',
      ]),
    ),
    hints: hints(
      `Mira ${['el color', 'la forma', 'el tamaño'][v]}.`,
      'Lee el nombre de las cajas. Selecciona una figura y después su caja.',
      'Coloca primero una figura de cada grupo. Compara las demás con esas dos.',
    ),
    explanation:
      'Cada caja reúne las figuras que cumplen su regla, aunque tengan otras diferencias.',
  };
});
add(
  'logic-04',
  'Completa el camino',
  'Descubrir saltos constantes entre números.',
  1,
  'footprints',
  (v) => {
    const step = [1, 2, -1, -2][v];
    const start = [2, 1, 9, 12][v];
    const sequence = Array.from({ length: 5 }, (_, i) => start + i * step);
    const result = sequence.at(-1)!;
    return choice(
      'Da siempre el mismo salto. ¿Qué número falta al final?',
      numbers(sequence.slice(0, -1)),
      numbers([result + 1, result, result + 3, Math.max(0, result - 1)]),
      String(result),
      `En cada paso ${step > 0 ? 'sumamos' : 'restamos'} ${Math.abs(step)}. El último número es ${result}.`,
      hints(
        'Compara dos números vecinos.',
        `Prueba a ${step > 0 ? 'sumar' : 'restar'} lo mismo en cada paso.`,
        `De ${sequence[0]} a ${sequence[1]} hay un salto de ${Math.abs(step)}. Haz ese salto una vez más al final.`,
      ),
    );
  },
  4,
);
add(
  'logic-05',
  'La balanza de frutas',
  'Deducir el valor de cantidades iguales.',
  1,
  'scale',
  (v) => {
    const value = v + 2;
    return {
      ...choice(
        v < 2
          ? 'Dos manzanas pesan lo mismo. ¿Cuánto vale una?'
          : 'Usa las dos balanzas. ¿Cuánto vale un plátano?',
        [],
        numbers([value + 1, value - 1, value, value + 2]),
        String(value),
        v < 2
          ? `Dos partes iguales de ${value * 2} valen ${value} cada una.`
          : `Cada manzana vale 3. Si manzana y plátano valen ${value + 3}, el plátano vale ${value}.`,
        hints(
          'Las frutas iguales valen lo mismo.',
          v < 2
            ? 'Reparte el total en dos grupos iguales.'
            : 'Averigua primero cuánto vale la manzana.',
          v < 2
            ? `Prueba con dos grupos que sumen ${value * 2}.`
            : `Quita el valor de la manzana al total ${value + 3}.`,
        ),
      ),
      balance: true,
      equations:
        v < 2
          ? [
              {
                left: [tile('Manzana', 'a1', 'apple'), tile('Manzana', 'a2', 'apple')],
                total: value * 2,
              },
            ]
          : [
              { left: [tile('Manzana', 'a1', 'apple'), tile('Manzana', 'a2', 'apple')], total: 6 },
              {
                left: [tile('Manzana', 'a3', 'apple'), tile('Plátano', 'b1', 'banana')],
                total: value + 3,
              },
            ],
    };
  },
);
add(
  'logic-06',
  'El espejo mágico',
  'Reproducir una reflexión respecto a un eje vertical.',
  1,
  'mirror',
  (v) => ({
    kind: 'symmetry',
    size: v === 2 ? 6 : 4,
    given: [
      [0, 5, 8],
      [1, 4, 9, 12],
      [0, 7, 14, 18, 25, 32],
    ][v],
    instructions: 'El centro es un espejo. Marca a la derecha las casillas reflejadas.',
    hints: hints(
      'Mira la distancia de cada casilla al espejo.',
      'En la misma fila, cuenta las casillas desde el centro.',
      'La casilla pegada al espejo se refleja en la casilla pegada al otro lado.',
    ),
    explanation: 'Cada pareja está en la misma fila y a la misma distancia del espejo.',
  }),
);
add(
  'logic-07',
  '¿Dónde vive cada animal?',
  'Combinar pistas y descartar posiciones.',
  1,
  'house',
  (v) =>
    deduction('boxes', animals, houses, v, 'Pon un animal en cada casa. Sigue todas las pistas.'),
);
add(
  'logic-08',
  'La máquina mágica',
  'Inferir una función a partir de ejemplos.',
  1,
  'settings',
  (v) => {
    const delta = [2, -1, 3][v];
    const result = 5 + delta;
    return {
      kind: 'machine',
      steps: [{ operation: 'add', value: delta }],
      examples: [2, 3],
      input: 5,
      showSteps: false,
      rules: [tile('Suma 2', 'plus2'), tile('Resta 1', 'minus1'), tile('Suma 3', 'plus3')],
      rule: ['plus2', 'minus1', 'plus3'][v],
      options: [result + 1, result - 1, result, result + 2],
      instructions: 'Prueba números. Elige la regla y predice qué sale si entra el 5.',
      hints: hints(
        'Compara lo que entra y lo que sale.',
        'Cuenta cuánto se añade o se quita en los dos ejemplos.',
        `Prueba con el 4. Aplica el mismo cambio al 5.`,
      ),
      explanation: `La máquina ${delta > 0 ? 'suma' : 'resta'} ${Math.abs(delta)}. Por eso, del 5 sale el ${result}.`,
    };
  },
);
add(
  'logic-09',
  'Dos reglas a la vez',
  'Aplicar la intersección de dos atributos.',
  2,
  'target',
  (v) => {
    const items = [
      figure('a', 'circle', 'red', true),
      figure('b', 'square', 'red'),
      figure('c', 'triangle', 'blue', true),
      figure('d', 'square', 'red', true),
      figure('e', 'circle', 'blue'),
      figure('f', 'triangle', 'green'),
    ];
    const predicates = [
      (item: Tile) => item.colour === 'red' && item.small,
      (item: Tile) => item.colour === 'blue' && item.shape === 'circle',
      (item: Tile) => item.shape === 'triangle' && item.small,
    ];
    return {
      kind: 'selection',
      items,
      solution: items.filter(predicates[v]).map((item) => item.id),
      instructions: [
        'Selecciona todas las figuras rojas y pequeñas.',
        'Selecciona todos los círculos azules.',
        'Selecciona todos los triángulos pequeños.',
      ][v],
      hints: hints(
        'Hay dos reglas. Una sola no basta.',
        'Revisa cada figura: ¿cumple la primera regla y también la segunda?',
        'Una figura que falla una regla se queda sin marcar. Busca también si hay más de una correcta.',
      ),
      explanation: 'Has elegido todas las figuras que cumplen las dos reglas al mismo tiempo.',
    };
  },
);
add(
  'logic-10',
  'Los círculos secretos',
  'Entender conjuntos, intersección y elementos externos.',
  2,
  'venn',
  (v) => {
    const colour: Colour = ['red', 'blue', 'green'][v] as Colour;
    const other: Colour = colour === 'red' ? 'blue' : 'red';
    const items = [
      figure('a', 'square', colour),
      figure('b', 'circle', other),
      figure('c', 'circle', colour),
      figure('d', 'triangle', other),
    ];
    return {
      kind: 'placement',
      layout: 'venn',
      exclusive: false,
      items,
      targets: [
        tile(`Solo ${COLOURS[colour]}`, 'left'),
        tile('Las dos reglas', 'both'),
        tile('Solo círculos', 'right'),
        tile('Fuera de ambos', 'outside'),
      ],
      solution: { a: 'left', b: 'right', c: 'both', d: 'outside' },
      clues: [`Círculo izquierdo: color ${COLOURS[colour]}.`, 'Círculo derecho: forma de círculo.'],
      instructions: 'Coloca las figuras: una regla, las dos reglas o ninguna.',
      hints: hints(
        'Comprueba el color y la forma por separado.',
        'Si cumple las dos reglas, va en el centro compartido.',
        `Una figura que no sea ${COLOURS[colour]} ni círculo va fuera de ambos.`,
      ),
      explanation:
        'El centro contiene las figuras que cumplen ambas reglas. Fuera quedan las que no cumplen ninguna.',
    };
  },
);
add(
  'logic-11',
  'El puente de los animales',
  'Ordenar a partir de relaciones de izquierda y derecha.',
  2,
  'bridge',
  (v) => {
    const solution = animals.map((_, i) => animals[(i + v) % 3]);
    return {
      kind: 'order',
      items: [solution[2], solution[0], solution[1]],
      solution: solution.map((item) => item.id),
      constraints: [
        { type: 'before', item: solution[0].id, other: solution[1].id },
        { type: 'before', item: solution[1].id, other: solution[2].id },
      ],
      clues: [
        `${solution[0].label} está a la izquierda de ${solution[1].label}.`,
        `${solution[2].label} está a la derecha de ${solution[1].label}.`,
      ],
      instructions: 'Ordena los animales de izquierda a derecha.',
      hints: hints(
        'Busca el animal que aparece en las dos pistas.',
        'Ese animal tiene uno a cada lado.',
        `Coloca a ${solution[1].label} en el centro y revisa las dos pistas.`,
      ),
      explanation:
        'El animal del centro une las dos pistas. Uno queda a su izquierda y el otro a su derecha.',
    };
  },
);
add(
  'logic-12',
  'El robot viajero',
  'Planificar y ejecutar instrucciones espaciales.',
  2,
  'bot',
  (v) => ({
    kind: 'grid',
    mode: 'robot',
    size: 4,
    start: [12, 0, 15][v],
    goal: [3, 15, 0][v],
    blocked: [
      [5, 6],
      [5, 9],
      [6, 10],
    ][v],
    instructions: 'Prepara las flechas y pulsa Ejecutar para llevar el robot a la estrella.',
    hints: hints(
      'Busca el robot, la estrella y los muros.',
      'Planea un camino por casillas vecinas antes de añadir flechas.',
      'Puedes rodear los muros por el borde. Cada flecha avanza una casilla.',
    ),
    explanation: 'Tu programa llega a la estrella sin salir del tablero ni atravesar muros.',
  }),
);
add(
  'logic-13',
  'El número escondido',
  'Encontrar un término desconocido de una igualdad.',
  2,
  'binary',
  (v) => {
    const equations = ['□ + 4 = 11', '12 − □ = 5', '□ − 3 = 6'];
    const results = [7, 7, 9];
    return choice(
      '¿Qué número se esconde en el cuadrado?',
      [tile(equations[v])],
      numbers([results[v] - 2, results[v] + 1, results[v], results[v] - 1]),
      String(results[v]),
      `Al poner ${results[v]} en el cuadrado, los dos lados de la igualdad valen lo mismo.`,
      hints(
        'Los dos lados deben valer lo mismo.',
        'Prueba una ficha y haz la operación completa.',
        v === 0
          ? 'Busca cuánto falta desde 4 hasta 11.'
          : v === 1
            ? 'Piensa cuánto debes quitar a 12 para llegar a 5.'
            : 'Busca un número que, al quitarle 3, deje 6.',
      ),
    );
  },
);
add(
  'logic-14',
  'El código de colores',
  'Sustituir símbolos por valores y sumar.',
  2,
  'palette',
  (v) => ({
    kind: 'code',
    key: [
      { tile: figure('r', 'circle', 'red'), value: 2 + v },
      { tile: figure('b', 'square', 'blue'), value: 3 + v },
      { tile: figure('g', 'triangle', 'green'), value: 5 },
    ],
    terms: [
      ['r', 'b', 'g'],
      ['r', 'r', 'b'],
      ['b', 'g', 'g'],
    ][v],
    instructions: 'Usa la clave. ¿Cuánto suman las figuras?',
    hints: hints(
      'Cada figura tiene un valor en la clave.',
      'Cambia cada figura por su número y suma en orden.',
      'Suma primero las dos primeras. Después añade el valor de la tercera.',
    ),
    explanation: 'Has cambiado cada símbolo por su valor y has sumado todos los términos.',
  }),
);
add(
  'logic-15',
  'La torre de bloques',
  'Comparar alturas y ordenar relaciones.',
  2,
  'blocks',
  (v) => {
    const items = [tile('Torre A', 'a'), tile('Torre B', 'b'), tile('Torre C', 'c')].map(
      (item, i) => ({
        ...item,
        height: [
          [4, 2, 6],
          [3, 5, 1],
          [5, 2, 4],
        ][v][i],
      }),
    );
    const sorted = [...items].sort((a, b) => a.height - b.height);
    return {
      kind: 'order',
      items,
      solution: sorted.map((item) => item.id),
      clues:
        v === 2
          ? [
              `${sorted[0].label} es más baja que ${sorted[1].label}.`,
              `${sorted[1].label} es más baja que ${sorted[2].label}.`,
            ]
          : [],
      instructions: 'Ordena las torres de la más baja a la más alta.',
      hints: hints(
        'Todas las torres empiezan en el mismo suelo.',
        'Cuenta los bloques o sigue las pistas de «más baja».',
        'Coloca primero la torre con menos bloques; compara después las otras dos.',
      ),
      explanation: `De menor a mayor: ${sorted.map((item) => `${item.label}, ${item.height} bloques`).join('; ')}.`,
    };
  },
);
add(
  'logic-16',
  '¿Qué ha cambiado?',
  'Identificar y aplicar una transformación.',
  2,
  'sparkles',
  (v) => {
    const source: Shape = ['circle', 'square', 'triangle'][v] as Shape;
    const output: Shape = v === 0 ? source : 'star';
    const colour: Colour = v === 1 ? 'red' : 'blue';
    return choice(
      'Observa los ejemplos de izquierda a derecha. Transforma la última figura.',
      [
        figure('e1', 'triangle', 'red'),
        tile('→', 'arrow1'),
        figure('e2', v === 0 ? 'triangle' : 'star', colour),
        figure('e3', 'square', 'red'),
        tile('→', 'arrow2'),
        figure('e4', v === 0 ? 'square' : 'star', colour),
        figure('question', source, 'red'),
        tile('→ ?', 'questionmark'),
      ],
      [
        figure('a', output, colour),
        figure('b', source, 'green'),
        figure('c', 'star', 'yellow'),
        figure('d', 'square', 'green'),
      ],
      'a',
      [
        'Cambia el color rojo por azul y conserva la forma.',
        'Cambia la forma por una estrella y conserva el rojo.',
        'Cambia la forma por una estrella y el color por azul.',
      ][v],
      hints(
        'Mira qué cambia y qué se conserva.',
        'Comprueba tu regla en los dos ejemplos.',
        'Aplica exactamente esos cambios a la última figura.',
      ),
    );
  },
);
add(
  'logic-17',
  'El misterio de las mascotas',
  'Resolver una correspondencia con pistas y eliminación.',
  3,
  'paw',
  (v) =>
    deduction(
      'logic',
      [tile('Perro', 'dog', 'dog'), tile('Gato', 'cat', 'cat'), tile('Conejo', 'rabbit', 'rabbit')],
      [tile('Ana', 'ana'), tile('Luis', 'luis'), tile('Marta', 'marta')],
      v,
      'Descubre qué mascota tiene cada niño. Puedes marcar descartes en la tabla.',
    ),
);
add(
  'logic-18',
  'La máquina de dos pasos',
  'Componer dos transformaciones en orden.',
  3,
  'wrench',
  (v) => {
    const input = [4, 3, 5][v];
    const add = [2, 1, -1][v];
    const result = (input + add) * 2;
    return {
      kind: 'machine',
      steps: [
        { operation: 'add', value: add },
        { operation: 'multiply', value: 2 },
      ],
      examples: [1, 2],
      input,
      showSteps: true,
      rules: [
        tile('Primero cambiar, después doblar', 'forward'),
        tile('Primero doblar, después cambiar', 'reverse'),
      ],
      rule: 'forward',
      options: [result + 2, result - 1, result, result + 1],
      instructions: `Primero ${add > 0 ? `suma ${add}` : 'resta 1'}; después multiplica por 2. ¿Qué sale si entra el ${input}?`,
      hints: hints(
        'La máquina hace dos cosas en orden.',
        'Apunta el resultado del primer paso. Usa ese resultado para el segundo.',
        `Empieza por ${input} ${add > 0 ? '+' : '−'} ${Math.abs(add)}. Después dobla el resultado.`,
      ),
      explanation: `${input} ${add > 0 ? '+' : '−'} ${Math.abs(add)} = ${input + add}. Después, ${input + add} × 2 = ${result}.`,
    };
  },
);
add(
  'logic-19',
  'El camino imposible',
  'Construir un camino válido y rectificar decisiones.',
  3,
  'map',
  (v) => ({
    kind: 'grid',
    mode: 'path',
    size: 5,
    start: [20, 0, 24][v],
    goal: [4, 24, 0][v],
    blocked: [
      [6, 7, 8, 11, 18],
      [6, 7, 8, 13, 18],
      [6, 11, 16, 8, 13],
    ][v],
    instructions:
      'Desde la bandera, toca casillas vecinas hasta llegar a la estrella. Evita los muros.',
    hints: hints(
      'Solo puedes subir, bajar o ir a los lados.',
      'Busca un hueco para rodear los muros. Puedes deshacer pasos.',
      'El borde del tablero permite rodear estos muros. No hace falta ir en línea recta.',
    ),
    explanation: 'Has unido la salida y la estrella mediante casillas vecinas, sin cruzar muros.',
  }),
);
add(
  'logic-20',
  'Las tres cajas',
  'Deducir una distribución única mediante restricciones.',
  3,
  'key',
  (v) =>
    deduction(
      'boxes',
      [
        figure('star', 'star', 'yellow'),
        figure('circle', 'circle', 'yellow'),
        figure('triangle', 'triangle', 'yellow'),
      ],
      [
        tile('Caja roja', 'red', 'box'),
        tile('Caja azul', 'blue', 'box'),
        tile('Caja verde', 'green', 'box'),
      ],
      v,
      'Coloca una figura en cada caja usando las pistas.',
    ),
);
add(
  'logic-21',
  'La secuencia misteriosa',
  'Reconocer diferencias crecientes o saltos alternos.',
  3,
  'sequence',
  (v) => {
    const sequences = [
      [2, 3, 5, 8, 12, 17],
      [1, 3, 6, 10, 15, 21],
      [2, 3, 6, 7, 10, 11],
    ];
    const sequence = sequences[v];
    const result = sequence.at(-1)!;
    return choice(
      v === 2
        ? 'Los saltos se turnan. ¿Qué número sigue?'
        : 'Cada salto crece en uno. ¿Qué número sigue?',
      numbers(sequence.slice(0, -1)),
      numbers([result + 1, result - 1, result, result + 3]),
      String(result),
      v === 2
        ? 'Los saltos alternan +1 y +3. Ahora toca +1: 10 + 1 = 11.'
        : `Los saltos crecen de uno en uno. El siguiente salto es +${v + 5}, así llegamos a ${result}.`,
      hints(
        'Calcula los saltos entre números vecinos.',
        v === 2
          ? 'Busca dos saltos que se repitan por turnos.'
          : 'Compara cada salto con el anterior.',
        v === 2
          ? 'Los primeros saltos son +1, +3, +1. Continúa esa regla.'
          : `Los primeros saltos son +${v + 1}, +${v + 2}, +${v + 3}. Continúa hasta el último.`,
      ),
    );
  },
);
add(
  'logic-22',
  'El reino de las formas',
  'Combinar tres condiciones, incluida la negación.',
  3,
  'crown',
  (v) => {
    const shape: Shape = ['circle', 'triangle', 'square'][v] as Shape;
    const items = [
      figure('a', shape, 'blue', true),
      figure('b', shape, 'green', true),
      figure('c', shape, 'red', true),
      figure('d', shape, 'blue'),
      figure('e', shape === 'circle' ? 'star' : 'circle', 'blue', true),
    ];
    return {
      kind: 'selection',
      items,
      solution: ['a', 'b'],
      instructions: `Selecciona todas las figuras con forma de ${SHAPES[shape]} que sean pequeñas y no sean rojas.`,
      hints: hints(
        'Hay tres condiciones: forma, tamaño y color.',
        'Descarta las figuras grandes, las rojas y las que tienen otra forma.',
        'Revisa las que quedan una por una. No basta con cumplir solo dos condiciones.',
      ),
      explanation: 'Las dos figuras elegidas tienen la forma pedida, son pequeñas y no son rojas.',
    };
  },
);
add(
  'logic-23',
  'Todas las combinaciones',
  'Enumerar de forma sistemática un producto de conjuntos.',
  3,
  'shirt',
  (v) => ({
    kind: 'combinations',
    hats: Array.from({ length: v === 2 ? 3 : 2 }, (_, i) =>
      tile(
        ['Sombrero', 'Casco', 'Gorro de cocina'][i],
        `h${i}`,
        (['hat', 'hard-hat', 'chef-hat'] as const)[i],
      ),
    ),
    shirts: Array.from({ length: v === 1 ? 2 : 3 }, (_, i) => ({
      ...tile(`Camiseta ${['roja', 'azul', 'verde'][i]}`, `s${i}`, 'shirt'),
      colour: ['red', 'blue', 'green'][i] as Colour,
    })),
    instructions:
      'Marca cada conjunto de gorro y camiseta. Después cuenta cuántos conjuntos distintos hay.',
    hints: hints(
      'Un conjunto lleva un gorro y una camiseta.',
      'Combina el primer gorro con todas las camisetas. Haz lo mismo con cada gorro.',
      'Cada casilla es un conjunto diferente. Revisa que no quede ninguna sin probar.',
    ),
    explanation:
      'Cada gorro se puede combinar con cada camiseta. Al recorrer todas las filas, encuentras todos los conjuntos sin repetir.',
  }),
);
add(
  'logic-24',
  'El gran desafío lógico',
  'Combinar patrones, clasificación y deducción.',
  3,
  'castle',
  (v) => {
    const colour: Colour = ['red', 'blue', 'green'][v] as Colour;
    return {
      kind: 'stages',
      instructions:
        'El tesoro del castillo: encuentra la llave, abre la puerta y descubre el cofre.',
      hints: hints(
        'Resuelve un paso cada vez.',
        'Usa la regla de cada sala.',
        'No necesitas correr. Revisa las pistas de la sala actual.',
      ),
      explanation:
        'Has usado una secuencia, dos condiciones a la vez y una deducción. ¡El tesoro del castillo es tuyo!',
      stages: [
        choice(
          'Sala 1. La secuencia indica el color de la llave. ¿Cuál sigue?',
          [
            figure('s1', 'circle', colour),
            figure('s2', 'square', 'yellow'),
            figure('s3', 'circle', colour),
            figure('s4', 'square', 'yellow'),
          ],
          [
            figure('key1', 'circle', 'yellow'),
            figure('key2', 'circle', colour),
            figure('key3', 'star', 'yellow'),
          ],
          'key2',
          'La pareja de figuras vuelve a empezar.',
          hints(
            'Busca una pareja repetida.',
            'Después del cuadrado amarillo empieza otra pareja.',
            'Mira la primera figura: es la que abre cada pareja.',
          ),
        ),
        choice(
          'Sala 2. Elige la puerta triangular y pequeña.',
          [],
          [
            figure('door1', 'triangle', colour),
            figure('door2', 'square', colour, true),
            figure('door3', 'triangle', colour, true),
          ],
          'door3',
          'La puerta cumple las dos condiciones.',
          hints(
            'Necesitas forma y tamaño.',
            'Descarta primero la puerta cuadrada.',
            'Entre los triángulos, compara el tamaño.',
          ),
        ),
        choice(
          `Sala 3. Hay tres cofres. El tesoro no está en el ${v + 1} ni en el ${((v + 1) % 3) + 1}. ¿Dónde está?`,
          [],
          [tile('Cofre 1', '1', 'box'), tile('Cofre 2', '2', 'box'), tile('Cofre 3', '3', 'box')],
          String(((v + 2) % 3) + 1),
          'Al descartar dos cofres, solo queda uno.',
          hints(
            'Lee los números de los cofres descartados.',
            'Aparta mentalmente esos dos cofres.',
            'El único cofre que no aparece en la pista guarda el tesoro.',
          ),
        ),
      ],
    };
  },
);

/** Curated templates are deterministic; changing an index never changes an existing variant. */
export const LOGIC_ACTIVITIES: readonly Activity[] = activities;
export function getActivity(id: string): Activity | undefined {
  return LOGIC_ACTIVITIES.find((activity) => activity.id === id);
}
