import { TestBed } from '@angular/core/testing';
import { ANIMALS } from './data/animals';
import {
  AnimalQuiz,
  ANIMAL_QUIZ_CATALOG,
  ANIMAL_STORAGE_KEY,
  generateAnimalQuestions,
  validateAnimalSession,
} from './animal-quiz';

describe('AnimalQuiz', () => {
  const animals = ANIMALS.slice(0, 4);
  let quiz: AnimalQuiz;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: ANIMAL_QUIZ_CATALOG, useValue: animals }],
    });
    quiz = TestBed.inject(AnimalQuiz);
  });

  afterEach(() => vi.restoreAllMocks());

  it('includes all 55 distinct animals from the catalog with three names in each group', () => {
    const questions = generateAnimalQuestions(ANIMALS);
    expect(questions).toHaveLength(55);
    expect(new Set(questions.map((question) => question.id)).size).toBe(55);
    for (const question of questions) {
      const animal = ANIMALS.find((entry) => entry.id === question.id)!;
      expect(new Set(question.options).size).toBe(3);
      expect(question.options).toContain(animal.name);
      for (const option of question.options) {
        expect(ANIMALS.find((entry) => entry.name === option)?.group).toBe(animal.group);
      }
    }
  });

  it('uses smaller available catalogs without repeating questions', () => {
    expect(generateAnimalQuestions(animals)).toHaveLength(4);
    expect(generateAnimalQuestions([])).toEqual([]);
    const first = generateAnimalQuestions(ANIMALS, () => 0).map((question) => question.id);
    const second = generateAnimalQuestions(ANIMALS, () => 0.999).map((question) => question.id);
    expect(first).not.toEqual(second);
  });

  it('keeps a full session and rejects an incomplete catalog', () => {
    const questions = generateAnimalQuestions(ANIMALS);
    const session = {
      version: 1,
      questions,
      index: 1,
      selected: null,
      answers: [questions[0].options[0]],
      phase: 'answering',
    };
    expect(validateAnimalSession(session, ANIMALS)).toEqual(session);
    expect(
      validateAnimalSession({ ...session, questions: questions.slice(0, 30) }, ANIMALS),
    ).toBeNull();
  });

  it('restores progress beyond question 30 and full completion without truncating', () => {
    const questions = generateAnimalQuestions(ANIMALS);
    const inProgress = {
      version: 1,
      questions,
      index: 34,
      selected: null,
      answers: questions.slice(0, 34).map((question) => question.options[0]),
      phase: 'answering',
    };
    expect(validateAnimalSession(inProgress, ANIMALS)).toEqual(inProgress);
    const completed = {
      ...inProgress,
      index: 54,
      selected: questions[54].options[0],
      answers: questions.map((question) => question.options[0]),
      phase: 'completed',
    };
    expect(validateAnimalSession(completed, ANIMALS)).toEqual(completed);
  });

  it('requires a valid selection, checks once and locks the answer', () => {
    quiz.check();
    quiz.next();
    quiz.select('invalid');
    expect(quiz.session().answers).toEqual([]);
    quiz.select(quiz.animal()!.name);
    quiz.check();
    quiz.check();
    quiz.select('invalid');
    expect(quiz.correct()).toBe(1);
    expect(quiz.session().answers).toHaveLength(1);
    expect(quiz.session().phase).toBe('checked');
    quiz.next();
    expect(quiz.session().index).toBe(1);
    expect(quiz.session().selected).toBeNull();
  });

  it('restores exact questions, selection, checked answers and completion', () => {
    const initial = quiz.session().questions;
    expect(JSON.parse(localStorage.getItem(ANIMAL_STORAGE_KEY)!).questions).toEqual(initial);
    quiz.select(quiz.animal()!.name);
    expect(TestBed.runInInjectionContext(() => new AnimalQuiz()).session()).toEqual(quiz.session());
    quiz.check();
    expect(TestBed.runInInjectionContext(() => new AnimalQuiz()).session()).toEqual(quiz.session());
    quiz.next();
    expect(TestBed.runInInjectionContext(() => new AnimalQuiz()).session()).toEqual(quiz.session());
  });

  it('preserves math storage and totals mixed answers before showing results', () => {
    localStorage.setItem('math-quiz-session-v1', 'math-session');
    for (let index = 0; index < animals.length; index++) {
      quiz.select(
        index === 0
          ? quiz.question()!.options.find((option) => option !== quiz.animal()!.name)!
          : quiz.animal()!.name,
      );
      quiz.check();
      if (index !== animals.length - 1) quiz.next();
    }
    expect(quiz.session().phase).toBe('checked');
    expect(quiz.correct()).toBe(3);
    expect(quiz.progress()).toBe(100);
    quiz.next();
    expect(quiz.session().phase).toBe('completed');
    expect(quiz.percent()).toBe(75);
    expect(
      validateAnimalSession(JSON.parse(localStorage.getItem(ANIMAL_STORAGE_KEY)!), animals),
    ).toEqual(quiz.session());
    quiz.restart();
    expect(quiz.session().answers).toEqual([]);
    expect(localStorage.getItem('math-quiz-session-v1')).toBe('math-session');
  });

  it('rejects forged sessions, missing animals, duplicate options and impossible progress', () => {
    const session = quiz.session();
    for (const value of [
      { ...session, version: 99 },
      { ...session, index: -1 },
      { ...session, answers: [session.questions[0].options[0]] },
      { ...session, phase: 'completed' },
      { ...session, selected: 'invalid' },
      { ...session, questions: session.questions.map(() => session.questions[0]) },
      {
        ...session,
        questions: session.questions.map((question) => ({
          ...question,
          options: ['el gos', 'el gos', 'el gos'],
        })),
      },
    ])
      expect(validateAnimalSession(value, animals)).toBeNull();
    expect(validateAnimalSession(session, animals.slice(1))).toBeNull();
  });

  it('continues in memory if storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    quiz.select(quiz.animal()!.name);
    quiz.check();
    expect(quiz.correct()).toBe(1);
  });
});
