import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideCalculator, LucidePawPrint } from '@lucide/angular';

@Component({
  selector: 'app-training-modes',
  imports: [RouterLink, RouterLinkActive, LucideCalculator, LucidePawPrint],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="label()">
      <a
        routerLink="/"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        lang="es"
      >
        <svg lucideCalculator aria-hidden="true"></svg>Matemáticas
      </a>
      <a
        routerLink="/animals"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        lang="ca-valencia"
      >
        <svg lucidePawPrint aria-hidden="true"></svg>Animals · Valencià
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 28px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 48px;
      padding: 10px 16px;
      border: 2px solid var(--outline);
      border-radius: 12px;
      color: var(--ink);
      background: var(--surface);
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
    }
    a.active {
      background: var(--teal);
      color: white;
      box-shadow: 3px 4px 0 var(--outline);
    }
    a:hover:not(.active) {
      background: var(--mint);
    }
    a:focus-visible {
      outline: 3px solid var(--teal);
      outline-offset: 5px;
    }
    svg {
      width: 19px;
      height: 19px;
      flex: 0 0 auto;
    }
    @media (max-width: 390px) {
      nav {
        gap: 8px;
      }
      a {
        padding: 10px;
        font-size: 13px;
        gap: 6px;
      }
    }
  `,
})
export class TrainingModes {
  readonly label = input('Modo de entrenamiento');
}
