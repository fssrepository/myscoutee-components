import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FORM_FLOW_BUILTIN_CONTROLS, PopupComponent, PopupPresenceStore, type PopupDateInputControl } from '../../../public-api';

import { UI_TRANSLATIONS } from '../../../public-api';

@Component({ imports: [PopupComponent], changeDetection: ChangeDetectionStrategy.Eager,
 template: `
  <app-popup [active]="open()" [model]="{title: 'Profile'}"><input value="cached"></app-popup>
` })
class RetainedPopup { open = signal(true); }

@Component({ imports: [PopupComponent], changeDetection: ChangeDetectionStrategy.Eager,
 template: `
  <app-popup [model]="{title: 'Parent'}"><input value="draft"></app-popup>
  @if (childOpen()) {
    <app-popup [model]="{title: 'Child'}" (close)="childOpen.set(false)">Details</app-popup>
  }
` })
class StackedPopups { childOpen = signal(false); }

describe('popup date controls', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('does not load date controls for an ordinary popup', () => {
    const load = vi.spyOn(FORM_FLOW_BUILTIN_CONTROLS['date-input'], 'load');
    const fixture = TestBed.createComponent(PopupComponent);
    fixture.componentRef.setInput('model', { title: 'Details' });
    fixture.detectChanges();
    expect(load).not.toHaveBeenCalled();
  });

  it.each(['header', 'toolbar-start', 'toolbar-end'])('keeps the %s action and its event context in the shared template', location => {
    const control = { id: 'apply', label: 'Apply', icon: 'check', guideFieldId: 'apply-action',
      align: location === 'toolbar-end' ? 'end' : 'start' };
    const key = location === 'header' ? 'headerControls' : 'toolbarControls';
    const fixture = TestBed.createComponent(PopupComponent);
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);
    fixture.componentRef.setInput('model', { title: 'Details', [key]: [control] });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[data-guide-control="apply"]') as HTMLButtonElement;
    expect(button.getAttribute('data-guide-field')).toBe('apply-action');
    button.click();
    expect(action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ action: control }));
    fixture.destroy();
  });

  it.each(['header', 'toolbar-start', 'toolbar-end'])('retains %s date value, callbacks and guide attributes', async location => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {} }));
    const control: PopupDateInputControl = {
      id: 'date', kind: 'date-input', guideFieldId: 'filter-date',
      align: location === 'toolbar-end' ? 'end' : 'start',
      model: { valueFormat: 'iso-date', updateOn: 'blur' }, value: '2026-10-04'
    };
    const controls = location === 'header' ? 'headerControls' : 'toolbarControls';
    const fixture = TestBed.createComponent(PopupComponent);
    const changed = vi.fn();
    fixture.componentInstance.dateInputChange.subscribe(changed);
    fixture.componentRef.setInput('model', { title: 'Details', [controls]: [control] });
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-date-input input')).not.toBeNull();
    });
    const host = fixture.nativeElement.querySelector('app-date-input') as HTMLElement;
    expect(host.classList.contains('ui-popup__date-input')).toBe(true);
    expect(host.getAttribute('data-guide-control')).toBe('date');
    expect(host.getAttribute('data-guide-field')).toBe('filter-date');
    const input = host.querySelector('input')!;
    expect(input.value).toBe('2026/10/04');
    expect(changed).not.toHaveBeenCalled();
    input.value = '2026/11/05';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(changed).toHaveBeenCalledExactlyOnceWith({ control, value: '2026-11-05' });
    fixture.componentRef.setInput('model', { title: 'Details', [controls]: [
      { ...control, value: '2027-01-01', model: { ...control.model, disabled: true } }
    ] });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(input.value).toBe('2027/01/01');
    expect(input.disabled).toBe(true);
    expect(host).toBe(fixture.nativeElement.querySelector('app-date-input'));
  });
});

describe('retained popup visibility', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps content while releasing the modal layer and hidden-popup selector on close', () => {
    TestBed.configureTestingModule({ imports: [RetainedPopup], providers: [
      { provide: UI_TRANSLATIONS, useValue: { revision: () => 0, currentLanguage: () => 'en', translate: (text: string) => text } }
    ] });
    const fixture = TestBed.createComponent(RetainedPopup);
    const presence = TestBed.inject(PopupPresenceStore);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(presence.visible()).toBe(true);
    fixture.componentInstance.open.set(false); fixture.detectChanges();
    expect(presence.visible()).toBe(false);
    expect(fixture.nativeElement.querySelector('.ui-popup')).toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBe(input);
    expect(input.closest('[style]').style.display).toBe('none');
    fixture.componentInstance.open.set(true); fixture.detectChanges();
    expect(presence.visible()).toBe(true);
    expect(fixture.nativeElement.querySelector('.ui-popup input')).toBe(input);
    fixture.destroy(); expect(presence.visible()).toBe(false);
  });
});

describe('stacked popup backdrop', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps the parent and its draft visible beneath the child, then closes only the child', () => {
    TestBed.configureTestingModule({ imports: [StackedPopups], providers: [
      { provide: UI_TRANSLATIONS, useValue: { revision: () => 0, currentLanguage: () => 'en', translate: (text: string) => text } }
    ] });
    const fixture = TestBed.createComponent(StackedPopups);
    const presence = TestBed.inject(PopupPresenceStore);
    fixture.detectChanges();
    const parent = fixture.nativeElement.querySelector('.ui-popup') as HTMLElement;
    const input = parent.querySelector('input')!;
    input.value = 'unsaved edit';
    const parentLayer = presence.topLayer();

    fixture.componentInstance.childOpen.set(true);
    fixture.detectChanges();
    const popups = fixture.nativeElement.querySelectorAll('.ui-popup') as NodeListOf<HTMLElement>;
    expect(popups).toHaveLength(2);
    expect(popups[0]).toBe(parent);
    expect(getComputedStyle(parent).display).not.toBe('none');
    expect(getComputedStyle(parent).visibility).toBe('visible');
    expect(Number(popups[1].style.zIndex)).toBeGreaterThan(parentLayer);
    const backdrop = popups[1].querySelector('.ui-popup__backdrop') as HTMLElement;
    expect(getComputedStyle(backdrop).backgroundColor).toBe('rgba(233, 237, 245, 0.56)');
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ui-popup')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('input')).toBe(input);
    expect(input.value).toBe('unsaved edit');
    expect(presence.topLayer()).toBe(parentLayer);
    fixture.destroy();
  });
});
