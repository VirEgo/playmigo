import { Injectable } from '@angular/core';
import { MathQuestion, MathQuestionCategory } from './math-question';
import { ALL_CATEGORIES } from './quiz-categories';
import {
  createQuestionSeed,
  generateQuestionBank,
  validateQuestionBank,
} from './question-generator';
import { QuestionResult, QuizSession, QuizState, createInitialQuizState } from './quiz-state';

const STORAGE_KEY = 'math-quiz-session-v1';
const STORAGE_VERSION = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateStoredQuizState(
  value: unknown,
  questions: readonly MathQuestion[],
): QuizState | null {
  if (!isRecord(value)) return null;
  const { currentQuestionIndex, selectedAnswer, phase, results } = value;
  if (!Number.isInteger(currentQuestionIndex) || !Array.isArray(results)) return null;
  if (phase !== 'answering' && phase !== 'checked' && phase !== 'completed') return null;

  const index = currentQuestionIndex as number;
  const validResults: QuestionResult[] = [];
  for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
    const result = results[resultIndex];
    const question = questions[resultIndex];
    if (!question || !isRecord(result)) return null;
    const selected = result['selectedAnswer'];
    if (
      result['questionId'] !== question.id ||
      typeof selected !== 'string' ||
      !question.options.includes(selected) ||
      result['isCorrect'] !== (selected === question.correctAnswer)
    )
      return null;
    validResults.push({
      questionId: question.id,
      selectedAnswer: selected,
      isCorrect: selected === question.correctAnswer,
    });
  }

  const total = questions.length;
  if (phase === 'answering') {
    if (
      index !== validResults.length ||
      index >= total ||
      (selectedAnswer !== null &&
        (typeof selectedAnswer !== 'string' || !questions[index]?.options.includes(selectedAnswer)))
    )
      return null;
  } else if (phase === 'checked') {
    if (
      validResults.length === 0 ||
      index !== validResults.length - 1 ||
      index >= total ||
      selectedAnswer !== validResults[index]?.selectedAnswer
    )
      return null;
  } else if (
    validResults.length !== total ||
    index !== total - 1 ||
    selectedAnswer !== validResults[total - 1]?.selectedAnswer
  ) {
    return null;
  }

  return {
    currentQuestionIndex: index,
    selectedAnswer: selectedAnswer as string | null,
    phase,
    results: validResults,
  };
}

@Injectable({ providedIn: 'root' })
export class QuizStorage {
  load(questions: readonly MathQuestion[]): QuizSession {
    let raw: string | null | undefined;
    try {
      raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    } catch {
      return this.initialSession();
    }
    if (raw === null || raw === undefined) {
      const fresh = this.initialSession();
      this.save(fresh);
      return fresh;
    }

    try {
      const session: unknown = JSON.parse(raw);
      if (!isRecord(session)) return this.recover();
      if (session['version'] === 1 || session['version'] === 2) {
        const enabledCategories =
          session['version'] === 1
            ? ALL_CATEGORIES
            : validateCategories(session['enabledCategories']);
        if (!enabledCategories) return this.recover();
        const activeQuestions = questions.filter((question) =>
          enabledCategories.includes(question.category),
        );
        const state =
          validateStoredQuizState(session['state'], activeQuestions) ?? createInitialQuizState();
        const migrated: QuizSession = { questions, enabledCategories, state };
        this.save(migrated);
        return migrated;
      }
      if (session['version'] !== STORAGE_VERSION) return this.recover();

      const enabledCategories = validateCategories(session['enabledCategories']);
      if (!enabledCategories) return this.recover();
      const bank = validateQuestionBank(session['questions'])
        ? session['questions']
        : generateQuestionBank(createQuestionSeed());
      const activeQuestions = bank.filter((question) =>
        enabledCategories.includes(question.category),
      );
      const bankIsValid = validateQuestionBank(session['questions']);
      const state = bankIsValid ? validateStoredQuizState(session['state'], activeQuestions) : null;
      const loaded: QuizSession = {
        questions: bank,
        enabledCategories,
        state: state ?? createInitialQuizState(),
      };
      if (!bankIsValid || !state) this.save(loaded);
      return loaded;
    } catch {
      return this.recover();
    }
  }

  save(session: QuizSession): void {
    try {
      globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          questions: session.questions,
          enabledCategories: session.enabledCategories,
          state: session.state,
        }),
      );
    } catch {
      // Storage can be disabled or full; the quiz remains usable in memory.
    }
  }

  clear(): void {
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be disabled; restarting the in-memory quiz still works.
    }
  }

  private initialSession(): QuizSession {
    return {
      questions: generateQuestionBank(createQuestionSeed()),
      enabledCategories: ALL_CATEGORIES,
      state: createInitialQuizState(),
    };
  }

  private recover(): QuizSession {
    const session = this.initialSession();
    this.save(session);
    return session;
  }
}

function validateCategories(value: unknown): readonly MathQuestionCategory[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const categories: MathQuestionCategory[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !ALL_CATEGORIES.includes(item as MathQuestionCategory))
      return null;
    if (categories.includes(item as MathQuestionCategory)) return null;
    categories.push(item as MathQuestionCategory);
  }
  return ALL_CATEGORIES.filter((category) => categories.includes(category));
}
