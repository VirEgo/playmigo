import { TestBed } from '@angular/core/testing';
import { MathQuiz } from './math-quiz';
import { ALL_CATEGORIES } from './quiz-categories';
import { validateQuestionBank } from './question-generator';
import { QuizStorage } from './quiz-storage';

describe('MathQuiz', () => {
  let quiz: MathQuiz;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    quiz = TestBed.inject(MathQuiz);
  });

  it('starts fresh and exposes derived values', () => {
    expect(quiz.state()).toEqual({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      phase: 'answering',
      results: [],
    });
    expect(quiz.currentQuestion()).toEqual(quiz.questionBank()[0]);
    expect(quiz.questionNumber()).toBe(1);
    expect(quiz.totalQuestions()).toBe(50);
    expect(quiz.progressPercent()).toBe(0);
    expect(quiz.correctAnswers()).toBe(0);
    expect(quiz.incorrectAnswers()).toBe(0);
    expect(quiz.successPercent()).toBe(0);
    expect(quiz.isCompleted()).toBe(false);
  });

  it('requires a valid selected option and scores once when checked', () => {
    quiz.checkAnswer();
    quiz.nextQuestion();
    quiz.selectAnswer('not an option');
    expect(quiz.state().results).toHaveLength(0);
    expect(quiz.state().phase).toBe('answering');

    const question = quiz.questionBank()[0];
    quiz.selectAnswer(question.correctAnswer);
    quiz.checkAnswer();
    quiz.checkAnswer();
    quiz.selectAnswer(question.options[0]);
    expect(quiz.state().phase).toBe('checked');
    expect(quiz.state().results).toEqual([
      { questionId: question.id, selectedAnswer: question.correctAnswer, isCorrect: true },
    ]);
    expect(quiz.correctAnswers()).toBe(1);
    expect(quiz.progressPercent()).toBe(2);
  });

  it('advances after checking and tracks correct and incorrect answers', () => {
    quiz.selectAnswer(
      quiz
        .questionBank()[0]
        .options.find((option) => option !== quiz.questionBank()[0].correctAnswer)!,
    );
    quiz.checkAnswer();
    quiz.nextQuestion();

    expect(quiz.questionNumber()).toBe(2);
    expect(quiz.currentQuestion()).toEqual(quiz.questionBank()[1]);
    expect(quiz.state().selectedAnswer).toBeNull();
    expect(quiz.state().phase).toBe('answering');
    quiz.selectAnswer(quiz.questionBank()[1].correctAnswer);
    quiz.checkAnswer();
    expect(quiz.correctAnswers()).toBe(1);
    expect(quiz.incorrectAnswers()).toBe(1);
    expect(quiz.successPercent()).toBe(50);
  });

  it('keeps question 50 visible at full progress until next is pressed', () => {
    for (const question of quiz.questionBank()) {
      quiz.selectAnswer(question.correctAnswer);
      quiz.checkAnswer();
      if (question !== quiz.questionBank()[quiz.questionBank().length - 1]) quiz.nextQuestion();
    }

    expect(quiz.questionNumber()).toBe(50);
    expect(quiz.progressPercent()).toBe(100);
    expect(quiz.state().phase).toBe('checked');
    expect(quiz.isCompleted()).toBe(false);
    quiz.nextQuestion();
    expect(quiz.questionNumber()).toBe(50);
    expect(quiz.progressPercent()).toBe(100);
    expect(quiz.state().phase).toBe('completed');
    expect(quiz.isCompleted()).toBe(true);
    expect(quiz.correctAnswers()).toBe(50);
  });

  it('persists changes synchronously, restores a valid session, and clears on restart', () => {
    quiz.selectAnswer(quiz.questionBank()[0].correctAnswer);
    quiz.checkAnswer();
    const stored = JSON.parse(localStorage.getItem('math-quiz-session-v1')!);
    expect(stored.version).toBe(3);
    expect(stored.questions).toHaveLength(50);
    expect(stored.state.phase).toBe('checked');
    expect(stored.enabledCategories).toEqual(ALL_CATEGORIES);
    const persistedBank = stored.questions;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    const restored = TestBed.inject(MathQuiz);
    expect(restored.state()).toEqual(quiz.state());
    expect(restored.questionBank()).toEqual(persistedBank);

    restored.restartQuiz();
    expect(restored.state()).toEqual({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      phase: 'answering',
      results: [],
    });
    const restartedSession = JSON.parse(localStorage.getItem('math-quiz-session-v1')!);
    expect(restartedSession.version).toBe(3);
    expect(restartedSession.questions).toHaveLength(50);
    expect(restartedSession.state.results).toHaveLength(0);
  });

  it('discards corrupt, incompatible, or internally inconsistent saved sessions', () => {
    const key = 'math-quiz-session-v1';
    localStorage.setItem(key, '{bad json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    expect(TestBed.inject(MathQuiz).state().phase).toBe('answering');

    localStorage.setItem(key, JSON.stringify({ version: 9, state: {} }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    expect(TestBed.inject(MathQuiz).state().results).toHaveLength(0);

    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        state: {
          currentQuestionIndex: 1,
          selectedAnswer: null,
          phase: 'answering',
          results: [
            {
              questionId: quiz.questionBank()[0].id,
              selectedAnswer: quiz.questionBank()[0].correctAnswer,
              isCorrect: false,
            },
          ],
        },
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    expect(TestBed.inject(MathQuiz).state().results).toHaveLength(0);
  });

  it('remains usable when storage reads or writes fail', () => {
    const storage = TestBed.inject(QuizStorage);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MathQuiz, { provide: QuizStorage, useValue: storage }],
    });
    const volatileQuiz = TestBed.inject(MathQuiz);
    expect(() =>
      volatileQuiz.selectAnswer(volatileQuiz.questionBank()[0].correctAnswer),
    ).not.toThrow();
    expect(() => volatileQuiz.restartQuiz()).not.toThrow();
    expect(volatileQuiz.state().selectedAnswer).toBeNull();
  });

  it('filters to ten addition questions and reports subset progress', () => {
    quiz.configureCategories(['addition']);
    expect(quiz.totalQuestions()).toBe(10);
    expect(quiz.currentQuestion()?.category).toBe('addition');
    expect(quiz.enabledCategories()).toEqual(['addition']);
    for (let index = 0; index < 10; index += 1) {
      const question = quiz.currentQuestion()!;
      quiz.selectAnswer(question.correctAnswer);
      quiz.checkAnswer();
      if (index < 9) quiz.nextQuestion();
    }
    expect(quiz.questionNumber()).toBe(10);
    expect(quiz.progressPercent()).toBe(100);
    expect(quiz.state().phase).toBe('checked');
    quiz.nextQuestion();
    expect(quiz.isCompleted()).toBe(true);
  });

  it('uses mixed category selections and restarts when settings change', () => {
    quiz.configureCategories(['subtraction', 'addition']);
    expect(quiz.totalQuestions()).toBe(20);
    expect(quiz.enabledCategories()).toEqual(['addition', 'subtraction']);
    const question = quiz.currentQuestion()!;
    quiz.selectAnswer(question.correctAnswer);
    quiz.checkAnswer();
    quiz.nextQuestion();

    quiz.configureCategories(['addition', 'subtraction']);
    expect(quiz.state().results).toHaveLength(1);
    quiz.configureCategories(['multiplication', 'addition']);
    expect(quiz.totalQuestions()).toBe(20);
    expect(quiz.enabledCategories()).toEqual(['addition', 'multiplication']);
    expect(quiz.state()).toEqual({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      phase: 'answering',
      results: [],
    });
  });

  it('rejects invalid or empty category selections without changing the session', () => {
    quiz.selectAnswer(quiz.questionBank()[0].correctAnswer);
    const before = quiz.state();
    quiz.configureCategories([]);
    quiz.configureCategories(['unknown' as never]);
    expect(quiz.state()).toEqual(before);
    expect(quiz.enabledCategories()).toEqual(ALL_CATEGORIES);
  });

  it('retains a subset selection on restart and restores its session', () => {
    quiz.configureCategories(['addition']);
    quiz.selectAnswer(quiz.currentQuestion()!.correctAnswer);
    quiz.checkAnswer();
    quiz.restartQuiz();
    expect(quiz.enabledCategories()).toEqual(['addition']);
    expect(quiz.totalQuestions()).toBe(10);
    expect(quiz.state().results).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).enabledCategories).toEqual([
      'addition',
    ]);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    const restored = TestBed.inject(MathQuiz);
    expect(restored.enabledCategories()).toEqual(['addition']);
    expect(restored.totalQuestions()).toBe(10);
    expect(restored.state().results).toHaveLength(0);
  });

  it('restores subset progress against the filtered question order', () => {
    quiz.configureCategories(['word-problem', 'addition']);
    const firstQuestion = quiz.currentQuestion()!;
    quiz.selectAnswer(firstQuestion.correctAnswer);
    quiz.checkAnswer();
    quiz.nextQuestion();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MathQuiz, QuizStorage] });
    const restored = TestBed.inject(MathQuiz);
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).enabledCategories).toEqual([
      'addition',
      'word-problem',
    ]);
    expect(restored.enabledCategories()).toEqual(['addition', 'word-problem']);
    expect(restored.totalQuestions()).toBe(15);
    expect(restored.questionNumber()).toBe(2);
    expect(restored.currentQuestion()).toEqual(
      restored
        .questionBank()
        .filter((item) => ['addition', 'word-problem'].includes(item.category))[1],
    );
    expect(restored.state().results).toHaveLength(1);
    expect(restored.progressPercent()).toBe(7);
  });

  it('applies safe word-problem wording variants only to the current untouched bank', () => {
    const expectedBank = quiz.questionBank();
    const wordIndex = expectedBank.findIndex((question) => question.category === 'word-problem');
    const variants = expectedBank.map((question, index) =>
      index === wordIndex
        ? { ...question, question: 'Lucía tiene objetos. ¿Cuántos hay en total?' }
        : question,
    );
    expect(quiz.applyQuestionVariants(variants, expectedBank)).toBe(true);
    expect(quiz.questionBank()[wordIndex].question).toBe(
      'Lucía tiene objetos. ¿Cuántos hay en total?',
    );
    expect(quiz.state()).toEqual({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      phase: 'answering',
      results: [],
    });
    expect(JSON.parse(localStorage.getItem('math-quiz-session-v1')!).questions).toEqual(variants);
    expect(quiz.applyQuestionVariants(expectedBank, expectedBank)).toBe(false);
  });

  it('rejects variants that alter answers or arrive after quiz activity or a bank change', () => {
    const expectedBank = quiz.questionBank();
    const badAnswer = expectedBank.map((question, index) =>
      index === 0
        ? {
            ...question,
            correctAnswer: question.options.find((option) => option !== question.correctAnswer)!,
          }
        : question,
    );
    expect(quiz.applyQuestionVariants(badAnswer, expectedBank)).toBe(false);

    const variant = expectedBank.map((question) =>
      question.category === 'word-problem'
        ? { ...question, question: `${question.question} ¿De acuerdo?` }
        : question,
    );
    quiz.selectAnswer(quiz.currentQuestion()!.correctAnswer);
    expect(quiz.applyQuestionVariants(variant, expectedBank)).toBe(false);

    quiz.restartQuiz();
    expect(quiz.applyQuestionVariants(variant, expectedBank)).toBe(false);
  });

  it('rejects word variants that change operation operands while preserving the answer', () => {
    const expectedBank = quiz.questionBank();
    const wordIndex = expectedBank.findIndex((question) => question.category === 'word-problem');
    const original = expectedBank[wordIndex];
    const operation = original.operation!;
    const answer = Number(original.correctAnswer);
    let alteredBank = expectedBank;

    for (let top = 1; top <= 20; top += 1) {
      for (let bottom = 1; bottom <= 20; bottom += 1) {
        if (top === operation.top && bottom === operation.bottom) continue;
        const result = operation.operator === '+' ? top + bottom : top - bottom;
        if (result !== answer) continue;
        const candidate = expectedBank.map((question, index) =>
          index === wordIndex
            ? { ...question, operation: { ...operation, top, bottom } }
            : question,
        );
        if (validateQuestionBank(candidate)) {
          alteredBank = candidate;
          break;
        }
      }
      if (alteredBank !== expectedBank) break;
    }

    expect(alteredBank).not.toBe(expectedBank);
    expect(validateQuestionBank(alteredBank)).toBe(true);
    expect(quiz.applyQuestionVariants(alteredBank, expectedBank)).toBe(false);
  });
});
