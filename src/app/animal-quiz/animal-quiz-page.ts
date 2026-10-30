import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideCheck,
  LucidePawPrint,
  LucideRotateCcw,
  LucideTrophy,
} from '@lucide/angular';
import { TrainingModes } from '../training-modes';
import { AnswerOptions } from '../math-quiz/answer-options';
import { AnimalQuiz } from './animal-quiz';

@Component({
  selector: 'app-animal-quiz-page',
  imports: [
    TrainingModes,
    AnswerOptions,
    LucideArrowRight,
    LucideCheck,
    LucidePawPrint,
    LucideRotateCcw,
    LucideTrophy,
  ],
  templateUrl: './animal-quiz-page.html',
  styleUrl: './animal-quiz-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalQuizPage {
  protected readonly quiz = inject(AnimalQuiz);
  protected readonly failedImage = signal<string | null>(null);
}
