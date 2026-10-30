import { TestBed } from '@angular/core/testing';
import { ColumnOperation } from './column-operation';
import { WrittenOperation } from './math-question';

describe('ColumnOperation', () => {
  async function render(operation: WrittenOperation, result: string) {
    const fixture = TestBed.createComponent(ColumnOperation);
    fixture.componentRef.setInput('operation', operation);
    fixture.componentRef.setInput('result', result);
    await fixture.whenStable();
    return fixture;
  }

  it('aligns a one-digit operand beneath the units without revealing the answer', async () => {
    const fixture = await render({ top: 12, bottom: 5, operator: '+' }, '17');
    const element = fixture.nativeElement as HTMLElement;
    const top = [...element.querySelectorAll('[data-testid="top-operand"] .digit')].map(
      (digit) => digit.textContent,
    );
    const bottom = [...element.querySelectorAll('[data-testid="bottom-operand"] .digit')].map(
      (digit) => digit.textContent,
    );
    expect(top).toEqual(['1', '2']);
    expect(bottom).toEqual([' ', '5']);
    expect(element.querySelector('.result-line')?.textContent?.trim()).toBe('?');
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('12 más 5');
    fixture.componentRef.setInput('revealed', true);
    await fixture.whenStable();
    expect(element.querySelector('.result-line')?.textContent?.trim()).toBe('17');
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('es 17');
  });

  it('renders division in the Spanish school layout and shows the quotient only after checking', async () => {
    const fixture = await render({ top: 10, bottom: 2, operator: '÷' }, '5');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.dividend')?.textContent).toBe('10');
    expect(element.querySelector('.divisor')?.textContent).toBe('2');
    expect(element.querySelector('.quotient')?.textContent?.trim()).toBe('?');
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      '10 dividido entre 2',
    );
    fixture.componentRef.setInput('revealed', true);
    await fixture.whenStable();
    expect(element.querySelector('.quotient')?.textContent?.trim()).toBe('5');
  });
});
