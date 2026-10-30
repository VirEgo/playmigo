import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  input,
  inject,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { MATH_QUESTIONS } from './data/math-questions';
import { MathQuestionCategory } from './math-question';
import { ALL_CATEGORIES, QUIZ_CATEGORIES } from './quiz-categories';
import { QUIZ_TEXT } from './quiz-text';
import { LocalModel } from './local-model';
import { LOCAL_MODEL_ENABLED } from '../deployment';

@Component({
  selector: 'app-quiz-settings',
  imports: [LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      aria-labelledby="settings-title"
      aria-describedby="settings-intro"
      (cancel)="cancel($event)"
      (keydown)="trapFocus($event)"
    >
      <form (submit)="apply($event)">
        <header class="settings-heading">
          <div>
            <h2 id="settings-title">{{ text.title }}</h2>
            <p id="settings-intro">{{ text.intro }}</p>
          </div>
          <button
            type="button"
            class="close-button"
            [attr.aria-label]="text.close"
            (click)="cancel()"
          >
            <svg lucideX aria-hidden="true"></svg>
          </button>
        </header>
        <fieldset>
          <legend>{{ text.group }}</legend>
          <div class="selection-actions">
            <button type="button" (click)="selectAll()">{{ text.selectAll }}</button>
            <button type="button" (click)="clearAll()">{{ text.clearAll }}</button>
          </div>
          <div class="category-options">
            @for (category of categories; track category.id) {
              <label class="category-choice" [class.chosen]="draft().includes(category.id)">
                <input
                  type="checkbox"
                  [checked]="draft().includes(category.id)"
                  (change)="toggle(category.id)"
                  [attr.aria-label]="category.label"
                />
                <span class="choice-copy"
                  ><strong>{{ category.label }}</strong
                  ><span>{{ category.count }} {{ text.questions }}</span></span
                >
              </label>
            }
          </div>
        </fieldset>
        <div class="selection-summary" aria-live="polite">
          @if (selectedCount() === 0) {
            <p class="empty-selection">{{ text.minimum }}</p>
          } @else {
            <p class="question-count" data-testid="settings-question-count">
              {{ selectedCount() }} {{ text.questions }}
            </p>
          }
        </div>
        <p class="variety-note">{{ allText.variety }}</p>
        @if (localModelEnabled) {
          <details class="local-model">
            <summary>{{ localText.title }}</summary>
            <p>{{ localText.intro }}</p>
            <button
              class="cancel-button"
              type="button"
              [disabled]="localModel.busy()"
              (click)="localModel.checkConnection()"
            >
              {{ localText.check }}
            </button>
            @if (localModel.models().length > 0) {
              <label class="model-label"
                >{{ localText.model }}
                <select
                  #modelSelect
                  [value]="localModel.selectedModel()"
                  [disabled]="localModel.busy()"
                  (change)="localModel.selectModel(modelSelect.value)"
                >
                  @for (model of localModel.models(); track model) {
                    <option [value]="model">{{ model }}</option>
                  }
                </select>
              </label>
            }
            <p role="status" class="model-status">{{ localModel.message() }}</p>
            @if (hasProgress() || changed() || !draft().includes('word-problem')) {
              <p class="model-help">{{ localText.beforeStart }}</p>
            }
            @if (localModel.status() === 'generating') {
              <button type="button" class="cancel-button" (click)="localModel.cancel()">
                {{ localText.cancel }}
              </button>
            } @else {
              <button
                type="button"
                class="cancel-button"
                [disabled]="
                  hasProgress() ||
                  changed() ||
                  !draft().includes('word-problem') ||
                  localModel.models().length === 0 ||
                  localModel.busy()
                "
                (click)="generateProblems.emit()"
              >
                {{ localText.generate }}
              </button>
            }
          </details>
        }
        @if (hasProgress() && changed()) {
          <p class="reset-notice">{{ text.resetNotice }}</p>
        }
        <div class="settings-actions">
          <button type="button" class="cancel-button" (click)="cancel()">{{ text.cancel }}</button>
          <button type="submit" class="primary-button" [disabled]="selectedCount() === 0">
            {{ changed() ? text.apply : text.keep }}
          </button>
        </div>
      </form>
    </dialog>
  `,
  styleUrl: './quiz-settings.scss',
})
export class QuizSettings {
  readonly enabledCategories = input<readonly MathQuestionCategory[]>(ALL_CATEGORIES);
  readonly hasProgress = input(false);
  readonly dismissed = output<void>();
  readonly applied = output<readonly MathQuestionCategory[]>();
  readonly generateProblems = output<void>();
  protected readonly localModel = inject(LocalModel);
  protected readonly localModelEnabled = LOCAL_MODEL_ENABLED;
  protected readonly allText = QUIZ_TEXT;
  protected readonly localText = QUIZ_TEXT.localModel;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  protected readonly text = QUIZ_TEXT.settings;
  protected readonly categories = QUIZ_CATEGORIES.map((category) => ({
    ...category,
    count: MATH_QUESTIONS.filter((question) => question.category === category.id).length,
  }));
  protected readonly draft = linkedSignal(() => [...this.enabledCategories()]);
  protected readonly selectedCount = computed(
    () => MATH_QUESTIONS.filter((question) => this.draft().includes(question.category)).length,
  );
  protected readonly changed = computed(() =>
    ALL_CATEGORIES.some(
      (category) => this.draft().includes(category) !== this.enabledCategories().includes(category),
    ),
  );

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected toggle(category: MathQuestionCategory): void {
    this.draft.update((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const controls = this.dialog().nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary',
    );
    const visible = [...controls].filter((control) => control.getClientRects().length > 0);
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected selectAll(): void {
    this.draft.set([...ALL_CATEGORIES]);
  }
  protected clearAll(): void {
    this.draft.set([]);
  }

  protected cancel(event?: Event): void {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.dismissed.emit();
  }

  protected apply(event: Event): void {
    event.preventDefault();
    if (this.selectedCount() === 0) return;
    this.dialog().nativeElement.close();
    this.applied.emit(this.draft());
  }
}
