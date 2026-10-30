import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck, LucideX } from '@lucide/angular';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-answer-options',
  imports: [LucideCheck, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="answer-options" role="group" [attr.aria-label]="label()">
      @for (option of options(); track $index) {
        <button
          type="button"
          class="answer"
          [class.selected]="selected() === option"
          [class.correct]="correctAnswer() === option"
          [class.incorrect]="
            correctAnswer() !== null && selected() === option && correctAnswer() !== option
          "
          [attr.aria-pressed]="selected() === option"
          [disabled]="locked()"
          (click)="choose.emit(option)"
        >
          <span>{{ option }}</span>
          @if (correctAnswer() === option) {
            <small class="answer-result">{{ correctLabel() }}</small>
            <svg lucideCheck class="selection-icon" aria-hidden="true"></svg>
          } @else if (selected() === option) {
            @if (correctAnswer() !== null) {
              <small class="answer-result">{{ incorrectLabel() }}</small>
              <svg lucideX class="selection-icon" aria-hidden="true"></svg>
            } @else {
              <svg lucideCheck class="selection-icon" aria-hidden="true"></svg>
            }
          }
        </button>
      }
    </div>
  `,
  styleUrl: './answer-options.scss',
})
export class AnswerOptions {
  readonly options = input.required<readonly string[]>();
  readonly selected = input.required<string | null>();
  readonly locked = input(false);
  readonly label = input<string>(QUIZ_TEXT.answers);
  readonly correctAnswer = input<string | null>(null);
  readonly correctLabel = input('Respuesta correcta');
  readonly incorrectLabel = input('Tu respuesta');
  readonly choose = output<string>();
}
