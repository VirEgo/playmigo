import type { MathQuestion, MathQuestionCategory, WrittenOperation } from './math-question';
import { MATH_QUESTIONS } from './data/math-questions';

const CATEGORY_ORDER: readonly MathQuestionCategory[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'comparison',
  'word-problem',
  'geometry',
];
const COUNTS: Readonly<Record<MathQuestionCategory, number>> = {
  addition: 10,
  subtraction: 10,
  multiplication: 10,
  division: 5,
  comparison: 5,
  'word-problem': 5,
  geometry: 5,
};
const EXPECTED_OPERATOR: Partial<Record<MathQuestionCategory, WrittenOperation['operator']>> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function operationResult(operation: WrittenOperation): number {
  switch (operation.operator) {
    case '+':
      return operation.top + operation.bottom;
    case '−':
      return operation.top - operation.bottom;
    case '×':
      return operation.top * operation.bottom;
    case '÷':
      return operation.top / operation.bottom;
  }
}

function makeOptions(answer: number, random: () => number): readonly [string, string, string] {
  const distractors = shuffled(
    [-2, -1, 1, 2]
      .map((offset) => answer + offset)
      .filter((value) => value >= 0 && value <= 50 && value !== answer),
    random,
  ).slice(0, 2);
  const choices = shuffled([answer, ...distractors].map(String), random);
  return choices as [string, string, string];
}

function makeArithmeticQuestion(
  seed: number,
  category: 'addition' | 'subtraction' | 'multiplication' | 'division',
  operation: WrittenOperation,
  index: number,
  random: () => number,
): MathQuestion {
  const answer = operationResult(operation);
  const symbol = operation.operator;
  const question = `¿Cuánto es ${operation.top} ${symbol} ${operation.bottom}?`;
  const explanation =
    operation.operator === '+'
      ? `${operation.top} más ${operation.bottom} son ${answer}.`
      : operation.operator === '−'
        ? `${operation.top} menos ${operation.bottom} son ${answer}.`
        : operation.operator === '×'
          ? `${operation.bottom} grupos de ${operation.top} son ${answer}.`
          : `Si repartes ${operation.top} en grupos de ${operation.bottom}, salen ${answer}.`;

  return {
    id: `gen-${seed >>> 0}-${category}-${index}-${operation.top}-${operation.bottom}`,
    category,
    instruction:
      category === 'addition'
        ? 'Suma. Empieza por las unidades.'
        : category === 'subtraction'
          ? 'Resta. Empieza por las unidades.'
          : category === 'multiplication'
            ? 'Cuenta los grupos iguales.'
            : 'Reparte por igual.',
    question,
    options: makeOptions(answer, random),
    correctAnswer: String(answer),
    explanation,
    difficulty: category === 'addition' || category === 'subtraction' ? 1 : 2,
    operation,
  };
}

function arithmeticCandidates(
  category: 'addition' | 'subtraction' | 'multiplication' | 'division',
): WrittenOperation[] {
  const result: WrittenOperation[] = [];
  if (category === 'addition') {
    for (let top = 11; top <= 39; top++) {
      for (let bottom = 1; bottom <= 29; bottom++) {
        if (top + bottom <= 50 && (top % 10) + (bottom % 10) < 10)
          result.push({ top, bottom, operator: '+' });
      }
    }
  } else if (category === 'subtraction') {
    for (let top = 12; top <= 50; top++) {
      for (let bottom = 2; bottom < top; bottom++) {
        if (top - bottom >= 2 && top % 10 >= bottom % 10)
          result.push({ top, bottom, operator: '−' });
      }
    }
  } else if (category === 'multiplication') {
    for (const top of [2, 5, 10]) {
      for (let bottom = 2; bottom <= 10; bottom++) {
        if (top * bottom <= 50) result.push({ top, bottom, operator: '×' });
      }
    }
  } else {
    for (const bottom of [2, 5]) {
      for (let answer = 2; answer <= Math.floor(20 / bottom); answer++) {
        result.push({ top: bottom * answer, bottom, operator: '÷' });
      }
    }
  }
  return result;
}

