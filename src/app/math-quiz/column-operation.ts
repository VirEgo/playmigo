import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WrittenOperation } from './math-question';

@Component({
  selector: 'app-column-operation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="operation-wrap">
      <div
        class="written-operation"
        role="img"
        [attr.aria-label]="spokenOperation()"
        [style.--digits]="columnCount()"
        data-testid="column-operation"
      >
        @if (operation().operator === '÷') {
          <div class="division" aria-hidden="true">
            <span class="dividend" data-testid="top-operand">{{ operation().top }}</span>
            <span class="divisor" data-testid="bottom-operand">{{ operation().bottom }}</span>
            <span class="quotient" [class.revealed]="revealed()" data-testid="operation-result">{{
              revealed() ? result() : '?'
            }}</span>
          </div>
        } @else {
          <div class="column-grid" aria-hidden="true">
            @if (showPlaces()) {
              <div class="places">
                <span></span>
                @if (columnCount() === 2) {
                  <span>Decenas</span>
                }
                <span>Unidades</span>
              </div>
            }
            <div class="operand" data-testid="top-operand">
              <span></span>
              @for (digit of topDigits(); track $index) {
                <span class="digit">{{ digit }}</span>
              }
            </div>
            <div class="operand" data-testid="bottom-operand">
              <span class="operator">{{ operation().operator }}</span>
              @for (digit of bottomDigits(); track $index) {
                <span class="digit">{{ digit }}</span>
              }
            </div>
            <div class="result-line" [class.revealed]="revealed()" data-testid="operation-result">
              <span></span>
              @for (digit of resultDigits(); track $index) {
                <span class="digit">{{ digit }}</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './column-operation.scss',
})
export class ColumnOperation {
  readonly operation = input.required<WrittenOperation>();
  readonly revealed = input(false);
  readonly result = input.required<string>();
  protected readonly columnCount = computed(() =>
    Math.max(2, String(this.operation().top).length, String(this.operation().bottom).length),
  );
  protected readonly topDigits = computed(() =>
    String(this.operation().top).padStart(this.columnCount(), ' ').split(''),
  );
  protected readonly bottomDigits = computed(() =>
    String(this.operation().bottom).padStart(this.columnCount(), ' ').split(''),
  );
  protected readonly resultDigits = computed(() =>
    (this.revealed() ? this.result() : '?').padStart(this.columnCount(), ' ').split(''),
  );
  protected readonly showPlaces = computed(
    () => this.operation().operator === '+' || this.operation().operator === '−',
  );
  protected readonly spokenOperation = computed(() => {
    const operation = this.operation();
    const operators = { '+': 'más', '−': 'menos', '×': 'por', '÷': 'dividido entre' };
    const answer = this.revealed() ? ` es ${this.result()}` : '. Elige la respuesta.';
    return `${operation.top} ${operators[operation.operator]} ${operation.bottom}${answer}`;
  });
}
