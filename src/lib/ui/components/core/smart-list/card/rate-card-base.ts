import {
  AfterViewInit, ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostBinding,
  Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject
} from '@angular/core';
import type {
  CardBadgeConfig, CardBadgeLayout, CardImageSlide, CardMenuRequestEvent, CardMenuTriggerRect,
  CardProfileViewData, PairCardData, SingleCardData
} from '@fssrepository/myscoutee-components/core';

/** Shared interaction and fullscreen lifecycle for the two rating card layouts. */
@Directive()
export abstract class RateCardBase<TCard extends SingleCardData | PairCardData>
  implements AfterViewInit, OnChanges, OnDestroy {
  private static readonly BADGE_BLINK_DURATION_MS = 420;
  protected readonly cdr = inject(ChangeDetectorRef);
  private badgeBlinkTimer: ReturnType<typeof setTimeout> | null = null;
  private fullscreenResizeObserver: ResizeObserver | null = null;
  private previousRowId = '';
  private previousBadgeLabel = '';
  private fullscreenShellElementRef?: ElementRef<HTMLElement>;

  @Input() card: TCard | null = null;
  @Input() imagesEnabled = true;
  @Output() readonly badgeClick = new EventEmitter<string>();
  @Output() readonly menuRequest = new EventEmitter<CardMenuRequestEvent<TCard>>();
  @Output() readonly detailClick = new EventEmitter<CardProfileViewData>();

  protected transientBadgeBlink = false;
  protected badgeMenuOpen = false;
  protected fullscreenCardWidth: string | null = null;
  protected fullscreenCardHeight: string | null = null;
  protected abstract readonly defaultBadgeLayout: CardBadgeLayout;
  protected abstract syncStateFromCard(): void;
  protected abstract fullscreenDimensions(width: number, height: number): readonly [number, number];

  @ViewChild('fullscreenShell', { read: ElementRef })
  protected set fullscreenShellRef(value: ElementRef<HTMLElement> | undefined) {
    this.fullscreenShellElementRef = value;
    this.bindFullscreenObserver();
    this.scheduleFullscreenLayoutSync();
  }

  @HostBinding('attr.data-card-presentation')
  protected get hostPresentationAttr(): string {
    return this.resolvedPresentation();
  }

  @HostBinding('style.height')
  protected get hostHeight(): string | null {
    return this.resolvedPresentation() === 'fullscreen' ? '100%' : null;
  }

  ngAfterViewInit(): void {
    this.bindFullscreenObserver();
    this.scheduleFullscreenLayoutSync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['card']) {
      return;
    }

    const rowId = this.card?.rowId ?? '';
    const badgeLabel = this.card?.badge?.label ?? '';

    if (rowId !== this.previousRowId) {
      this.syncStateFromCard();
    }

    if (rowId === this.previousRowId && badgeLabel !== this.previousBadgeLabel && this.card?.badge?.blink !== true) {
      this.startTransientBadgeBlink();
    }

    this.previousRowId = rowId;
    this.previousBadgeLabel = badgeLabel;
    this.scheduleFullscreenLayoutSync();
  }

  protected trackBySlide(index: number, slide: CardImageSlide): string {
    return `${index}:${slide.imageUrl}`;
  }

  protected resolvedPresentation(): 'list' | 'fullscreen' {
    return this.card?.presentation ?? 'list';
  }

  protected resolvedState(): 'default' | 'active' | 'leaving' {
    return this.card?.state ?? 'default';
  }

  protected resolvedStackClasses(): readonly string[] {
    return this.card?.stackClasses ?? [];
  }

  protected isInteractive(): boolean {
    return this.resolvedPresentation() === 'list' || this.resolvedState() === 'active';
  }

  protected isBadgeInteractive(): boolean {
    return this.card?.badge?.interactive !== false;
  }

  protected usesFloatingBadge(): boolean {
    const layout = this.card?.badge?.layout ?? this.defaultBadgeLayout;
    return layout === 'floating' || layout === 'pair-overlap';
  }

  protected usesBetweenBadge(): boolean {
    const layout = this.card?.badge?.layout ?? this.defaultBadgeLayout;
    return layout === 'between' || layout === 'pair-overlap';
  }

  protected usesPairOverlapBadge(): boolean {
    return (this.card?.badge?.layout ?? this.defaultBadgeLayout) === 'pair-overlap';
  }

  protected isBadgeBlinking(): boolean {
    return !!this.card?.badge?.blink || this.transientBadgeBlink;
  }

  protected badgeClassList(badge: CardBadgeConfig, interactive: boolean): Record<string, boolean> {
    return {
      'activities-rate-score-badge-floating': this.usesFloatingBadge(),
      'activities-rate-score-badge-between': this.usesBetweenBadge(),
      'activities-rate-score-badge-floating-pair-overlap': this.usesPairOverlapBadge(),
      'is-active': !!badge.active || (interactive && this.badgeMenuOpen),
      'is-pending': !!badge.pending,
      'is-disabled': !!badge.disabled,
      'is-blink': this.isBadgeBlinking()
    };
  }

  protected onBadgePointerDown(event: Event): void {
    event.stopPropagation();
  }

  protected onBadgeClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const card = this.card;
    const badge = card?.badge;
    if (!this.isBadgeInteractive() || badge?.disabled || !card?.rowId || !badge) {
      return;
    }
    if (badge.menuRequest === true) {
      const trigger = event.currentTarget as HTMLElement | null;
      this.badgeMenuOpen = true;
      this.cdr.markForCheck();
      this.menuRequest.emit({
        id: card.rowId,
        card,
        actions: [],
        badge,
        triggerRect: this.resolveBadgeTriggerRect(trigger),
        openUp: this.shouldOpenBadgeMenuUp(trigger),
        closeTrigger: () => this.closeBadgeMenu()
      });
      return;
    }
    this.badgeClick.emit(card.rowId);
  }

  protected onProfileClick(profileView: CardProfileViewData | null | undefined, event: MouseEvent): void {
    event.stopPropagation();
    const userId = `${profileView?.userId ?? ''}`.trim();
    if (!userId) {
      return;
    }
    this.emitDetailClick({
      ...profileView,
      userId
    });
  }

  protected emitDetailClick(event: CardProfileViewData): void {
    this.detailClick.emit(event);
  }

  private closeBadgeMenu(): void {
    if (!this.badgeMenuOpen) {
      return;
    }
    this.badgeMenuOpen = false;
    this.cdr.markForCheck();
  }

  private shouldOpenBadgeMenuUp(trigger: HTMLElement | null): boolean {
    if (typeof window === 'undefined' || !trigger) {
      return false;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const estimatedMenuHeight = 128;
    return viewportHeight - rect.bottom < estimatedMenuHeight && rect.top > viewportHeight - rect.bottom;
  }

  private resolveBadgeTriggerRect(trigger: HTMLElement | null): CardMenuTriggerRect | null {
    if (typeof window === 'undefined' || !trigger) {
      return null;
    }
    const rect = trigger.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  private startTransientBadgeBlink(): void {
    this.clearBadgeBlinkTimer();
    this.transientBadgeBlink = false;
    this.cdr.detectChanges();

    const startBlink = () => {
      this.transientBadgeBlink = true;
      this.cdr.detectChanges();
      this.badgeBlinkTimer = setTimeout(() => {
        this.badgeBlinkTimer = null;
        this.transientBadgeBlink = false;
        this.cdr.detectChanges();
      }, RateCardBase.BADGE_BLINK_DURATION_MS);
    };

    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => startBlink());
      return;
    }
    setTimeout(() => startBlink(), 0);
  }

  private bindFullscreenObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const shell = this.fullscreenShellElementRef?.nativeElement;
    if (!shell) {
      this.disconnectFullscreenObserver();
      return;
    }
    if (!this.fullscreenResizeObserver) {
      this.fullscreenResizeObserver = new ResizeObserver(() => this.updateFullscreenCardSize());
    }
    this.fullscreenResizeObserver.disconnect();
    this.fullscreenResizeObserver.observe(shell);
  }

  private disconnectFullscreenObserver(): void {
    if (!this.fullscreenResizeObserver) {
      return;
    }
    this.fullscreenResizeObserver.disconnect();
    this.fullscreenResizeObserver = null;
  }

  protected scheduleFullscreenLayoutSync(): void {
    if (this.resolvedPresentation() !== 'fullscreen') {
      this.setFullscreenCardSize(null, null);
      return;
    }
    const sync = () => this.updateFullscreenCardSize();
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => sync());
      return;
    }
    setTimeout(sync, 0);
  }

  private updateFullscreenCardSize(): void {
    if (this.resolvedPresentation() !== 'fullscreen') {
      this.setFullscreenCardSize(null, null);
      return;
    }
    const shell = this.fullscreenShellElementRef?.nativeElement;
    if (!shell) {
      return;
    }
    const availableWidth = shell.clientWidth;
    const availableHeight = shell.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }
    const [width, height] = this.fullscreenDimensions(availableWidth, availableHeight);
    this.setFullscreenCardSize(`${width}px`, `${height}px`);
  }

  private setFullscreenCardSize(width: string | null, height: string | null): void {
    if (this.fullscreenCardWidth === width && this.fullscreenCardHeight === height) {
      return;
    }
    this.fullscreenCardWidth = width;
    this.fullscreenCardHeight = height;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.clearBadgeBlinkTimer();
    this.disconnectFullscreenObserver();
  }

  protected clearBadgeBlinkTimer(): void {
    if (this.badgeBlinkTimer) {
      clearTimeout(this.badgeBlinkTimer);
      this.badgeBlinkTimer = null;
    }
  }
}
