import { describe, expect, it } from 'vitest';
import { MATH_QUESTIONS } from './math-questions';
import type { MathQuestionCategory } from '../math-question';

const expectedCounts: Record<MathQuestionCategory, number> = {
  addition: 10,
  subtraction: 10,
  multiplication: 10,
  division: 5,
  comparison: 5,
  'word-problem': 5,
  geometry: 5,
};

describe('MATH_QUESTIONS', () => {
  it('contains 50 questions in the requested category counts', () => {
    expect(MATH_QUESTIONS).toHaveLength(50);
    for (const [category, count] of Object.entries(expectedCounts)) {
      expect(MATH_QUESTIONS.filter((item) => item.category === category)).toHaveLength(count);
    }
  });

  it('has unique IDs and three distinct options with one correct answer', () => {
    const ids = MATH_QUESTIONS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of MATH_QUESTIONS) {
      expect(item.id.trim()).not.toBe('');
      expect(item.options).toHaveLength(3);
      expect(new Set(item.options).size).toBe(3);
      expect(item.options).toContain(item.correctAnswer);
      expect(item.instruction.trim()).not.toBe('');
      expect(item.question.trim()).not.toBe('');
      expect(item.explanation.trim()).not.toBe('');
      expect([1, 2]).toContain(item.difficulty);
    }
  });

  it('uses each answer position across the question bank', () => {
    const positions = new Set(
      MATH_QUESTIONS.map((item) => item.options.indexOf(item.correctAnswer)),
    );
    expect(positions).toEqual(new Set([0, 1, 2]));
    for (const position of positions) {
      const count = MATH_QUESTIONS.filter(
        (item) => item.options.indexOf(item.correctAnswer) === position,
      ).length;
      expect(count).toBeGreaterThanOrEqual(16);
      expect(count).toBeLessThanOrEqual(17);
    }
  });

  it('starts with the requested addition question', () => {
    expect(MATH_QUESTIONS[0]).toMatchObject({
      question: '¿Cuánto es 12 + 5?',
      options: ['16', '17', '18'],
      correctAnswer: '17',
      operation: { top: 12, bottom: 5, operator: '+' },
    });
  });

  it('independently checks every written arithmetic operation', () => {
    const arithmeticCategories: MathQuestionCategory[] = [
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'word-problem',
    ];
    const arithmeticQuestions = MATH_QUESTIONS.filter((item) =>
      arithmeticCategories.includes(item.category),
    );

    for (const item of arithmeticQuestions) {
      expect(item.operation, item.id).toBeDefined();
      const { top, bottom, operator } = item.operation!;
      const answer =
        operator === '+'
          ? top + bottom
          : operator === '−'
            ? top - bottom
            : operator === '×'
              ? top * bottom
              : top / bottom;
      expect(item.correctAnswer, item.id).toBe(String(answer));
      expect(answer).toBeGreaterThanOrEqual(0);

      if (
        item.category === 'addition' ||
        item.category === 'subtraction' ||
        item.category === 'word-problem'
      ) {
        expect(top).toBeLessThanOrEqual(50);
        expect(bottom).toBeLessThanOrEqual(50);
        expect(answer).toBeLessThanOrEqual(50);
      }
      if (item.category === 'addition') {
        expect((top % 10) + (bottom % 10)).toBeLessThan(10);
      }
      if (item.category === 'subtraction') {
        expect(top % 10).toBeGreaterThanOrEqual(bottom % 10);
      }
      if (item.category === 'multiplication') {
        expect([2, 5, 10]).toContain(top);
        expect(answer).toBeLessThanOrEqual(50);
      }
      if (item.category === 'division') {
        expect([2, 5]).toContain(bottom);
        expect(top).toBeLessThanOrEqual(20);
        expect(top % bottom).toBe(0);
      }
    }

    expect(arithmeticQuestions).toHaveLength(40);
  });

  it('checks comparisons and geometry with an independent answer key', () => {
    const expectedAnswers: Record<string, string> = {
      'v2-compara-14-19': '19',
      'v2-compara-32-28': '28',
      'v2-compara-40-40': 'Son iguales',
      'v2-compara-25-35': '35',
      'v2-compara-48-42': '42',
      'v2-figura-triangulo': '3',
      'v2-figura-cuadrado': '4',
      'v2-figura-rectangulo': '4',
      'v2-medida-lapiz-centimetros': 'Centímetros',
      'v2-figura-circulo': 'Círculo',
    };
    const items = MATH_QUESTIONS.filter(
      (item) => item.category === 'comparison' || item.category === 'geometry',
    );
    expect(Object.keys(expectedAnswers)).toHaveLength(items.length);

    for (const item of items) {
      expect(item.correctAnswer, item.id).toBe(expectedAnswers[item.id]);
      expect(item.operation, item.id).toBeUndefined();
    }
  });
});
