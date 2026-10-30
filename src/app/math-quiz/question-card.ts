import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideArrowRight, LucideCheck, LucideFlag } from '@lucide/angular';
import { AnswerFeedback } from './answer-feedback';
import { AnswerOptions } from './answer-options';
import { ColumnOperation } from './column-operation';
import { MathQuestion } from './math-question';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-question-card',
  imports: [
    AnswerOptions,
    AnswerFeedback,
    ColumnOperation,
    LucideArrowRight,
    LucideCheck,
    LucideFlag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="quiz-card" aria-labelledby="question-title">
      <p class="instruction">{{ question().instruction }}</p>
      <h2
        id="question-title"
        data-testid="question-title"
        [class.with-operation]="question().operation"
      >
        {{
          question().operation &&
          question().category !== 'word-problem' &&
          question().category !== 'division'
            ? text.operationTitle
            : question().question
        }}
      </h2>
      @if (question().operation; as operation) {
        <app-column-operation
          [operation]="operation"
          [revealed]="checked()"
          [result]="question().correctAnswer"
        />
      }
      <app-answer-options
        [options]="question().options"
        [selected]="selected()"
        [locked]="checked()"
        (choose)="choose.emit($event)"
      />
      <app-answer-feedback
        [visible]="checked()"
        [correct]="selected() === question().correctAnswer"
        [question]="question()"
      />
      <div class="card-actions">
        <button
          class="primary-button"
          type="button"
          [disabled]="selected() === null"
          (click)="checked() ? next.emit() : check.emit()"
        >
          @if (!checked()) {
            <svg lucideCheck aria-hidden="true"></svg><span>{{ text.check }}</span>
          } @else if (last()) {
            <span>{{ text.finish }}</span
            ><svg lucideFlag aria-hidden="true"></svg>
          } @else {
            <span>{{ text.next }}</span
            ><svg lucideArrowRight aria-hidden="true"></svg>
          }
        </button>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .instruction {
      margin: 0 0 18px;
      font-size: 18px;
      font-weight: 800;
      color: var(--teal);
    }
    h2 {
      margin: 0 0 34px;
      font-size: 30px;
      font-weight: 900;
      line-height: 1.4;
      letter-spacing: -0.3px;
    }
    .card-actions {
      margin-top: 32px;
    }
    h2.with-operation {
      margin-bottom: 20px;
    }
    @media (max-width: 599px) {
      .instruction {
        font-size: 16px;
        margin-bottom: 16px;
      }
      h2 {
        font-size: 26px;
        line-height: 1.35;
        margin-bottom: 26px;
      }
      .card-actions {
        margin-top: 26px;
      }
    }
  `,
})
export class QuestionCard {
  readonly question = input.required<MathQuestion>();
  readonly selected = input.required<string | null>();
  readonly checked = input(false);
  readonly last = input(false);
  readonly choose = output<string>();
  readonly check = output<void>();
  readonly next = output<void>();
  protected readonly text = QUIZ_TEXT;
}
