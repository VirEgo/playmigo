import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Answer, Direction, GridPuzzle, Puzzle, Tile } from './logic-exercise';
import { LogicTile } from './logic-tile';
import { LogicIcon } from './logic-icon';
import { adjacent, machineSteps, robotPath } from './logic-validation';

@Component({
  selector: 'app-logic-workspace',
  imports: [LogicTile, LogicIcon],
  templateUrl: './logic-workspace.html',
  styleUrls: ['./logic-workspace.scss', './logic-workspace-tools.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogicWorkspace {
  readonly puzzle = input.required<Puzzle>();
  readonly answer = input.required<Answer>();
  readonly disabled = input(false);
  readonly changed = output<Answer>();
  protected readonly selected = signal<string | null>(null);
  protected readonly trial = signal(2);
  protected readonly executed = signal(false);
  protected readonly excluded = signal<string[]>([]);
  protected readonly notice = signal('');
  protected readonly directions: readonly { id: Direction; label: string; icon: string }[] = [
    { id: 'up', label: 'Arriba', icon: '↑' },
    { id: 'down', label: 'Abajo', icon: '↓' },
    { id: 'left', label: 'Izquierda', icon: '←' },
    { id: 'right', label: 'Derecha', icon: '→' },
  ];
  protected readonly gridCells = computed(() => {
    const p = this.puzzle();
    return Array.from(
      { length: p.kind === 'grid' || p.kind === 'symmetry' ? p.size ** 2 : 0 },
      (_, i) => i,
    );
  });
  protected readonly ordered = computed(() => {
    const p = this.puzzle(),
      a = this.answer();
    return p.kind === 'order' && a.kind === 'order'
      ? a.values.map((id) => p.items.find((item) => item.id === id)!)
      : [];
  });
  constructor() {
    effect(() => {
      this.puzzle();
      this.selected.set(null);
      this.executed.set(false);
      this.excluded.set([]);
      this.notice.set('');
      this.trial.set(2);
    });
  }
  protected emit(answer: Answer): void {
    if (!this.disabled()) this.changed.emit(answer);
  }
  protected choose(id: string): void {
    const a = this.answer();
    if (a.kind === 'choice') this.emit({ ...a, value: id });
  }
  protected reason(id: string): void {
    const a = this.answer();
    if (a.kind === 'choice') this.emit({ ...a, reason: id });
  }
  protected toggle(id: string): void {
    const a = this.answer();
    if (a.kind === 'selection')
      this.emit({
        ...a,
        values: a.values.includes(id)
          ? a.values.filter((value) => value !== id)
          : [...a.values, id],
      });
  }
  protected startDrag(event: DragEvent, id: string): void {
    this.selected.set(id);
    event.dataTransfer?.setData('text/plain', id);
  }
  protected allowDrop(event: DragEvent): void {
    if (!this.disabled()) event.preventDefault();
  }
  protected drop(event: DragEvent, target: string): void {
    event.preventDefault();
    this.place(target);
  }
  protected place(target: string): void {
    const p = this.puzzle(),
      a = this.answer(),
      selected = this.selected();
    if (
      p.kind !== 'placement' ||
      a.kind !== 'placement' ||
      !selected ||
      !p.items.some((item) => item.id === selected)
    )
      return;
    const values = { ...a.values };
    if (p.exclusive)
      for (const key of Object.keys(values)) if (values[key] === target) delete values[key];
    values[selected] = target;
    this.emit({ ...a, values });
    this.selected.set(null);
  }
  protected assigned(target: string): readonly Tile[] {
    const p = this.puzzle(),
      a = this.answer();
    return p.kind === 'placement' && a.kind === 'placement'
      ? p.items.filter((item) => a.values[item.id] === target)
      : [];
  }
  protected placementLabel(id: string): string {
    const p = this.puzzle(),
      a = this.answer();
    return p.kind === 'placement' && a.kind === 'placement'
      ? (p.targets.find((target) => target.id === a.values[id])?.label ?? 'Sin colocar')
      : '';
  }
  protected move(id: string, offset: number): void {
    const a = this.answer();
    if (a.kind !== 'order') return;
    const values = [...a.values],
      index = values.indexOf(id),
      target = index + offset;
    if (index < 0 || target < 0 || target >= values.length) return;
    [values[index], values[target]] = [values[target], values[index]];
    this.emit({ ...a, values });
  }
  protected dropOrder(event: DragEvent, target: string): void {
    event.preventDefault();
    const a = this.answer(),
      selected = this.selected();
    if (a.kind !== 'order' || !selected) return;
    this.move(selected, a.values.indexOf(target) - a.values.indexOf(selected));
    this.selected.set(null);
  }
  protected mirror(cell: number): void {
    const a = this.answer();
    if (a.kind === 'symmetry')
      this.emit({
        ...a,
        values: a.values.includes(cell)
          ? a.values.filter((value) => value !== cell)
          : [...a.values, cell],
      });
  }
  protected addCommand(direction: Direction): void {
    const a = this.answer();
    if (a.kind === 'grid' && a.commands.length < 40) {
      this.executed.set(false);
      this.emit({ ...a, commands: [...a.commands, direction] });
    }
  }
  protected removeCommand(index: number): void {
    const a = this.answer();
    if (a.kind === 'grid') {
      this.executed.set(false);
      this.emit({ ...a, commands: a.commands.filter((_, i) => i !== index) });
    }
  }
  protected clearGrid(): void {
    const p = this.puzzle();
    if (p.kind === 'grid') {
      this.executed.set(false);
      this.notice.set('');
      this.emit({ kind: 'grid', commands: [], path: [p.start] });
    }
  }
  protected execute(): void {
    this.executed.set(true);
  }
  protected robotResult(): { path: number[]; valid: boolean } {
    const p = this.puzzle(),
      a = this.answer();
    return p.kind === 'grid' && a.kind === 'grid'
      ? robotPath(p, a.commands)
      : { path: [], valid: false };
  }
  protected gridPath(): readonly number[] {
    const p = this.puzzle(),
      a = this.answer();
    return p.kind === 'grid' && a.kind === 'grid'
      ? p.mode === 'robot'
        ? this.executed()
          ? this.robotResult().path
          : [p.start]
        : a.path
      : [];
  }
  protected cellLabel(p: GridPuzzle, cell: number): string {
    return `Fila ${Math.floor(cell / p.size) + 1}, columna ${(cell % p.size) + 1}${cell === p.start ? ', salida' : ''}${cell === p.goal ? ', estrella' : ''}${p.blocked.includes(cell) ? ', muro' : ''}`;
  }
  protected extendPath(cell: number): void {
    const p = this.puzzle(),
      a = this.answer();
    if (p.kind !== 'grid' || a.kind !== 'grid') return;
    if (a.path.at(-2) === cell) {
      this.emit({ ...a, path: a.path.slice(0, -1) });
      this.notice.set('');
      return;
    }
    if (!p.blocked.includes(cell) && adjacent(a.path.at(-1)!, cell, p.size)) {
      this.emit({ ...a, path: [...a.path, cell] });
      this.notice.set('');
    } else this.notice.set('Elige una casilla vecina, sin muro.');
  }
  protected undoPath(): void {
    const a = this.answer();
    if (a.kind === 'grid' && a.path.length > 1) this.emit({ ...a, path: a.path.slice(0, -1) });
  }
  protected rule(id: string): void {
    const a = this.answer();
    if (a.kind === 'machine') this.emit({ ...a, rule: id });
  }
  protected predict(value: number): void {
    const a = this.answer();
    if (a.kind === 'machine') this.emit({ ...a, value });
  }
  protected steps(input: number): number[] {
    const p = this.puzzle();
    return p.kind === 'machine' ? machineSteps(p, input) : [];
  }
  protected keypad(key: string): void {
    const a = this.answer();
    if (a.kind !== 'code' && a.kind !== 'combinations') return;
    const current = a.kind === 'code' ? a.value : a.total;
    const value = key === 'erase' ? current.slice(0, -1) : (current + key).slice(0, 3);
    this.emit(a.kind === 'code' ? { ...a, value } : { ...a, total: value });
  }
  protected numberKey(event: KeyboardEvent): void {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.keypad(event.key);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.keypad('erase');
    }
  }
  protected combine(hat: string, shirt: string): void {
    const a = this.answer();
    if (a.kind !== 'combinations') return;
    const id = `${hat}:${shirt}`;
    this.emit({
      ...a,
      values: a.values.includes(id) ? a.values.filter((value) => value !== id) : [...a.values, id],
    });
  }
  protected stageChoice(id: string): void {
    const a = this.answer();
    if (a.kind !== 'stages') return;
    const values = [...a.values];
    values[a.stage] = id;
    this.emit({ ...a, values });
  }
  protected exclude(id: string): void {
    this.excluded.update((values) =>
      values.includes(id) ? values.filter((value) => value !== id) : [...values, id],
    );
  }
  protected directionLabel(id: Direction): string {
    return this.directions.find((direction) => direction.id === id)!.label;
  }
}
