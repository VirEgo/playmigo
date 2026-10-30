import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MathQuiz } from './math-quiz';
import { QuestionCard } from './question-card';
import { QuizHeader } from './quiz-header';
import { QuizProgress } from './quiz-progress';
import { QuizResults } from './quiz-results';
import { QuizSettings } from './quiz-settings';
import { MathQuestionCategory } from './math-question';
import { LocalModel } from './local-model';
import { QUIZ_TEXT } from './quiz-text';
import { TrainingModes } from '../training-modes';

@Component({
  selector: 'app-math-quiz-page',
  imports: [QuizHeader, QuizProgress, QuestionCard, QuizResults, QuizSettings, TrainingModes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="quiz-shell">
      <app-quiz-header (restart)="quiz.restartQuiz()" (settings)="settingsOpen.set(true)" />
      <app-training-modes />
      @if (settingsOpen()) {
        <app-quiz-settings
          [enabledCategories]="quiz.enabledCategories()"
          [hasProgress]="quiz.state().results.length > 0 || quiz.state().selectedAnswer !== null"
          (dismissed)="closeSettings()"
          (applied)="applySettings($event)"
          (generateProblems)="generateProblems()"
        />
      }
      @if (quiz.isCompleted()) {
        <app-quiz-results
          [correct]="quiz.correctAnswers()"
          [incorrect]="quiz.incorrectAnswers()"
          [percent]="quiz.successPercent()"
          (restart)="quiz.restartQuiz()"
        />
      } @else {
        <app-quiz-progress
          [questionNumber]="quiz.questionNumber()"
          [total]="quiz.totalQuestions()"
          [correct]="quiz.correctAnswers()"
          [percent]="quiz.progressPercent()"
        />
        @if (quiz.currentQuestion(); as question) {
          <app-question-card
            [question]="question"
            [selected]="quiz.state().selectedAnswer"
            [checked]="quiz.state().phase === 'checked'"
            [last]="quiz.questionNumber() === quiz.totalQuestions()"
            (choose)="quiz.selectAnswer($event)"
            (check)="quiz.checkAnswer()"
            (next)="quiz.nextQuestion()"
          />
        }
      }
      <footer>{{ text.footer }}</footer>
    </main>
  `,
  styles: `
    .quiz-shell {
      width: calc(100% - 80px);
      max-width: 768px;
      padding: 40px 0;
      margin: 0 auto;
    }
    footer {
      margin-top: 36px;
      text-align: center;
      font-size: 14px;
      color: #4b6467;
    }
    @media (max-width: 767px) {
      .quiz-shell {
        width: calc(100% - 48px);
        padding-top: 32px;
      }
    }
    @media (max-width: 390px) {
      .quiz-shell {
        width: calc(100% - 36px);
        padding-top: 24px;
      }
    }
  `,
})
export class MathQuizPage {
  protected readonly quiz = inject(MathQuiz);
  protected readonly text = QUIZ_TEXT;
  protected readonly settingsOpen = signal(false);
  private readonly localModel = inject(LocalModel);

  protected closeSettings(): void {
    this.localModel.cancel();
    this.settingsOpen.set(false);
  }

  protected async generateProblems(): Promise<void> {
    const bank = this.quiz.questionBank();
    const updated = await this.localModel.generateQuestions(bank);
    if (updated && this.settingsOpen() && !this.quiz.applyQuestionVariants(updated, bank))
      this.localModel.markStale();
  }

  protected applySettings(categories: readonly MathQuestionCategory[]): void {
    this.localModel.cancel();
    this.quiz.configureCategories(categories);
    this.settingsOpen.set(false);
  }
}
