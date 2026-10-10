import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UI_TRANSLATIONS } from '../../../../../../../public-api';
import { LazyBgImageDirective, WarpImageCardComponent } from '../../../../../../../public-api';

describe('WarpImageCardComponent image loading', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the text visible and shows the image ring until the visible image has loaded', async () => {
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
    fixture.componentRef.setInput('card', {
      id: 'step', imageUrl: '/test-card.png', index: '01', titleKey: 'title', title: 'Step title',
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
    expect(media.classList.contains('lazy-bg-loading')).toBe(true);
    expect(getComputedStyle(loader).display).toBe('grid');
    finishImage(true);
    await vi.waitFor(() => expect(media.classList.contains('lazy-bg-loaded')).toBe(true));

    expect(media.style.backgroundImage).toContain('/test-card.png');
    expect(getComputedStyle(loader).display).toBe('none');
    expect(fixture.nativeElement.textContent).toContain('Step title');
  });
});
