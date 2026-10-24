import { TestBed } from '@angular/core/testing';
import { InfoCardComponent } from './info-card.component';

describe('InfoCard shared overlay presentation', () => {
  beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: false })));
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it.each([true, false])('preserves badge classes and independent actions when interactive=%s', interactive => {
    const fixture = TestBed.createComponent(InfoCardComponent);
    const card = { id: 'card', title: 'Details', clickable: true,
      mediaStart: { label: 'Start', variant: 'avatar', shape: 'circle', layout: 'avatar-metric', tone: 'stage-active', interactive },
      mediaEnd: { label: 'End', tone: 'full', interactive } };
    fixture.componentRef.setInput('card', card);
    const startClick = vi.fn(), endClick = vi.fn(), cardClick = vi.fn();
    fixture.componentInstance.mediaStartClick.subscribe(startClick);
    fixture.componentInstance.mediaEndClick.subscribe(endClick);
    fixture.componentInstance.cardClick.subscribe(cardClick);
    fixture.detectChanges();
    const start = fixture.nativeElement.querySelector('.ui-info-card__overlay-action--start') as HTMLElement;
    const end = fixture.nativeElement.querySelector('.ui-info-card__overlay-action--end') as HTMLElement;
    for (const suffix of ['avatar', 'shape-circle', 'layout-avatar-metric', 'tone-stage-active']) {
      expect(start.classList.contains('ui-info-card__overlay-action--' + suffix)).toBe(true);
    }
    expect(end.classList.contains('ui-info-card__overlay-action--badge')).toBe(true);
    expect(end.classList.contains('ui-info-card__overlay-action--tone-full')).toBe(true);
    expect(end.classList.contains('asset-occupancy-badge-full')).toBe(true);
    expect(start.tagName).toBe(interactive ? 'BUTTON' : 'SPAN');
    expect(end.tagName).toBe(interactive ? 'BUTTON' : 'SPAN');
    if (interactive) {
      start.click(); end.click();
      expect(startClick).toHaveBeenCalledOnce();
      expect(endClick).toHaveBeenCalledOnce();
      expect(cardClick).not.toHaveBeenCalled();
    } else {
      expect(start.getAttribute('aria-hidden')).toBe('true');
      expect(end.getAttribute('aria-hidden')).toBe('true');
    }
    fixture.componentRef.setInput('card', { ...card, mediaStart: { ...card.mediaStart, tone: 'green' } });
    fixture.detectChanges();
    expect(start.classList.contains('ui-info-card__overlay-action--tone-stage-active')).toBe(false);
    expect(start.classList.contains('ui-info-card__overlay-action--tone-green')).toBe(true);
    fixture.destroy();
  });
  it.each(['avatar-metric', 'badge-with-leading-accessory'] as const)('keeps %s accessory tones and translation boundaries', layout => {
    const fixture = TestBed.createComponent(InfoCardComponent);
    const label = 'Person';
    fixture.componentRef.setInput('card', { id: 'accessory', title: 'Card', mediaStart: {
      label: 'Metric', layout, leadingAccessory: { label, icon: 'person', tone: 'tone-3' }, interactive: false
    } });
    fixture.detectChanges();
    const accessory = fixture.nativeElement.querySelector('.ui-info-card__overlay-leading-accessory') as HTMLElement;
    expect(accessory.classList.contains('ui-info-card__overlay-leading-accessory--tone-tone-3')).toBe(true);
    expect(accessory.classList.contains('ui-info-card__overlay-leading-accessory--' + (layout === 'avatar-metric' ? layout : 'badge'))).toBe(true);
    expect(accessory.querySelector('[data-i18n-ignore]') !== null).toBe(layout === 'avatar-metric');
    expect(accessory.textContent).toContain(label);
    fixture.destroy();
  });

});
