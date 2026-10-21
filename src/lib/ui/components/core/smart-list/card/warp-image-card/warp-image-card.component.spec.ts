import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UI_TRANSLATIONS } from '../../../../../../../public-api';
import { InfoCardComponent, LazyBgImageDirective, WarpImageCardComponent } from '../../../../../../../public-api';

describe('WarpImageCardComponent image loading', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['auto', 'high'] as const)('keeps text visible and loads only the visible image with %s priority', async priority => {
    let observeImage!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { observeImage = callback; }
      observe() {}
      disconnect() {}
    });
    let finishImage!: (loaded: boolean) => void;
    const preload = vi.spyOn(LazyBgImageDirective, 'preloadImageUrl')
      .mockReturnValue(new Promise<boolean>(resolve => { finishImage = resolve; }));
    TestBed.configureTestingModule({
      imports: [WarpImageCardComponent],
      providers: [{ provide: UI_TRANSLATIONS, useValue: {
        revision: signal(0), translate: (key: string, fallback?: string) => fallback ?? key
      } }]
    });
    const fixture = TestBed.createComponent(WarpImageCardComponent);
    fixture.componentRef.setInput('imagePriority', priority);
    const imageUrl = `/test-card-${priority}.png`;
    fixture.componentRef.setInput('card', {
      id: 'step', imageUrl, index: '01', titleKey: 'title', title: 'Step title',
      messageKey: 'description', message: 'Step description', sliceX: '100%', sliceY: '0%'
    });
    fixture.detectChanges();
    const media: HTMLElement = fixture.nativeElement.querySelector('.ui-warp-image-card__visual-image');
    const loader: HTMLElement = media.querySelector('.ui-warp-image-card__image-loader')!;
    expect(fixture.nativeElement.textContent).toContain('Step title');
    expect(preload).not.toHaveBeenCalled();
    expect(media.style.backgroundImage).toBe('');
    expect(getComputedStyle(loader).display).toBe('none');

    observeImage([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await vi.waitFor(() => expect(preload).toHaveBeenCalledOnce());
    expect(preload).toHaveBeenCalledWith(imageUrl, { fetchPriority: priority });
    expect(media.classList.contains('lazy-bg-loading')).toBe(true);
    expect(getComputedStyle(loader).display).toBe('grid');
    finishImage(true);
    await vi.waitFor(() => expect(media.classList.contains('lazy-bg-loaded')).toBe(true));

    expect(media.style.backgroundImage).toContain(imageUrl);
    expect(getComputedStyle(loader).display).toBe('none');
    expect(fixture.nativeElement.textContent).toContain('Step title');
  });

  it('lets landing cards follow the page heading without changing shared defaults', () => {
    TestBed.configureTestingModule({ imports: [WarpImageCardComponent, InfoCardComponent] });
    const warp = TestBed.createComponent(WarpImageCardComponent);
    warp.componentRef.setInput('card', {
      id: 'step', index: '01', titleKey: 'title', title: 'How it works',
      messageKey: 'description', message: 'Step description'
    });
    const info = TestBed.createComponent(InfoCardComponent);
    info.componentRef.setInput('card', { id: 'article', title: 'Article title' });
    warp.detectChanges();
    info.detectChanges();
    expect(warp.nativeElement.querySelector('h3').getAttribute('aria-level')).toBe('3');
    expect(info.nativeElement.querySelector('h4').getAttribute('aria-level')).toBe('4');

    warp.componentRef.setInput('headingLevel', 2);
    info.componentRef.setInput('headingLevel', 2);
    warp.detectChanges();
    info.detectChanges();
    expect(warp.nativeElement.querySelector('h3').getAttribute('aria-level')).toBe('2');
    expect(info.nativeElement.querySelector('h4').getAttribute('aria-level')).toBe('2');
    expect(warp.nativeElement.textContent).toContain('How it works');
    expect(info.nativeElement.textContent).toContain('Article title');
  });
});