function makeWordQuestions(seed: number, random: () => number): MathQuestion[] {
  const candidates: WrittenOperation[] = [];
  for (let top = 2; top <= 18; top++) {
    for (let bottom = 1; bottom <= 10; bottom++) {
      if (top + bottom <= 20 && (top % 10) + (bottom % 10) < 10)
        candidates.push({ top, bottom, operator: '+' });
      if (top - bottom >= 1 && top % 10 >= bottom % 10)
        candidates.push({ top, bottom, operator: '−' });
    }
  }
  const names = shuffled(['Ana', 'Leo', 'Nora', 'Pablo', 'Marta'], random);
  const objects = shuffled(
    [
      { noun: 'canicas', article: 'las', questionWord: 'Cuántas' },
      { noun: 'pegatinas', article: 'las', questionWord: 'Cuántas' },
      { noun: 'libros', article: 'los', questionWord: 'Cuántos' },
      { noun: 'lápices', article: 'los', questionWord: 'Cuántos' },
      { noun: 'cuentos', article: 'los', questionWord: 'Cuántos' },
    ],
    random,
  );
  return shuffled(candidates, random)
    .slice(0, COUNTS['word-problem'])
    .map((operation, index) => {
      const name = names[index];
      const object = objects[index];
      const answer = operationResult(operation);
      const isAddition = operation.operator === '+';
      const question = isAddition
        ? `${name} tiene ${operation.top} ${object.noun} y recibe ${operation.bottom} más. ¿${object.questionWord} ${object.noun} tiene ahora?`
        : `${name} tiene ${operation.top} ${object.noun} y regala ${operation.bottom}. ¿${object.questionWord} ${object.noun} le quedan?`;
      return {
        id: `gen-${seed >>> 0}-word-problem-${index}-${operation.top}-${operation.bottom}-${operation.operator}`,
        category: 'word-problem',
        instruction: isAddition ? 'Lee y suma.' : 'Lee y resta.',
        question,
        options: makeOptions(answer, random),
        correctAnswer: String(answer),
        explanation: isAddition
          ? `Sumamos: ${operation.top} + ${operation.bottom} = ${answer}.`
          : `Restamos: ${operation.top} − ${operation.bottom} = ${answer}.`,
        difficulty: 1,
        operation,
      };
    });
}

function makeComparison(seed: number, index: number, random: () => number): MathQuestion {
  const values = shuffled(
    Array.from({ length: 50 }, (_, value) => value + 1),
    random,
  ).slice(0, 3);
  const chooseGreater = random() < 0.5;
  const answer = chooseGreater ? Math.max(...values) : Math.min(...values);
  const word = chooseGreater ? 'mayor' : 'menor';
  const options = shuffled(values.map(String), random) as [string, string, string];
  return {
    id: `gen-${seed >>> 0}-comparison-${index}-${values.join('-')}`,
    category: 'comparison',
    difficulty: 1,
    instruction: `Elige el número ${word}.`,
    question: `¿Qué número es ${word}?`,
    options,
    correctAnswer: String(answer),
    explanation: chooseGreater
      ? `${answer} es mayor que los otros números.`
      : `${answer} es menor que los otros números.`,
  };
}

const GEOMETRY_TEMPLATES: readonly Omit<MathQuestion, 'id' | 'options' | 'correctAnswer'>[] = [
  {
    category: 'geometry',
    difficulty: 1,
    instruction: 'Cuenta los lados.',
    question: '¿Cuántos lados tiene un triángulo?',
    explanation: 'El triángulo tiene 3 lados.',
  },
  {
    category: 'geometry',
    difficulty: 1,
    instruction: 'Cuenta las esquinas.',
    question: '¿Cuántos vértices tiene un cuadrado?',
    explanation: 'Un cuadrado tiene 4 vértices.',
  },
  {
    category: 'geometry',
    difficulty: 1,
    instruction: 'Cuenta los lados.',
    question: '¿Cuántos lados tiene un rectángulo?',
    explanation: 'El rectángulo tiene 4 lados.',
  },
  {
    category: 'geometry',
    difficulty: 1,
    instruction: 'Elige la unidad adecuada.',
    question: '¿Con qué medimos el largo de un lápiz?',
    explanation: 'Los centímetros miden longitudes pequeñas.',
  },
  {
    category: 'geometry',
    difficulty: 1,
    instruction: 'Mira el borde de la figura.',
    question: '¿Qué figura no tiene lados rectos?',
    explanation: 'El borde del círculo es curvo.',
  },
];

function makeGeometryQuestion(seed: number, index: number, random: () => number): MathQuestion {
  const template = GEOMETRY_TEMPLATES[index];
  const answer =
    index === 0 ? '3' : index === 1 || index === 2 ? '4' : index === 3 ? 'Centímetros' : 'Círculo';
  const options =
    index === 3
      ? ['Centímetros', 'Horas', 'Litros']
      : index === 4
        ? ['Círculo', 'Cuadrado', 'Triángulo']
        : index === 0
          ? ['3', '2', '4']
          : ['4', '3', '5'];
  return {
    ...template,
    id: `gen-${seed >>> 0}-geometry-${index}`,
    options: shuffled(options, random) as [string, string, string],
    correctAnswer: answer,
  };
}

