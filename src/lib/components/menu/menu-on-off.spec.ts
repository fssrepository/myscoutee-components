import { TestBed } from '@angular/core/testing';
import { AppMenuComponent } from '../../../public-api';

describe('AppMenu on/off presentation', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: window.innerWidth <= Number(query.match(/max-width: (\d+)px/)?.[1] ?? 0),
      media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}
    }));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it('uses the existing toggle value accessor and updates its state label and icon in both directions', () => {
    const fixture = TestBed.createComponent(AppMenuComponent);
    fixture.componentRef.setInput('items', [{id: 'enabled', kind: 'toggle', toggleStyle: 'on-off', ariaLabel: 'Availability'}]);
    const changed = vi.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.writeValue([]);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Availability');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent).toContain('toggle_off');
    button.click(); fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith(['enabled']);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('toggle_on');
    button.click(); fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith([]);
    expect(button.textContent).toContain('toggle_off');
    fixture.componentInstance.setDisabledState(true); fixture.detectChanges();
    button.click();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(button.disabled).toBe(true);
  });

  it('accepts caller-controlled state and label/icon overrides without mutating the item', () => {
    const fixture = TestBed.createComponent(AppMenuComponent);
    const item = {id: 'available', kind: 'toggle' as const, toggleStyle: 'on-off' as const,
      checked: false, label: 'Ready', icon: 'done'};
    fixture.componentRef.setInput('items', [item]);
    const selected = vi.fn(); fixture.componentInstance.itemSelect.subscribe(selected);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click(); fixture.detectChanges();
    expect(selected).toHaveBeenCalledOnce();
    expect(item.checked).toBe(false);
    fixture.componentRef.setInput('items', [{...item, checked: true}]); fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Ready');
    expect(button.querySelector('mat-icon')?.textContent).toBe('done');
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges(); button.click();
    expect(selected).toHaveBeenCalledOnce();
  });
});
