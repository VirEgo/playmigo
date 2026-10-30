import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideTrophy, LucideRotateCcw } from '@lucide/angular';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-quiz-results',
  imports: [LucideTrophy, LucideRotateCcw],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="quiz-card results-card" aria-labelledby="results-title">
      <div class="trophy"><svg lucideTrophy aria-hidden="true"></svg></div>
      <h2 id="results-title">{{ text.completed }}</h2>
      <p class="encouragement">{{ encouragement() }}</p>
      <div class="results-score" [attr.aria-label]="text.results">
        <div>
          <strong>{{ correct() }}</strong
          ><span>{{ text.correct }}</span>
        </div>
        <div>
          <strong>{{ incorrect() }}</strong
          ><span>{{ text.mistakes }}</span>
        </div>
        <div>
          <strong>{{ percent() }}<small>%</small></strong
          ><span>{{ text.percentage }}</span>
        </div>
      </div>
      <button class="primary-button" type="button" (click)="restart.emit()">
        <svg lucideRotateCcw aria-hidden="true"></svg>{{ text.restart }}
      </button>
    </section>
  `,
  styles: `
    .results-card {
      text-align: center;
    }
    .trophy {
      display: grid;
      place-items: center;
      margin: 0 auto 22px;
      width: 74px;
      height: 74px;
      border-radius: 50%;
      background: var(--peach);
      color: var(--teal);
    }
    .trophy svg {
      width: 38px;
      height: 38px;
    }
    h2 {
      font-size: 32px;
      font-weight: 900;
      margin: 0 0 14px;
    }
    .encouragement {
      font-size: 18px;
      margin: 0;
    }
    .results-score {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 36px auto;
      max-width: 570px;
    }
    .results-score div {
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      gap: 5px;
    }
    .results-score div + div {
      border-left: 1px solid #b9ccc6;
    }
    .results-score strong {
      font-size: 42px;
      font-weight: 900;
      color: var(--teal);
    }
    small {
      font-size: 25px;
    }
    span {
      font-size: 16px;
      font-weight: 700;
    }
    @media (max-width: 599px) {
      h2 {
        font-size: 27px;
      }
      .results-score {
        margin: 28px auto;
      }
      .results-score div {
        padding: 0 6px;
      }
      .results-score strong {
        font-size: 32px;
      }
      span {
        font-size: 13px;
      }
      small {
        font-size: 20px;
      }
    }
  `,
})
export class QuizResults {
  readonly correct = input.required<number>();
  readonly incorrect = input.required<number>();
  readonly percent = input.required<number>();
  readonly restart = output<void>();
  protected readonly text = QUIZ_TEXT;
  protected readonly encouragement = computed(() => {
    const percent = this.percent();
    return percent >= 90
      ? this.text.encouragement.excellent
      : percent >= 70
        ? this.text.encouragement.good
        : percent >= 50
          ? this.text.encouragement.practice
          : this.text.encouragement.keepGoing;
  });
}