export function generateQuestionBank(seed: number): readonly MathQuestion[] {
  const normalizedSeed = seed >>> 0;
  const random = makeRandom(normalizedSeed);
  const byCategory = new Map<MathQuestionCategory, MathQuestion[]>();
  for (const category of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
    const candidates = shuffled(arithmeticCandidates(category), random);
    let operations = candidates.slice(0, COUNTS[category]);
    if (category === 'addition') {
      const easy = candidates.find(({ top, bottom }) => top <= 20 && bottom <= 9)!;
      operations = [
        easy,
        ...candidates.filter(({ top, bottom }) => top !== easy.top || bottom !== easy.bottom),
      ].slice(0, COUNTS.addition);
    }
    byCategory.set(
      category,
      operations.map((operation, index) =>
        makeArithmeticQuestion(normalizedSeed, category, operation, index, random),
      ),
    );
  }
  byCategory.set(
    'comparison',
    Array.from({ length: COUNTS.comparison }, (_, index) =>
      makeComparison(normalizedSeed, index, random),
    ),
  );
  byCategory.set('word-problem', makeWordQuestions(normalizedSeed, random));
  byCategory.set(
    'geometry',
    Array.from({ length: COUNTS.geometry }, (_, index) =>
      makeGeometryQuestion(normalizedSeed, index, random),
    ),
  );

  const offsets = new Map<MathQuestionCategory, number>();
  const bank = MATH_QUESTIONS.map(({ category }) => {
    const offset = offsets.get(category) ?? 0;
    offsets.set(category, offset + 1);
    return byCategory.get(category)![offset];
  });

  return bank;
}

export function createQuestionSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0];
  }
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

export function validateQuestionBank(value: unknown): value is readonly MathQuestion[] {
  if (!Array.isArray(value) || value.length !== 50) return false;
  const counts = new Map<MathQuestionCategory, number>();
  const ids = new Set<string>();
  const signatures = new Map<MathQuestionCategory, Set<string>>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') return false;
    const item = candidate as Partial<MathQuestion>;
    if (typeof item.id !== 'string' || item.id.trim() === '' || ids.has(item.id)) return false;
    ids.add(item.id);
    if (!CATEGORY_ORDER.includes(item.category as MathQuestionCategory)) return false;
    const category = item.category as MathQuestionCategory;
    counts.set(category, (counts.get(category) ?? 0) + 1);
    if (![1, 2].includes(item.difficulty as number)) return false;
    if (
      ![item.instruction, item.question, item.explanation].every(
        (text) => typeof text === 'string' && text.trim().length > 0 && text.length <= 500,
      )
    )
      return false;
    if (
      !Array.isArray(item.options) ||
      item.options.length !== 3 ||
      item.options.some((option) => typeof option !== 'string') ||
      new Set(item.options).size !== 3
    )
      return false;
    if (typeof item.correctAnswer !== 'string' || !item.options.includes(item.correctAnswer))
      return false;

    const expectedOperator = EXPECTED_OPERATOR[category];
    const needsOperation = expectedOperator !== undefined || category === 'word-problem';
    if (needsOperation) {
      const operation = item.operation;
      if (
        !operation ||
        typeof operation !== 'object' ||
        !['+', '−', '×', '÷'].includes(operation.operator)
      )
        return false;
      if (expectedOperator && operation.operator !== expectedOperator) return false;
      if (category === 'word-problem' && operation.operator !== '+' && operation.operator !== '−')
        return false;
      if (!Number.isInteger(operation.top) || !Number.isInteger(operation.bottom)) return false;
      if (operation.top < 0 || operation.bottom <= 0 || operation.top > 50 || operation.bottom > 50)
        return false;
      const answer = operationResult(operation);
      if (
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer > 50 ||
        String(answer) !== item.correctAnswer
      )
        return false;
      if (
        category === 'addition' &&
        ((operation.top % 10) + (operation.bottom % 10) >= 10 || answer > 50)
      )
        return false;
      if (
        category === 'subtraction' &&
        (operation.top < operation.bottom || operation.top % 10 < operation.bottom % 10)
      )
        return false;
      if (
        category === 'word-problem' &&
        (operation.top > 20 || operation.bottom > 20 || answer > 20)
      )
        return false;
      if (
        category === 'multiplication' &&
        ![2, 5, 10].includes(operation.top) &&
        ![2, 5, 10].includes(operation.bottom)
      )
        return false;
      if (
        category === 'division' &&
        (![2, 5].includes(operation.bottom) ||
          operation.top > 20 ||
          operation.top % operation.bottom !== 0)
      )
        return false;
      const signature = `${operation.top}:${operation.bottom}:${operation.operator}`;
      const seen = signatures.get(category) ?? new Set<string>();
      if (seen.has(signature)) return false;
      seen.add(signature);
      signatures.set(category, seen);
    } else if (item.operation !== undefined) {
      return false;
    }
  }

  return CATEGORY_ORDER.every((category) => counts.get(category) === COUNTS[category]);
}
