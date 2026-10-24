import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';
import { DialogStore, DIALOG_TEXT } from '../../stores/overlay/dialog.store';
import { OverlayNavigationStore } from '../../stores/overlay/overlay-navigation.store';
import type { TourDialogConfig } from './tour/tour-dialog.types';

describe('Dialog configured UI modes', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  function configure(extra: object[] = []) {
    TestBed.configureTestingModule({ imports: [DialogComponent], providers: [
      { provide: OverlayNavigationStore, useValue: { register: () => Symbol(), unregister() {}, bringToFront() {} } },
      ...extra
    ] });
    return TestBed.createComponent(DialogComponent);
  }

  it('renders prepared confirmation text from its signal store and refreshes that text through the store', () => {
    const language = signal('en');
    const fixture = configure([{ provide: DIALOG_TEXT, useValue: (value: string) => value ? `${language()}:${value}` : '' }]);
    const store = TestBed.inject(DialogStore);
    store.openNotice('notice.body', { title: 'notice.title' });
    expect(store.dialog()?.message).toBe('en:notice.body');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dialog-panel p')?.textContent).toBe('en:notice.body');
    language.set('hu'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dialog-panel p')?.textContent).toBe('hu:notice.body');
    fixture.nativeElement.querySelector('.popup-close').click(); fixture.detectChanges();
    expect(store.dialog()).toBeNull();
  });

  it('renders unknown explanation section IDs from data, then switches the same common dialog to a ready tour', async () => {
    const fixture = configure();
    const close = vi.fn();
    fixture.componentRef.setInput('dialog', { mode: 'explanation', actions: { close }, model: {
      open: true, loading: false, loadingLabel: 'Prepared loading label', zIndex: 23000,
      popup: { title: 'Prepared document title', translateTitle: false, headerLayout: 'document', bodyLayout: 'fill' },
      sections: [{ id: 'unrelated-product.section', title: 'Prepared section title', blurb: 'Prepared blurb',
        html: '<p>Prepared HTML content</p>', layout: 'span-2', icon: 'info', showIcon: true }]
    } });
    fixture.detectChanges();
    await vi.waitFor(() => { fixture.detectChanges(); expect(document.querySelector('.explanation-popup__html')?.textContent).toBe('Prepared HTML content'); });
    expect(document.querySelector('.explanation-popup__item--span-2 h3')?.textContent).toBe('Prepared section title');
    const config: TourDialogConfig = { mode: 'tour', actions: { close, empty() {}, visibleChange() {}, stepChange() {} }, model: {
      open: true, loading: false, loadError: false, noGuide: true, visible: true, contextKey: 'unrelated-product',
      stepIndex: 0, fields: [], content: null,
      labels: { heading: 'Prepared tour', close: 'Prepared close', back: 'Prepared back', next: 'Prepared next',
        done: 'Prepared done', empty: 'Prepared empty text', errorTitle: 'Prepared error', errorBody: 'Prepared error body' }
    } };
    fixture.componentRef.setInput('dialog', config); fixture.detectChanges();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.explanation-guide-overlay__card p')?.textContent).toBe('Prepared empty text'); });
    expect(document.querySelector('.explanation-popup__html')).toBeNull();
    fixture.nativeElement.querySelector('.explanation-guide-overlay__close').click();
    expect(close).toHaveBeenCalledOnce();
  });
});
