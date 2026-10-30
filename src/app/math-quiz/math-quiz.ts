import { computed, inject, Injectable, signal } from '@angular/core';
import { MATH_QUESTIONS } from './data/math-questions';
import { MathQuestion, MathQuestionCategory } from './math-question';
import { ALL_CATEGORIES } from './quiz-categories';
import {
  createQuestionSeed,
  generateQuestionBank,
  validateQuestionBank,
} from './question-generator';
import { QuizSession, QuizState, createInitialQuizState } from './quiz-state';
import { QuizStorage } from './quiz-storage';

@Injectable({ providedIn: 'root' })
export class MathQuiz {
  private readonly storage = inject(QuizStorage);
  private readonly mutableSession = signal(this.storage.load(MATH_QUESTIONS));
  private readonly session = this.mutableSession.asReadonly();
  readonly state = computed(() => this.session().state);
  readonly enabledCategories = computed(() => this.session().enabledCategories);
  readonly questionBank = computed(() => this.session().questions);
  private readonly activeQuestions = computed(() =>
    this.questionBank().filter((question) => this.enabledCategories().includes(question.category)),
  );
  readonly currentQuestion = computed(
    () => this.activeQuestions()[this.state().currentQuestionIndex] ?? null,
  );
  readonly questionNumber = computed(() => this.state().currentQuestionIndex + 1);
  readonly totalQuestions = computed(() => this.activeQuestions().length);
  readonly correctAnswers = computed(
    () => this.state().results.filter((result) => result.isCorrect).length,
  );
  readonly incorrectAnswers = computed(
    () => this.state().results.filter((result) => !result.isCorrect).length,
  );
  readonly progressPercent = computed(() =>
    Math.round((this.state().results.length / this.totalQuestions()) * 100),
  );
  readonly isCompleted = computed(() => this.state().phase === 'completed');
  readonly successPercent = computed(() => {
    const answered = this.state().results.length;
    return answered === 0 ? 0 : Math.round((this.correctAnswers() / answered) * 100);
  });

  selectAnswer(answer: string): void {
    const state = this.state();
    const question = this.currentQuestion();
    if (state.phase !== 'answering' || !question?.options.includes(answer)) return;
    this.updateState({ ...state, selectedAnswer: answer });
  }

  checkAnswer(): void {
    const state = this.state();
    const question = this.currentQuestion();
    if (state.phase !== 'answering' || !question || state.selectedAnswer === null) return;
    const result = {
      questionId: question.id,
      selectedAnswer: state.selectedAnswer,
      isCorrect: state.selectedAnswer === question.correctAnswer,
    };
    this.updateState({ ...state, phase: 'checked', results: [...state.results, result] });
  }

  nextQuestion(): void {
    const state = this.state();
    if (state.phase !== 'checked') return;
    if (state.currentQuestionIndex === this.totalQuestions() - 1) {
      this.updateState({ ...state, phase: 'completed' });
      return;
    }
    this.updateState({
      currentQuestionIndex: state.currentQuestionIndex + 1,
      selectedAnswer: null,
      phase: 'answering',
      results: state.results,
    });
  }

  restartQuiz(): void {
    const session: QuizSession = {
      questions: generateQuestionBank(createQuestionSeed()),
      enabledCategories: this.enabledCategories(),
      state: createInitialQuizState(),
    };
    this.storage.save(session);
    this.mutableSession.set(session);
  }

  configureCategories(categories: readonly MathQuestionCategory[]): void {
    if (!Array.isArray(categories) || categories.length === 0) return;
    const unique = new Set<MathQuestionCategory>();
    for (const category of categories as readonly unknown[]) {
      if (
        typeof category !== 'string' ||
        !ALL_CATEGORIES.includes(category as MathQuestionCategory)
      )
        return;
      unique.add(category as MathQuestionCategory);
    }
    const canonical = ALL_CATEGORIES.filter((category) => unique.has(category));
    const current = this.enabledCategories();
    if (
      canonical.length === current.length &&
      canonical.every((category, index) => category === current[index])
    )
      return;
    this.updateSession({
      questions: generateQuestionBank(createQuestionSeed()),
      enabledCategories: canonical,
      state: createInitialQuizState(),
    });
  }

  applyQuestionVariants(
    questions: readonly MathQuestion[],
    expectedBank: readonly MathQuestion[],
  ): boolean {
    const bank = this.questionBank();
    const state = this.state();
    if (
      bank !== expectedBank ||
      state.phase !== 'answering' ||
      state.currentQuestionIndex !== 0 ||
      state.selectedAnswer !== null ||
      state.results.length !== 0 ||
      !validateQuestionBank(questions) ||
      questions.length !== bank.length
    )
      return false;

    for (let index = 0; index < bank.length; index += 1) {
      const baseline = bank[index];
      const variant = questions[index];
      if (
        variant.id !== baseline.id ||
        variant.category !== baseline.category ||
        variant.instruction !== baseline.instruction ||
        variant.difficulty !== baseline.difficulty ||
        variant.correctAnswer !== baseline.correctAnswer ||
        (variant.explanation !== baseline.explanation &&
          !(
            baseline.category === 'word-problem' &&
            baseline.operation &&
            variant.explanation ===
              `${baseline.operation.top} ${baseline.operation.operator} ${baseline.operation.bottom} = ${baseline.correctAnswer}.`
          )) ||
        variant.options.some((option, optionIndex) => option !== baseline.options[optionIndex]) ||
        variant.operation?.top !== baseline.operation?.top ||
        variant.operation?.bottom !== baseline.operation?.bottom ||
        variant.operation?.operator !== baseline.operation?.operator ||
        (baseline.category !== 'word-problem' && variant.question !== baseline.question)
      )
        return false;
    }

    this.updateSession({ ...this.session(), questions: [...questions] });
    return true;
  }

  private updateState(state: QuizState): void {
    this.updateSession({
      questions: this.questionBank(),
      enabledCategories: this.enabledCategories(),
      state,
    });
  }

  private updateSession(session: QuizSession): void {
    this.mutableSession.set(session);
    this.storage.save(session);
  }
}
