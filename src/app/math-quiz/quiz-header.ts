import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { LucideRotateCcw, LucideSlidersHorizontal } from '@lucide/angular';
import { QUIZ_TEXT } from './quiz-text';

@Component({
  selector: 'app-quiz-header',
  imports: [LucideRotateCcw, LucideSlidersHorizontal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="quiz-header">
      <div class="heading-copy">
        <p class="subject">{{ text.subject }}</p>
        <h1>{{ text.title }}</h1>
      </div>
      <div class="header-actions">
        <button class="restart-button" type="button" (click)="restart.emit()">
          <svg lucideRotateCcw aria-hidden="true"></svg><span>{{ text.restart }}</span>
        </button>
        <button
          class="restart-button settings-button"
          type="button"
          (click)="settings.emit()"
          [attr.aria-label]="text.settings.title"
          [title]="text.settings.title"
        >
          <svg lucideSlidersHorizontal aria-hidden="true"></svg>
        </button>
      </div>
    </header>
  `,
  styleUrl: './quiz-header.scss',
})
export class QuizHeader {
  readonly restart = output<void>();
  readonly settings = output<void>();
  protected readonly text = QUIZ_TEXT;
}
