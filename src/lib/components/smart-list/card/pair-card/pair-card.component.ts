import { I18nPipe } from '@fssrepository/myscoutee-components/foundation';
import { inject as injectImageUrls } from '@angular/core';
import { UI_IMAGE_URLS } from '@fssrepository/myscoutee-components/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LazyBgImageDirective } from '@fssrepository/myscoutee-components/core';
import { IndicatorComponent } from '@fssrepository/myscoutee-components/core';
import type {
  CardImageSlide,
  PairCardData,
  PairCardSlot
} from '@fssrepository/myscoutee-components/core';

import { RateCardBase } from '../rate-card-base';
import { RateCardFrameDirective } from '../rate-card-frame.directive';

@Component({
  selector: 'app-pair-card',
  standalone: true,
  imports: [CommonModule, RateCardFrameDirective, MatIconModule, LazyBgImageDirective, IndicatorComponent, I18nPipe],
  templateUrl: './pair-card.component.html',
  styleUrl: './pair-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PairCardComponent extends RateCardBase<PairCardData> {
  protected readonly defaultBadgeLayout = 'between';
  private readonly imageUrls = injectImageUrls(UI_IMAGE_URLS);
  private static readonly IMAGE_PULSE_DURATION_MS = 500;
  private static readonly FULLSCREEN_ASPECT_RATIO = 4 / 3;
  private static readonly SPLIT_DEFAULT_PERCENT = 50;
  private static readonly SPLIT_MIN_PERCENT = 0;
  private static readonly SPLIT_MAX_PERCENT = 100;
  private static readonly activeIndexByRowSlotKey: Record<string, number> = {};
  private static lastCompactSplitPercent = PairCardComponent.SPLIT_DEFAULT_PERCENT;

  private readonly compactMedia = typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia('(max-width: 760px)') : null;
  private compactViewport = this.compactMedia?.matches ?? false;
  private readonly onCompactViewportChange = (event: MediaQueryListEvent): void => {
    this.compactViewport = event.matches;
    this.scheduleFullscreenLayoutSync();
    this.cdr.markForCheck();
  };
  private readonly loadingTimersByKey: Record<string, ReturnType<typeof setTimeout>> = {};
  private splitPointerId: number | null = null;
  private splitBounds: { left: number; width: number } | null = null;
  private splitDragStartClientX: number | null = null;
  private splitDragStartPercent: number | null = null;
  private dragListenersBound = false;
  private readonly onWindowPointerMove = (event: PointerEvent): void => {
    // Touch browsers also send pointer moves. The touch handler owns this drag;
    // keep its duplicate pointer stream away from page-wide menu listeners.
    if (this.isResizing && this.splitPointerId === -1 && event.pointerType === 'touch') {
      event.stopPropagation();
      return;
    }
    if (!this.isResizing || this.splitPointerId !== event.pointerId) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    this.updateSplitFromDragDelta(event.clientX);
  };
  private readonly onWindowPointerUp = (event: PointerEvent): void => {
    if (this.splitPointerId !== event.pointerId) {
      return;
    }
    this.stopSplitDrag();
  };
  private readonly onWindowPointerCancel = (event: PointerEvent): void => {
    if (this.splitPointerId !== event.pointerId) {
      return;
    }
    this.stopSplitDrag();
  };
  private readonly onWindowTouchMove = (event: TouchEvent): void => {
    if (!this.isResizing) {
      return;
    }
    event.stopPropagation();
    if (this.splitPointerId !== -1) return;
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    this.updateSplitFromDragDelta(touch.clientX);
  };
  private readonly onWindowTouchEnd = (event: TouchEvent): void => {
    if (this.splitPointerId !== -1 || !event.changedTouches?.length) {
      return;
    }
    this.stopSplitDrag();
  };
  private readonly onWindowTouchCancel = (event: TouchEvent): void => {
    if (this.splitPointerId !== -1 || !event.changedTouches?.length) {
      return;
    }
    this.stopSplitDrag();
  };

  @Input() showSplitHandle = true;

  protected readonly activeIndexByKey: Record<string, number> = {};
  protected readonly loadingByKey: Record<string, boolean> = {};
  protected splitPercent = PairCardComponent.SPLIT_DEFAULT_PERCENT;
  protected isResizing = false;

  override ngAfterViewInit(): void {
    this.compactMedia?.addEventListener('change', this.onCompactViewportChange);
    super.ngAfterViewInit();
  }

  override ngOnChanges(changes: SimpleChanges): void {
    if (changes['showSplitHandle'] && !this.showSplitHandle) {
      this.stopSplitDrag();
    }
    super.ngOnChanges(changes);
  }

  override ngOnDestroy(): void {
    this.compactMedia?.removeEventListener('change', this.onCompactViewportChange);
    Object.values(this.loadingTimersByKey).forEach(timer => clearTimeout(timer));
    super.ngOnDestroy();
    this.stopSplitDrag();
  }

  protected trackBySlot(_index: number, slot: PairCardSlot): string {
    return slot.key;
  }

  protected resolvedSlots(): readonly PairCardSlot[] {
    return this.card?.slots ?? [];
  }

  protected isImageSwitchButtonTarget(imageIndex: number): boolean {
    return imageIndex === 0 && (this.card?.guideImageSwitch !== true || this.resolvedState() === 'active');
  }

  protected currentSlide(slot: PairCardSlot): CardImageSlide | null {
    if (slot.slides.length === 0) {
      return null;
    }
    return slot.slides[this.activeIndex(slot)] ?? slot.slides[0] ?? null;
  }

  protected currentSlideImageUrl(slot: PairCardSlot): string {
    return this.imageUrls.variantUrl(
      this.currentSlide(slot)?.imageUrl,
      this.resolvedPresentation() === 'fullscreen' ? 'large' : 'medium'
    );
  }

  protected activeIndex(slot: PairCardSlot): number {
    const rawIndex = this.activeIndexByKey[slot.key] ?? 0;
    if (slot.slides.length <= 1) {
      return 0;
    }
    return Math.max(0, Math.min(rawIndex, slot.slides.length - 1));
  }

  protected isLoading(slot: PairCardSlot): boolean {
    return this.loadingByKey[slot.key] ?? false;
  }

  protected resolvedSplitCssValue(): string {
    if (!this.isCompactViewport()) {
      return `${PairCardComponent.SPLIT_DEFAULT_PERCENT}%`;
    }
    return `${this.splitPercent}%`;
  }

  protected slotFlexBasis(slotIndex: number): string | null {
    if (this.resolvedPresentation() !== 'fullscreen' || !this.isCompactViewport()) return null;
    return `${slotIndex === 0 ? this.splitPercent : 100 - this.splitPercent}%`;
  }

  protected isSplitEnabled(): boolean {
    return this.resolvedPresentation() === 'fullscreen'
      && this.resolvedState() === 'active'
      && this.isCompactViewport();
  }

  protected isSplitHandleVisible(): boolean {
    return this.isSplitEnabled() && this.showSplitHandle;
  }

  protected isSlotCollapsed(slot: PairCardSlot, slotIndex: number): boolean {
    if (!this.isSplitEnabled()) {
      return false;
    }
    if (slotIndex === 0) {
      return this.splitPercent <= 0.1;
    }
    if (slotIndex === 1) {
      return this.splitPercent >= 99.9;
    }
    return !!slot.collapsed;
  }

  protected onSlotSelect(slot: PairCardSlot, index: number, event: Event): void {
    event.stopPropagation();
    if (!this.isInteractive()) {
      return;
    }
    const nextIndex = this.clampIndex(index, slot.slides.length);
    this.activeIndexByKey[slot.key] = nextIndex;
    if (this.card?.rowId) {
      PairCardComponent.activeIndexByRowSlotKey[this.rowSlotKey(this.card.rowId, slot.key)] = nextIndex;
    }
    this.startLoadingPulse(slot.key);
  }

  protected consumeClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onSplitHandlePointerDown(event: PointerEvent, splitContainerElement: HTMLElement): void {
    if (!this.isSplitEnabled() || !splitContainerElement) {
      return;
    }
    const bounds = splitContainerElement.getBoundingClientRect();
    if (bounds.width <= 0) {
      return;
    }
    this.splitBounds = { left: bounds.left, width: bounds.width };
    this.splitPointerId = event.pointerId;
    this.splitDragStartClientX = event.clientX;
    this.splitDragStartPercent = this.splitPercent;
    this.isResizing = true;
    this.bindDragListeners();
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement | null;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
    this.cdr.markForCheck();
  }

  protected onSplitHandleTouchStart(event: TouchEvent, splitContainerElement: HTMLElement): void {
    // Modern touch browsers already started a captured pointer drag. Do not
    // replace it with the duplicate, scroll-blocking touch event stream.
    if (this.isResizing && this.splitPointerId !== null) {
      event.stopPropagation();
      return;
    }
    if (!this.isSplitEnabled() || !splitContainerElement) {
      return;
    }
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    const bounds = splitContainerElement.getBoundingClientRect();
    if (bounds.width <= 0) {
      return;
    }
    this.splitBounds = { left: bounds.left, width: bounds.width };
    this.splitPointerId = -1;
    this.splitDragStartClientX = touch.clientX;
    this.splitDragStartPercent = this.splitPercent;
    this.isResizing = true;
    this.bindDragListeners();
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    this.cdr.markForCheck();
  }

  protected override syncStateFromCard(): void {
    const rowId = this.card?.rowId ?? '';
    Object.values(this.loadingTimersByKey).forEach(timer => clearTimeout(timer));
    Object.keys(this.loadingTimersByKey).forEach(key => delete this.loadingTimersByKey[key]);
    Object.keys(this.activeIndexByKey).forEach(key => delete this.activeIndexByKey[key]);
    Object.keys(this.loadingByKey).forEach(key => delete this.loadingByKey[key]);
    this.clearBadgeBlinkTimer();

    this.resolvedSlots().forEach(slot => {
      const storedIndex = rowId ? PairCardComponent.activeIndexByRowSlotKey[this.rowSlotKey(rowId, slot.key)] : undefined;
      const initialIndex = storedIndex ?? this.card?.initialActiveIndexByKey?.[slot.key] ?? 0;
      this.activeIndexByKey[slot.key] = this.clampIndex(initialIndex, slot.slides.length);
    });

    this.splitPercent = this.card?.split?.initialPercent ?? PairCardComponent.lastCompactSplitPercent;
    this.isResizing = false;
    this.transientBadgeBlink = false;
    this.badgeMenuOpen = false;
    this.stopSplitDrag();
    this.cdr.markForCheck();
  }

  private startLoadingPulse(slotKey: string): void {
    const timer = this.loadingTimersByKey[slotKey];
    if (timer) {
      clearTimeout(timer);
    }
    this.loadingByKey[slotKey] = true;
    this.cdr.markForCheck();
    this.loadingTimersByKey[slotKey] = setTimeout(() => {
      this.loadingByKey[slotKey] = false;
      delete this.loadingTimersByKey[slotKey];
      this.cdr.markForCheck();
    }, PairCardComponent.IMAGE_PULSE_DURATION_MS);
  }

  private clampIndex(index: number, slideCount: number): number {
    if (slideCount <= 1) {
      return 0;
    }
    return Math.max(0, Math.min(index, slideCount - 1));
  }

  private rowSlotKey(rowId: string, slotKey: string): string {
    return `${rowId}:${slotKey}`;
  }

  private isCompactViewport(): boolean {
    return this.compactViewport;
  }

  private updateSplitFromDragDelta(clientX: number): void {
    if (!this.splitBounds || this.splitBounds.width <= 0) {
      return;
    }
    const startX = this.splitDragStartClientX;
    const startPercent = this.splitDragStartPercent;
    if (startX === null || startPercent === null) {
      return;
    }
    const deltaPercent = ((clientX - startX) / this.splitBounds.width) * 100;
    this.splitPercent = Math.max(
      PairCardComponent.SPLIT_MIN_PERCENT,
      Math.min(startPercent + deltaPercent, PairCardComponent.SPLIT_MAX_PERCENT)
    );
    PairCardComponent.lastCompactSplitPercent = this.splitPercent;
    this.cdr.detectChanges();
  }

  private stopSplitDrag(): void {
    this.unbindDragListeners();
    this.isResizing = false;
    this.splitPointerId = null;
    this.splitBounds = null;
    this.splitDragStartClientX = null;
    this.splitDragStartPercent = null;
    this.cdr.detectChanges();
  }

  private bindDragListeners(): void {
    if (this.dragListenersBound || typeof globalThis.addEventListener !== 'function') {
      return;
    }
    // A divider drag belongs to this card, not the list's scroll/swipe handlers.
    // Consume moves before Angular's ancestor listeners schedule a page render.
    globalThis.addEventListener('pointermove', this.onWindowPointerMove, true);
    globalThis.addEventListener('pointerup', this.onWindowPointerUp);
    globalThis.addEventListener('pointercancel', this.onWindowPointerCancel);
    globalThis.addEventListener('touchmove', this.onWindowTouchMove, { passive: false, capture: true });
    globalThis.addEventListener('touchend', this.onWindowTouchEnd);
    globalThis.addEventListener('touchcancel', this.onWindowTouchCancel);
    this.dragListenersBound = true;
  }

  private unbindDragListeners(): void {
    if (!this.dragListenersBound || typeof globalThis.removeEventListener !== 'function') {
      return;
    }
    globalThis.removeEventListener('pointermove', this.onWindowPointerMove, true);
    globalThis.removeEventListener('pointerup', this.onWindowPointerUp);
    globalThis.removeEventListener('pointercancel', this.onWindowPointerCancel);
    globalThis.removeEventListener('touchmove', this.onWindowTouchMove, true);
    globalThis.removeEventListener('touchend', this.onWindowTouchEnd);
    globalThis.removeEventListener('touchcancel', this.onWindowTouchCancel);
    this.dragListenersBound = false;
  }

  protected override fullscreenDimensions(availableWidth: number, availableHeight: number): readonly [number, number] {
    if (this.isCompactViewport()) {
      return [availableWidth, availableHeight];
    }
    const width = Math.min(availableWidth, availableHeight * PairCardComponent.FULLSCREEN_ASPECT_RATIO);
    return [width, width / PairCardComponent.FULLSCREEN_ASPECT_RATIO];
  }
}
