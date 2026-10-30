import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnimalQuizPage } from './animal-quiz-page';
import { AnimalQuiz, ANIMAL_QUIZ_CATALOG } from './animal-quiz';
import { ANIMALS } from './data/animals';

describe('AnimalQuizPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows a clear pending state while separate pictures have not been supplied', async () => {
    TestBed.configureTestingModule({
      imports: [AnimalQuizPage],
      providers: [provideRouter([]), { provide: ANIMAL_QUIZ_CATALOG, useValue: [] }],
    });
    const fixture = TestBed.createComponent(AnimalQuizPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Els animals t’esperen!');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-answer-options')).toBeNull();
  });

  it('renders a supplied image, exactly three answers, correction and results in Valencian', async () => {
    TestBed.configureTestingModule({
      imports: [AnimalQuizPage],
      providers: [
        provideRouter([]),
        { provide: ANIMAL_QUIZ_CATALOG, useValue: ANIMALS.slice(0, 1) },
      ],
    });
    const fixture = TestBed.createComponent(AnimalQuizPage);
    const quiz = TestBed.inject(AnimalQuiz);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main')?.lang).toBe('ca-valencia');
    expect(element.querySelector('img')?.alt).toBe('Animal per identificar');
    const options = element.querySelectorAll<HTMLButtonElement>('.answer');
    expect(options.length).toBe(3);
    const check = element.querySelector<HTMLButtonElement>('.card-actions button')!;
    expect(check.disabled).toBe(true);
    expect(element.querySelector('.answer.correct')).toBeNull();
    const wrong = Array.from(options).find(
      (option) => option.textContent?.trim() !== quiz.animal()!.name,
    )!;
    wrong.click();
    await fixture.whenStable();
    expect(check.disabled).toBe(false);
    check.click();
    await fixture.whenStable();
    expect(element.querySelector('[data-testid="feedback"]')?.textContent).toContain(
      'La resposta correcta és',
    );
    expect(element.querySelector('[data-testid="feedback"]')?.textContent).toContain('el gos');
    expect(element.querySelector('.answer.correct')?.textContent).toContain('el gos');
    expect(element.querySelector('.answer.correct')?.textContent).toContain('Resposta correcta');
    expect(wrong.classList.contains('incorrect')).toBe(true);
    expect(wrong.textContent).toContain('La teua resposta');
    expect(Array.from(options).every((option) => option.disabled)).toBe(true);
    check.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Has completat el repte!');
    expect(element.querySelector('.results-score')?.textContent).toContain('0%');
  });

  it('shows a recoverable image error and prevents answering without an image', async () => {
    TestBed.configureTestingModule({
      imports: [AnimalQuizPage],
      providers: [
        provideRouter([]),
        { provide: ANIMAL_QUIZ_CATALOG, useValue: ANIMALS.slice(0, 1) },
      ],
    });
    const fixture = TestBed.createComponent(AnimalQuizPage);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No s’ha pogut carregar',
    );
    expect(fixture.nativeElement.querySelector('.answer').disabled).toBe(true);
  });
});
