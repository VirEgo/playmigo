import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TrainingModes } from '../training-modes';
import { LOGIC_ACTIVITIES, getActivity } from './logic-content';
import { Difficulty, LEVELS } from './logic-exercise';
import { LogicProgressStore, hintFor } from './logic-progress';
import { LogicWorkspace } from './logic-workspace';
import { LogicIcon } from './logic-icon';

@Component({
  selector: 'app-logic-page',
  imports: [TrainingModes, RouterLink, LogicWorkspace, LogicIcon],
  templateUrl: './logic-page.html',
  styleUrls: ['./logic-page.scss', './logic-page-controls.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogicPage {
  protected readonly store = inject(LogicProgressStore);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  protected readonly activity = computed(() => getActivity(this.params()?.get('id') ?? ''));
  protected readonly unknown = computed(() => !!this.params()?.get('id') && !this.activity());
  protected readonly levels = LEVELS;
  protected readonly activities = LOGIC_ACTIVITIES;
  protected readonly selectedLevel = signal<Difficulty | null>(null);
  protected readonly recommendation = computed(() => this.store.recommendation());
  protected readonly level = computed(() => this.selectedLevel() ?? this.recommendation().level);
  protected readonly visibleActivities = computed(() =>
    LOGIC_ACTIVITIES.filter((activity) => activity.difficulty === this.level()),
  );
  protected readonly progress = computed(() => {
    const activity = this.activity();
    return activity ? this.store.progress(activity) : undefined;
  });
  protected readonly variant = computed(
    () => this.activity()?.variants[this.progress()?.variant ?? 0],
  );
  protected readonly run = computed(() => {
    const activity = this.activity();
    return activity ? this.store.run(activity) : undefined;
  });
  protected readonly hint = computed(() => {
    const variant = this.variant(),
      run = this.run();
    return variant && run ? hintFor(variant.puzzle, run) : null;
  });
  protected readonly next = computed(() => {
    const current = this.activity();
    if (!current) return undefined;
    const remaining = LOGIC_ACTIVITIES.filter((activity) =>
      this.store.unlocked(activity.difficulty),
    );
    return [
      ...remaining.filter((activity) => activity.id > current.id),
      ...remaining.filter((activity) => activity.id < current.id),
    ].find((activity) => !this.store.progress(activity)?.bestStars);
  });
  constructor() {
    effect(() => {
      const activity = this.activity();
      if (activity && this.store.unlocked(activity.difficulty) && !this.store.run(activity))
        this.store.open(activity);
    });
  }
  protected completedIn(level: Difficulty): number {
    return LOGIC_ACTIVITIES.filter(
      (activity) => activity.difficulty === level && this.store.progress(activity)?.bestStars,
    ).length;
  }
  protected stars(value: number): boolean[] {
    return [0, 1, 2].map((index) => index < value);
  }
  protected pickLevel(level: Difficulty): void {
    if (this.store.unlocked(level)) this.selectedLevel.set(level);
  }
  protected changeVariant(index: number): void {
    const activity = this.activity();
    if (activity) this.store.open(activity, index);
  }
}
