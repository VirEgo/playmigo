import { describe, expect, it } from 'vitest';
import { MATH_QUESTIONS } from './data/math-questions';
import {
  createQuestionSeed,
  generateQuestionBank,
  validateQuestionBank,
} from './question-generator';
import type { MathQuestionCategory } from './math-question';

const counts: Readonly<Record<MathQuestionCategory, number>> = {
  addition: 10,
  subtraction: 10,
  multiplication: 10,
  division: 5,
  comparison: 5,
  'word-problem': 5,
  geometry: 5,
};
describe('question generator', () => {
  it('creates an exact 50-question bank in the required category order', () => {
    const bank = generateQuestionBank(123456);
    expect(bank).toHaveLength(50);
    expect(bank.map((item) => item.category)).toEqual(MATH_QUESTIONS.map((item) => item.category));
    for (const [category, count] of Object.entries(counts)) {
      expect(bank.filter((item) => item.category === category)).toHaveLength(count);
    }
  });

  it('is deterministic for a seed and changes for a different seed', () => {
    expect(generateQuestionBank(123456)).toEqual(generateQuestionBank(123456));
    expect(generateQuestionBank(123456)).not.toEqual(generateQuestionBank(123457));
  });

  it('uses unique IDs and operations, varies answer positions, and gives each item three choices', () => {
    const bank = generateQuestionBank(74);
    expect(new Set(bank.map((item) => item.id)).size).toBe(50);
    expect(new Set(bank.map((item) => item.options.indexOf(item.correctAnswer)))).toEqual(
      new Set([0, 1, 2]),
    );
    for (const item of bank) {
      expect(item.options).toHaveLength(3);
      expect(new Set(item.options).size).toBe(3);
      expect(item.options).toContain(item.correctAnswer);
      expect([1, 2]).toContain(item.difficulty);
    }
    for (const category of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'word-problem',
    ] as const) {
      const signatures = bank
        .filter((item) => item.category === category)
        .map(
          (item) => `${item.operation!.top}:${item.operation!.bottom}:${item.operation!.operator}`,
        );
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });

  it('keeps generated operations within the age-seven arithmetic limits', () => {
    const bank = generateQuestionBank(8);
    for (const item of bank.filter((question) => question.operation)) {
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
      if (item.category === 'addition') {
        expect(answer).toBeLessThanOrEqual(50);
        expect((top % 10) + (bottom % 10)).toBeLessThan(10);
      }
      if (item.category === 'subtraction') {
        expect(answer).toBeLessThanOrEqual(50);
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
      if (item.category === 'word-problem') {
        expect(['+', '−']).toContain(operator);
        expect(top).toBeLessThanOrEqual(20);
        expect(bottom).toBeLessThanOrEqual(20);
        expect(answer).toBeLessThanOrEqual(20);
      }
    }
  });

  it('starts addition gently and includes one-digit addends', () => {
    const bank = generateQuestionBank(8);
    const additions = bank.filter((item) => item.category === 'addition');
    expect(additions[0].operation!.top).toBeLessThanOrEqual(20);
    expect(additions[0].operation!.bottom).toBeLessThanOrEqual(9);
    expect(additions.some((item) => item.operation!.bottom <= 9)).toBe(true);
  });

  it('makes each comparison choose the greatest or least of all three options', () => {
    const comparisons = generateQuestionBank(501).filter((item) => item.category === 'comparison');
    for (const item of comparisons) {
      const values = item.options.map(Number);
      expect(item.question).toMatch(/^¿Qué número es (mayor|menor)\?$/);
      expect(values.every((value) => Number.isInteger(value) && value >= 1 && value <= 50)).toBe(
        true,
      );
      const expected = item.question.includes('mayor') ? Math.max(...values) : Math.min(...values);
      expect(item.correctAnswer).toBe(String(expected));
      expect(item.explanation).toContain(String(expected));
    }
  });

  it('uses feminine Spanish agreement when a word problem uses feminine objects', () => {
    const bank = generateQuestionBank(19);
    const feminine = bank.filter(
      (item) => item.category === 'word-problem' && /canicas|pegatinas/.test(item.question),
    );
    expect(feminine.length).toBeGreaterThan(0);
    for (const item of feminine) {
      expect(item.question).toMatch(/¿Cuántas (canicas|pegatinas)/);
      expect(item.explanation).not.toMatch(/los (canicas|pegatinas)/);
    }
    expect(
      generateQuestionBank(19)
        .filter((item) => item.category === 'word-problem')
        .map((item) => item.question),
    ).not.toEqual(
      generateQuestionBank(20)
        .filter((item) => item.category === 'word-problem')
        .map((item) => item.question),
    );
  });

  it('creates valid uint32 seeds', () => {
    for (let index = 0; index < 5; index++) {
      const seed = createQuestionSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffff_ffff);
    }
  });

  it('validates generated banks and the current static bank for storage migration', () => {
    expect(validateQuestionBank(generateQuestionBank(901))).toBe(true);
    expect(validateQuestionBank(MATH_QUESTIONS)).toBe(true);
  });

  it('rejects malformed banks, answer mismatches, and category/operator mismatches', () => {
    const validBank = generateQuestionBank(19);
    expect(validateQuestionBank([])).toBe(false);

    const wrongAnswer = validBank.map((item, index) =>
      index === 0 ? { ...item, correctAnswer: '999' } : item,
    );
    expect(validateQuestionBank(wrongAnswer)).toBe(false);

    const wrongOperator = validBank.map((item, index) =>
      index === 0 ? { ...item, operation: { ...item.operation!, operator: '−' as const } } : item,
    );
    expect(validateQuestionBank(wrongOperator)).toBe(false);
  });
});
