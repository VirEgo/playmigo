import { MATH_QUESTIONS } from './data/math-questions';
import { ALL_CATEGORIES } from './quiz-categories';
import { generateQuestionBank, validateQuestionBank } from './question-generator';
import { QuizStorage, validateStoredQuizState } from './quiz-storage';

describe('QuizStorage', () => {
  let storage: QuizStorage;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    localStorage.clear();
    storage = new QuizStorage();
  });

  it('generates and immediately saves a fresh version 3 question bank', () => {
    const session = storage.load(MATH_QUESTIONS);
    expect(validateQuestionBank(session.questions)).toBe(true);
    expect(session.enabledCategories).toEqual(ALL_CATEGORIES);
    expect(session.state).toEqual({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      phase: 'answering',
      results: [],
    });
    const stored = JSON.parse(localStorage.getItem('math-quiz-session-v1')!);
    expect(stored.version).toBe(3);
    expect(stored.questions).toEqual(session.questions);
  });

  it('restores a version 3 bank, settings, and progress together', () => {
    const questions = generateQuestionBank(23);
    const firstAddition = questions.find((question) => question.category === 'addition')!;
    const session = {
      version: 3,
      questions,
      enabledCategories: ['addition'],
      state: {
        currentQuestionIndex: 0,
        selectedAnswer: firstAddition.correctAnswer,
        phase: 'checked',
        results: [
          {
            questionId: firstAddition.id,
            selectedAnswer: firstAddition.correctAnswer,
            isCorrect: true,
          },
        ],
      },
    };
    localStorage.setItem('math-quiz-session-v1', JSON.stringify(session));
    expect(storage.load(MATH_QUESTIONS)).toEqual({
      questions,
      enabledCategories: ['addition'],
      state: session.state,
    });
  });

  it('validates result ordering, options, correctness, and phase invariants', () => {
    const q = MATH_QUESTIONS[0];
    const base = {
      currentQuestionIndex: 0,
      selectedAnswer: q.correctAnswer,
      phase: 'checked',
      results: [{ questionId: q.id, selectedAnswer: q.correctAnswer, isCorrect: true }],
    };
    expect(validateStoredQuizState(base, MATH_QUESTIONS)).not.toBeNull();
    expect(
      validateStoredQuizState({ ...base, currentQuestionIndex: 1 }, MATH_QUESTIONS),
    ).toBeNull();
    expect(
      validateStoredQuizState(
        { ...base, results: [{ ...base.results[0], questionId: MATH_QUESTIONS[1].id }] },
        MATH_QUESTIONS,
      ),
    ).toBeNull();
    expect(
      validateStoredQuizState(
        { ...base, results: [{ ...base.results[0], selectedAnswer: 'unknown' }] },
        MATH_QUESTIONS,
      ),
    ).toBeNull();
    expect(
      validateStoredQuizState(
        { ...base, results: [{ ...base.results[0], isCorrect: false }] },
        MATH_QUESTIONS,
      ),
    ).toBeNull();
  });

  it('migrates valid version 1 progress to version 3 using the fallback bank', () => {
    const question = MATH_QUESTIONS[0];
    localStorage.setItem(
      'math-quiz-session-v1',
      JSON.stringify({
        version: 1,
        state: {
          currentQuestionIndex: 0,
          selectedAnswer: question.correctAnswer,
          phase: 'checked',
          results: [
            { questionId: question.id, selectedAnswer: question.correctAnswer, isCorrect: true },
          ],
        },
      }),
    );
    const migrated = storage.load(MATH_QUESTIONS);
    expect(migrated.questions).toEqual(MATH_QUESTIONS);
    expect(migrated.enabledCategories).toEqual(ALL_CATEGORIES);
    expect(migrated.state.results).toEqual([
      { questionId: question.id, selectedAnswer: question.correctAnswer, isCorrect: true },
    ]);
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).version).toBe(3);
  });

  it('migrates valid version 2 settings and filtered progress using the fallback bank', () => {
    const additions = MATH_QUESTIONS.filter((question) => question.category === 'addition');
    const question = additions[0];
    localStorage.setItem(
      'math-quiz-session-v1',
      JSON.stringify({
        version: 2,
        enabledCategories: ['addition'],
        state: {
          currentQuestionIndex: 0,
          selectedAnswer: question.correctAnswer,
          phase: 'checked',
          results: [
            { questionId: question.id, selectedAnswer: question.correctAnswer, isCorrect: true },
          ],
        },
      }),
    );
    const migrated = storage.load(MATH_QUESTIONS);
    expect(migrated.questions).toEqual(MATH_QUESTIONS);
    expect(migrated.enabledCategories).toEqual(['addition']);
    expect(migrated.state.results).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).version).toBe(3);
  });

  it('regenerates corrupt questions while retaining valid settings and resetting progress', () => {
    localStorage.setItem(
      'math-quiz-session-v1',
      JSON.stringify({
        version: 3,
        questions: [{ id: 'bad' }],
        enabledCategories: ['addition'],
        state: { currentQuestionIndex: 0, selectedAnswer: null, phase: 'answering', results: [] },
      }),
    );
    const restored = storage.load(MATH_QUESTIONS);
    expect(validateQuestionBank(restored.questions)).toBe(true);
    expect(restored.questions).not.toEqual([{ id: 'bad' }]);
    expect(restored.enabledCategories).toEqual(['addition']);
    expect(restored.state.results).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions).toEqual(
      restored.questions,
    );
  });

  it('resets both settings and progress when saved settings are malformed', () => {
    for (const enabledCategories of [[], ['addition', 'addition'], ['not-real']]) {
      localStorage.setItem(
        'math-quiz-session-v1',
        JSON.stringify({
          version: 3,
          questions: MATH_QUESTIONS,
          enabledCategories,
          state: { currentQuestionIndex: 3, selectedAnswer: null, phase: 'answering', results: [] },
        }),
      );
      const loaded = storage.load(MATH_QUESTIONS);
      expect(loaded.enabledCategories).toEqual(ALL_CATEGORIES);
      expect(loaded.state.currentQuestionIndex).toBe(0);
    }
  });

  it('handles unavailable storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => storage.load(MATH_QUESTIONS)).not.toThrow();
    expect(() =>
      storage.save({
        questions: generateQuestionBank(2),
        enabledCategories: ALL_CATEGORIES,
        state: { currentQuestionIndex: 0, selectedAnswer: null, phase: 'answering', results: [] },
      }),
    ).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });
});
