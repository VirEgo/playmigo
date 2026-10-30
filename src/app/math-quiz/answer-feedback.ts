import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCircleCheck, LucideLightbulb } from '@lucide/angular';
import { MathQuestion } from './math-question';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-answer-feedback',
  imports: [LucideCircleCheck, LucideLightbulb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="feedback-region" aria-live="polite" aria-atomic="true">
      @if (visible()) {
        <div class="feedback" [class.incorrect]="!correct()" data-testid="feedback">
          @if (correct()) {
            <svg lucideCircleCheck aria-hidden="true"></svg>
          } @else {
            <svg lucideLightbulb aria-hidden="true"></svg>
          }
          <div>
            <p class="feedback-title">
              @if (correct()) {
                {{ text.success }}
              } @else {
                {{ text.tryAgain }} <strong>{{ question().correctAnswer }}.</strong>
              }
            </p>
            <p class="explanation">{{ question().explanation }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .feedback {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 30px;
      padding: 17px 20px;
      border: 2px solid var(--outline);
      border-radius: 16px;
      background: #eff6e8;
    }
    .incorrect {
      background: #fff2df;
    }
    svg {
      flex: 0 0 auto;
      width: 23px;
      height: 23px;
      color: var(--teal);
      margin-top: 2px;
    }
    p {
      margin: 0;
    }
    .feedback-title {
      font-size: 17px;
      font-weight: 800;
      color: var(--teal);
    }
    .explanation {
      font-size: 16px;
      line-height: 1.55;
      margin-top: 5px;
    }
    @media (max-width: 599px) {
      .feedback {
        padding: 15px;
        gap: 10px;
        margin-top: 24px;
      }
      .feedback-title {
        font-size: 16px;
      }
    }
  `,
})
export class AnswerFeedback {
  readonly visible = input(false);
  readonly correct = input(false);
  readonly question = input.required<MathQuestion>();
  protected readonly text = QUIZ_TEXT;
}
