import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tile } from './logic-exercise';
import { LogicIcon } from './logic-icon';

@Component({
  selector: 'app-logic-tile',
  imports: [LogicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let item = tile();
    @if (item.shape) {
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        [class.small]="item.small"
        [attr.data-colour]="item.colour"
      >
        @switch (item.shape) {
          @case ('circle') {
            <circle cx="32" cy="32" r="25" />
          }
          @case ('square') {
            <rect x="8" y="8" width="48" height="48" rx="4" />
          }
          @case ('triangle') {
            <path d="M32 5 60 57H4Z" />
          }
          @case ('star') {
            <path d="m32 3 9 19 21 3-15 15 3 21-18-10-18 10 3-21L2 25l21-3Z" />
          }
        }
      </svg>
    } @else if (item.height) {
      <span class="tower" aria-hidden="true">
        @for (block of blocks(item.height); track $index) {
          <span class="block"></span>
        }
      </span>
    } @else if (item.icon) {
      <app-logic-icon class="tile-icon" [name]="item.icon" [attr.data-colour]="item.colour" />
    }
    <span class="label">{{ item.label }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      max-width: 100%;
    }
    svg {
      width: 60px;
      height: 60px;
      padding: 3px;
      fill: #e06054;
      stroke: var(--outline);
      stroke-width: 2.5;
    }
    svg.small {
      padding: 16px;
    }
    [data-colour='blue'] {
      fill: #629cdb;
    }
    [data-colour='green'] {
      fill: #65b696;
    }
    [data-colour='yellow'] {
      fill: #efbd4c;
    }
    .label {
      font-weight: 800;
      font-size: 14px;
      line-height: 1.4;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .tile-icon {
      font-size: 36px;
      color: var(--teal);
    }
    .tile-icon[data-colour='red'] {
      color: #b94438;
    }
    .tile-icon[data-colour='blue'] {
      color: #376caa;
    }
    .tile-icon[data-colour='green'] {
      color: #287b58;
    }
    .tower {
      height: 144px;
      display: flex;
      flex-direction: column-reverse;
      justify-content: flex-start;
      gap: 2px;
      border-bottom: 3px solid var(--outline);
      padding: 0 6px;
    }
    .block {
      width: 40px;
      height: 20px;
      background: var(--accent);
      border: 2px solid var(--outline);
      border-radius: 3px;
    }
  `,
})
export class LogicTile {
  readonly tile = input.required<Tile>();
  protected blocks(height: number): unknown[] {
    return Array.from({ length: height });
  }
}
