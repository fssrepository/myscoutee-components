import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import {
  ExplanationGuideService,
  I18nPipe,
  SmartListComponent,
  SmartListEmptyStateComponent,
  IndicatorComponent,
  type PageResult,
  type SmartListConfig
} from '../../../../../public-api';
import { UI_TRANSLATIONS } from '../../../../../public-api';

describe('SmartList existing empty states', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SmartListComponent],
      providers: [
        { provide: ExplanationGuideService, useValue: { popupOpen: () => false } },
        { provide: UI_TRANSLATIONS, useValue: { revision: signal(0), translate: (key: string) => key } }
      ]
    }).overrideComponent(SmartListComponent, {
      set: { imports: [CommonModule, I18nPipe, IndicatorComponent, SmartListEmptyStateComponent], schemas: [NO_ERRORS_SCHEMA] }
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function render(config: SmartListConfig<unknown>, initialLoading = false) {
    const fixture = TestBed.createComponent(SmartListComponent);
    Object.assign(fixture.componentInstance, { config, initialLoading, loading: initialLoading, currentViewMode: 'list' });
    fixture.detectChanges();
    return fixture;
  }

  it('renders read errors as an accessible shared card without claiming the list is empty', () => {
    const fixture = TestBed.createComponent(SmartListEmptyStateComponent);
    fixture.componentRef.setInput('tone', 'error');
    fixture.componentRef.setInput('label', 'Could not load the case');
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('role')).toBe('alert');
    expect(fixture.nativeElement.classList.contains('smart-list__empty--error')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Could not load the case');
    expect(fixture.nativeElement.textContent).not.toContain('no.items');
    fixture.destroy();
  });

  it('replaces empty content and its header with the store error, then recovers without reloading on input changes', async () => {
    const result = new Subject<PageResult<unknown>>();
    const fixture = TestBed.createComponent(SmartListComponent);
    const loadPage = vi.fn(() => result.asObservable());
    fixture.componentRef.setInput('config', { initialPageCount: 1, emptyLabel: 'No tasks', emptyPlacement: 'start' });
    fixture.componentRef.setInput('loadPage', loadPage);
    fixture.detectChanges();
    result.error(new Error('temporary failure'));
    await vi.waitFor(() => expect(fixture.componentInstance['initialLoading']).toBe(false));
    fixture.componentRef.setInput('emptyError', 'Could not load scheduled tasks');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('app-smart-list-empty-state');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Could not load scheduled tasks');
    expect(error.classList.contains('smart-list__empty--start')).toBe(false);
    expect(fixture.nativeElement.querySelector('.smart-list__sticky')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No tasks');
    expect(loadPage).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('emptyError', null);
    fixture.detectChanges();
    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('app-smart-list-empty-state').getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.textContent).toContain('No tasks');
    fixture.destroy();
  });

  it.each(['vertical', 'horizontal'] as const)('retains configured empty content in a three-column %s list', orientation => {
    const fixture = render({ listLayout: 'card-grid', desktopColumns: 3, orientation,
      emptyLabel: 'No notifications', emptyDescription: 'Your notifications will appear here.' });
    expect(fixture.nativeElement.querySelector('.smart-list--desktop-columns-3')).not.toBeNull();
    const empty = fixture.nativeElement.querySelector('.smart-list__empty');
    expect(empty?.textContent).toContain('No notifications');
    expect(empty?.textContent).toContain('Your notifications will appear here.');
    fixture.destroy();
  });

  it('keeps the default empty message inside an empty carousel', () => {
    const fixture = render({ listLayout: 'card-grid', orientation: 'horizontal', compactHorizontal: true, desktopColumns: 1 });
    const list = fixture.nativeElement.querySelector('.smart-list--horizontal');
    expect(list).not.toBeNull();
    expect(list.querySelector('.smart-list__empty')?.textContent).toContain('no.items');
    fixture.destroy();
  });

  it('keeps the carousel mounted while its initial load is pending', () => {
    const fixture = render({ listLayout: 'card-grid', orientation: 'horizontal', compactHorizontal: true, desktopColumns: 1 }, true);
    const list = fixture.nativeElement.querySelector('.smart-list--horizontal');
    expect(list).not.toBeNull();
    expect(list.querySelector('.smart-list__empty')).toBeNull();
    fixture.destroy();
  });

  it('preserves the bar for lists using the existing default indicator', () => {
    const fixture = render({ headerProgress: { enabled: true } }, true);
    expect(fixture.nativeElement.querySelector('.app-indicator--bar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-indicator--load-ring')).toBeNull();
    fixture.destroy();
  });

  it.each([true, false])('keeps loading visible independently of showEmptyState=%s', async showEmptyState => {
    const result = new Subject<PageResult<unknown>>();
    const fixture = TestBed.createComponent(SmartListComponent);
    const loadPage = vi.fn(() => result.asObservable());
    fixture.componentRef.setInput('config', {
      listLayout: 'card-grid', orientation: 'horizontal', compactHorizontal: true,
      initialPageCount: 1, headerProgress: { enabled: true }, showEmptyState
    });
    fixture.componentRef.setInput('loadPage', loadPage);
    fixture.detectChanges();
    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.smart-list--horizontal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-indicator--bar.is-state-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.smart-list__empty')).toBeNull();

    result.next({ items: [], total: 0, nextCursor: null });
    await vi.waitFor(() => expect(fixture.componentInstance['initialLoading']).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.smart-list--horizontal')).not.toBeNull();
    const empty = fixture.nativeElement.querySelector('.smart-list__empty');
    if (showEmptyState) {
      expect(empty?.textContent).toContain('no.items');
    } else {
      expect(empty).toBeNull();
    }
    fixture.destroy();
  });

  it('removes the carousel load ring when card data arrives, without leaving a progress bar', async () => {
    const result = new Subject<PageResult<unknown>>();
    const fixture = TestBed.createComponent(SmartListComponent);
    fixture.componentRef.setInput('config', {
      listLayout: 'card-grid', orientation: 'horizontal', compactHorizontal: true,
      showEmptyState: false, initialPageCount: 1,
      headerProgress: { enabled: true, kind: 'load-ring', tone: 'bright' }
    });
    fixture.componentRef.setInput('loadPage', () => result.asObservable());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.smart-list--horizontal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.smart-list__header-progress-shell--centered .app-indicator--load-ring')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-indicator-host--tone-bright')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.app-indicator__load-ring-progress.is-timed')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-indicator').style.getPropertyValue('--app-indicator-duration')).toBe('3000ms');
    expect(fixture.nativeElement.querySelector('.app-indicator--bar')).toBeNull();

    result.next({ items: [{ id: 'slide' }], total: 1, nextCursor: null });
    await vi.waitFor(() => expect(fixture.componentInstance['initialLoading']).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.smart-list--horizontal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.smart-list__header-progress-shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('.smart-list__empty')).toBeNull();
    fixture.destroy();
  });
  it.each([true, false])('retains sticky pagination controls outside-scroll=%s', outside => {
    const fixture = TestBed.createComponent(SmartListComponent);
    const component = fixture.componentInstance;
    const view = component as unknown as {
      shouldRenderListHeaderOutsideScroll(): boolean; shouldShowStickyHeader(): boolean;
      shouldRenderStickyPaginationActions(): boolean; canMovePagination(direction: number): boolean;
      onPaginationNext(event: Event): void;
    };
    Object.assign(component, { config: {}, initialLoading: false, currentViewMode: 'list', stickyLabel: 'Page' });
    vi.spyOn(view, 'shouldRenderListHeaderOutsideScroll').mockReturnValue(outside);
    vi.spyOn(view, 'shouldShowStickyHeader').mockReturnValue(true);
    vi.spyOn(view, 'shouldRenderStickyPaginationActions').mockReturnValue(true);
    vi.spyOn(view, 'canMovePagination').mockImplementation(direction => direction === 1);
    const next = vi.spyOn(view, 'onPaginationNext').mockImplementation(() => {});
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('.smart-list__sticky') as HTMLElement;
    expect(header.textContent).toContain('Page');
    expect(header.querySelector<HTMLButtonElement>('[data-guide-field="pagination-prev"]')!.disabled).toBe(true);
    const nextButton = header.querySelector<HTMLButtonElement>('[data-guide-field="pagination-next"]')!;
    expect(nextButton.disabled).toBe(false);
    nextButton.click(); expect(next).toHaveBeenCalledOnce();
    expect(header.closest('.smart-list') !== null).toBe(!outside);
    fixture.destroy();
  });

});
