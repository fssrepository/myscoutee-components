import { TestBed } from '@angular/core/testing';
import type { CardMenuRequestEvent, PairCardData, SingleCardData } from './card.types';
import { PairCardComponent } from './pair-card/pair-card.component';
import { SingleCardComponent } from './single-card/single-card.component';

type CardKind = 'single' | 'pair';
let rowSequence = 0;

describe('rating card shared interactions', () => {
  const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();
  let compact = false;
  const observers: Array<{ callback: () => void; disconnect: ReturnType<typeof vi.fn> }> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    compact = false;
    observers.length = 0;
    mediaListeners.clear();
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('matchMedia', () => ({
      matches: compact,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.delete(listener)
    }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0));
    vi.stubGlobal('ResizeObserver', class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(readonly callback: () => void) { observers.push(this); }
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function cardData(kind: CardKind, rowId = `rating-${++rowSequence}`): SingleCardData | PairCardData {
    const slides = [{ imageUrl: '', placeholderLabel: 'First' }, { imageUrl: '', placeholderLabel: 'Second' }];
    const common = { rowId, badge: { label: '5', ariaLabel: 'Rating' } };
    return kind === 'single'
      ? { ...common, slides, profileView: { userId: ' user-1 ', label: 'Person' } }
      : { ...common, slots: [
          { key: 'left', label: 'Left', slides, profileView: { userId: ' user-1 ', label: 'Person' } },
          { key: 'right', label: 'Right', slides }
        ] };
  }

  function create(kind: CardKind, card = cardData(kind)) {
    const fixture = kind === 'single'
      ? TestBed.createComponent(SingleCardComponent)
      : TestBed.createComponent(PairCardComponent);
    fixture.componentRef.setInput('imagesEnabled', false);
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    return fixture;
  }

  describe.each<CardKind>(['single', 'pair'])('%s card', kind => {
    it('preserves its default badge position and inherited outputs', () => {
      const fixture = create(kind);
      const badgeClick = vi.fn(), detailClick = vi.fn();
      fixture.componentInstance.badgeClick.subscribe(badgeClick);
      fixture.componentInstance.detailClick.subscribe(detailClick);
      const root: HTMLElement = fixture.nativeElement;
      const badge = root.querySelector<HTMLButtonElement>('.activities-rate-score-badge')!;
      expect(badge.classList.contains(`activities-rate-score-badge-${kind === 'single' ? 'floating' : 'between'}`)).toBe(true);
      expect(root.getAttribute('data-card-presentation')).toBe('list');
      badge.click();
      expect(badgeClick).toHaveBeenCalledWith(fixture.componentInstance.card!.rowId);
      root.querySelector<HTMLButtonElement>('.shared-card-profile-view-btn')!.click();
      expect(detailClick).toHaveBeenCalledWith({ userId: 'user-1', label: 'Person' });
    });

    it('retains the native article structure and clears fullscreen-only bindings on returning to the list', () => {
      const card = { ...cardData(kind), groupLabel: 'Group' };
      const fixture = create(kind, card);
      const root: HTMLElement = fixture.nativeElement;
      expect(root.children).toHaveLength(1);
      expect(root.firstElementChild!.tagName).toBe('ARTICLE');
      expect(root.firstElementChild!.getAttribute('data-group-label')).toBe('Group');
      fixture.componentRef.setInput('card', { ...card, presentation: 'fullscreen', state: 'leaving' });
      fixture.detectChanges();
      expect(root.children).toHaveLength(1);
      expect(root.firstElementChild!.tagName).toBe('DIV');
      const article = root.querySelector('article')!;
      expect(article.parentElement).toBe(root.firstElementChild);
      expect(article.classList.contains('activities-rates-fullscreen-card-leaving')).toBe(true);
      expect(article.hasAttribute('data-group-label')).toBe(false);
      fixture.componentRef.setInput('card', card); fixture.detectChanges();
      expect(root.children).toHaveLength(1);
      expect(root.firstElementChild!.tagName).toBe('ARTICLE');
      expect(root.querySelector('.activities-rates-fullscreen-card')).toBeNull();
      expect(root.firstElementChild!.getAttribute('data-group-label')).toBe('Group');
      expect((root.firstElementChild as HTMLElement).style.width).toBe('');
      expect((root.firstElementChild as HTMLElement).style.height).toBe('');
    });

    it('keeps the menu payload, trigger position and close callback', () => {
      const card = cardData(kind);
      card.badge = { ...card.badge!, menuRequest: true };
      const fixture = create(kind, card);
      const requests: CardMenuRequestEvent<SingleCardData | PairCardData>[] = [];
      fixture.componentInstance.menuRequest.subscribe(event => requests.push(event));
      const badge = fixture.nativeElement.querySelector('.activities-rate-score-badge') as HTMLButtonElement;
      vi.spyOn(badge, 'getBoundingClientRect').mockReturnValue({
        left: 10, top: 740, right: 90, bottom: 760, width: 80, height: 20, x: 10, y: 740, toJSON: () => ({})
      });
      vi.stubGlobal('innerHeight', 800);
      badge.click(); fixture.detectChanges();
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({ id: card.rowId, card, badge: card.badge, actions: [], openUp: true,
        triggerRect: { left: 10, top: 740, right: 90, bottom: 760, width: 80, height: 20 } });
      expect(badge.classList.contains('is-active')).toBe(true);
      requests[0].closeTrigger(); fixture.detectChanges();
      expect(badge.classList.contains('is-active')).toBe(false);
    });

    it('keeps a noninteractive badge static and preserves explicit layout and disabled styling', () => {
      const card = cardData(kind);
      card.badge = { label: 'Received', interactive: false, disabled: true, layout: 'pair-overlap' };
      const fixture = create(kind, card);
      const click = vi.fn();
      fixture.componentInstance.badgeClick.subscribe(click);
      const badge = fixture.nativeElement.querySelector('.activities-rate-score-badge') as HTMLElement;
      expect(badge.tagName).toBe('SPAN');
      for (const suffix of ['floating', 'between', 'floating-pair-overlap']) {
        expect(badge.classList.contains('activities-rate-score-badge-' + suffix)).toBe(true);
      }
      expect(badge.classList.contains('is-disabled')).toBe(true);
      badge.click(); expect(click).not.toHaveBeenCalled();
    });

    it('blinks on an updated badge label and clears the pulse after 420ms', () => {
      const card = cardData(kind);
      const fixture = create(kind, card);
      fixture.componentRef.setInput('card', { ...card, badge: { ...card.badge, label: '6' } });
      fixture.detectChanges();
      vi.advanceTimersByTime(0);
      const badge = fixture.nativeElement.querySelector('.activities-rate-score-badge') as HTMLElement;
      expect(badge.classList.contains('is-blink')).toBe(true);
      vi.advanceTimersByTime(420);
      expect(badge.classList.contains('is-blink')).toBe(false);
    });

    it.each([false, true])('preserves fullscreen sizing and observer cleanup, compact=%s', isCompact => {
      compact = isCompact;
      vi.stubGlobal('innerWidth', isCompact ? 400 : 1024);
      const fixture = create(kind, { ...cardData(kind), presentation: 'fullscreen', state: 'active' });
      const root: HTMLElement = fixture.nativeElement;
      const shell = root.querySelector('.activities-rates-fullscreen')!;
      Object.defineProperties(shell, { clientWidth: { value: 360, configurable: true }, clientHeight: { value: 600, configurable: true } });
      vi.advanceTimersByTime(0); fixture.detectChanges();
      const article = root.querySelector('article')!;
      const expectedHeight = kind === 'single' ? (isCompact ? 640 : 480) : (isCompact ? 600 : 270);
      expect(article.style.width).toBe('360px');
      expect(article.style.height).toBe(`${expectedHeight}px`);
      expect(root.style.height).toBe('100%');
      expect(observers).toHaveLength(1);
      Object.defineProperty(shell, 'clientWidth', { value: 180, configurable: true });
      observers[0].callback(); fixture.detectChanges();
      expect(article.style.width).toBe('180px');
      const disconnects = observers[0].disconnect.mock.calls.length;
      fixture.destroy();
      expect(observers[0].disconnect.mock.calls.length).toBe(disconnects + 1);
      expect(mediaListeners.size).toBe(0);
    });

    it('restores each row image selection after recreation and keeps the loading pulse', () => {
      const card = cardData(kind);
      const fixture = create(kind, card);
      const root: HTMLElement = fixture.nativeElement;
      root.querySelectorAll<HTMLButtonElement>('.image-stack-indicators button')[1].click();
      fixture.detectChanges();
      expect(root.querySelector('.is-pane-loading')).not.toBeNull();
      vi.advanceTimersByTime(500); fixture.detectChanges();
      expect(root.querySelector('.is-pane-loading')).toBeNull();
      fixture.destroy();
      const restored = create(kind, card);
      const lines = restored.nativeElement.querySelectorAll('.image-stack-indicators .image-stack-line') as NodeListOf<HTMLElement>;
      expect(lines[0].classList.contains('active')).toBe(false);
      expect(lines[1].classList.contains('active')).toBe(true);
      if (kind === 'pair') expect(lines[2].classList.contains('active')).toBe(true);
    });
  });

  it('retains pair-only split dragging and stops it when the handle is hidden', () => {
    compact = true;
    const fixture = create('pair', { ...cardData('pair'), presentation: 'fullscreen', state: 'active' });
    const root: HTMLElement = fixture.nativeElement;
    const split = root.querySelector('.activities-rate-pair-inline-grid')!;
    vi.spyOn(split, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 400 } as DOMRect);
    const handle = root.querySelector<HTMLButtonElement>('.activities-rates-pair-fullscreen-resize-handle')!;
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200 }));
    const move = new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 300 });
    globalThis.dispatchEvent(move); fixture.detectChanges();
    expect(handle.style.left).toBe('75%');
    fixture.componentRef.setInput('showSplitHandle', false); fixture.detectChanges();
    expect(root.querySelector('.activities-rates-pair-fullscreen-resize-handle')).toBeNull();
    expect(root.querySelector('.is-resizing')).toBeNull();
    globalThis.dispatchEvent(new MouseEvent('pointermove', { clientX: 0 }));
    fixture.componentRef.setInput('showSplitHandle', true); fixture.detectChanges();
    expect(root.querySelector<HTMLElement>('.activities-rates-pair-fullscreen-resize-handle')!.style.left).toBe('75%');
  });
});
