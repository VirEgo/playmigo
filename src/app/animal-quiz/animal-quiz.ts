import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { ANIMALS, Animal } from './data/animals';

export const ANIMAL_STORAGE_KEY = 'animal-quiz-session-v1';
export const ANIMAL_QUIZ_CATALOG = new InjectionToken<readonly Animal[]>('Animal quiz images', {
  providedIn: 'root',
  factory: () => ANIMALS.filter((animal) => !!animal.image),
});

export interface AnimalQuestion {
  readonly id: string;
  readonly options: readonly string[];
}

export interface AnimalSession {
  readonly version: 1;
  readonly questions: readonly AnimalQuestion[];
  readonly index: number;
  readonly selected: string | null;
  readonly answers: readonly string[];
  readonly phase: 'answering' | 'checked' | 'completed';
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function generateAnimalQuestions(
  animals: readonly Animal[],
  random: () => number = Math.random,
): readonly AnimalQuestion[] {
  return shuffled(animals, random).map((animal) => {
    const alternatives = ANIMALS.filter(
      (other) => other.id !== animal.id && other.group === animal.group,
    );
    return {
      id: animal.id,
      options: shuffled(
        [
          animal.name,
          ...shuffled(alternatives, random)
            .slice(0, 2)
            .map((other) => other.name),
        ],
        random,
      ),
    };
  });
}

function initialSession(animals: readonly Animal[]): AnimalSession {
  return {
    version: 1,
    questions: generateAnimalQuestions(animals),
    index: 0,
    selected: null,
    answers: [],
    phase: 'answering',
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateAnimalSession(
  value: unknown,
  animals: readonly Animal[],
): AnimalSession | null {
  if (
    !record(value) ||
    value['version'] !== 1 ||
    !Array.isArray(value['questions']) ||
    value['questions'].length !== animals.length ||
    animals.length === 0 ||
    !Array.isArray(value['answers']) ||
    !Number.isInteger(value['index'])
  )
    return null;
  const questions: AnimalQuestion[] = [];
  const seen = new Set<string>();
  for (const item of value['questions']) {
    if (!record(item) || typeof item['id'] !== 'string' || !Array.isArray(item['options']))
      return null;
    const animal = animals.find((entry) => entry.id === item['id']);
    const options: unknown[] = item['options'];
    if (
      !animal ||
      seen.has(animal.id) ||
      options.length !== 3 ||
      new Set(options).size !== 3 ||
      !options.includes(animal.name) ||
      options.some(
        (option) =>
          typeof option !== 'string' ||
          !ANIMALS.some((entry) => entry.name === option && entry.group === animal.group),
      )
    )
      return null;
    seen.add(animal.id);
    questions.push({ id: animal.id, options: options as string[] });
  }
  const index = value['index'] as number;
  const phase = value['phase'];
  const selected = value['selected'];
  const answers: unknown[] = value['answers'];
  if (
    index < 0 ||
    index >= questions.length ||
    (selected !== null &&
      (typeof selected !== 'string' || !questions[index].options.includes(selected))) ||
    answers.some(
      (answer, answerIndex) =>
        typeof answer !== 'string' || !questions[answerIndex]?.options.includes(answer),
    )
  )
    return null;
  if (phase === 'answering') {
    if (answers.length !== index) return null;
  } else if (phase === 'checked' || phase === 'completed') {
    if (
      answers.length !== index + 1 ||
      selected !== answers[index] ||
      (phase === 'completed' && index !== questions.length - 1)
    )
      return null;
  } else return null;
  return {
    version: 1,
    questions,
    index,
    selected: selected as string | null,
    answers: answers as string[],
    phase,
  };
}

@Injectable({ providedIn: 'root' })
export class AnimalQuiz {
  private readonly animals = inject(ANIMAL_QUIZ_CATALOG);
  private readonly mutableSession = signal(this.restore());
  readonly session = this.mutableSession.asReadonly();
  readonly total = computed(() => this.session().questions.length);
  readonly question = computed(() => this.session().questions[this.session().index] ?? null);
  readonly animal = computed(
    () => this.animals.find((entry) => entry.id === this.question()?.id) ?? null,
  );
  readonly correct = computed(
    () =>
      this.session().answers.filter(
        (answer, index) =>
          answer ===
          this.animals.find((entry) => entry.id === this.session().questions[index].id)?.name,
      ).length,
  );
  readonly progress = computed(() =>
    this.total() ? Math.round((this.session().answers.length / this.total()) * 100) : 0,
  );
  readonly percent = computed(() =>
    this.total() ? Math.round((this.correct() / this.total()) * 100) : 0,
  );

  constructor() {
    if (this.animals.length) this.update(this.session());
  }

  select(answer: string): void {
    if (this.session().phase !== 'answering' || !this.question()?.options.includes(answer)) return;
    this.update({ ...this.session(), selected: answer });
  }

  check(): void {
    const session = this.session();
    if (!this.question() || session.phase !== 'answering' || session.selected === null) return;
    this.update({ ...session, phase: 'checked', answers: [...session.answers, session.selected] });
  }

  next(): void {
    const session = this.session();
    if (session.phase !== 'checked') return;
    this.update(
      session.index === this.total() - 1
        ? { ...session, phase: 'completed' }
        : { ...session, index: session.index + 1, selected: null, phase: 'answering' },
    );
  }

  restart(): void {
    this.update(initialSession(this.animals));
  }

  private restore(): AnimalSession {
    try {
      const saved: unknown = JSON.parse(
        globalThis.localStorage?.getItem(ANIMAL_STORAGE_KEY) ?? 'null',
      );
      const valid = validateAnimalSession(saved, this.animals);
      if (valid) return valid;
    } catch {
      /* Private browsing or malformed storage must not prevent practice. */
    }
    return initialSession(this.animals);
  }

  private update(session: AnimalSession): void {
    this.mutableSession.set(session);
    try {
      globalThis.localStorage?.setItem(ANIMAL_STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* The current session remains usable if storage is unavailable. */
    }
  }
}
