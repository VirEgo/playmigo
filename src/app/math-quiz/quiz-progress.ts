import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-quiz-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progress-labels">
      <p data-testid="question-number">
        {{ text.question }} {{ questionNumber() }} {{ text.of }} {{ total() }}
      </p>
      <p data-testid="score">
        {{ text.correct }}: <strong>{{ correct() }}</strong>
      </p>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      [attr.aria-label]="text.progress"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="percent()"
      [attr.aria-valuetext]="percent() + '%'"
    >
      <div class="progress-fill" [style.width.%]="percent()"></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 24px;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 16px;
    }
    p {
      margin: 0 0 14px;
    }
    p:first-child {
      font-weight: 800;
    }
    .progress-track {
      height: 12px;
      border: 1.5px solid var(--outline);
      border-radius: 12px;
      background: var(--surface);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: inherit;
      transition: width 0.3s ease;
    }
    @media (max-width: 390px) {
      .progress-labels {
        font-size: 14px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .progress-fill {
        transition: none;
      }
    }
  `,
})
export class QuizProgress {
  readonly questionNumber = input.required<number>();
  readonly total = input.required<number>();
  readonly correct = input.required<number>();
  readonly percent = input.required<number>();
  protected readonly text = QUIZ_TEXT;
}
