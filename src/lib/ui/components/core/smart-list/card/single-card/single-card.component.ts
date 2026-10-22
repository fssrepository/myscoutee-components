import { I18nPipe } from '@fssrepository/myscoutee-components/foundation';
import { inject as injectImageUrls } from '@angular/core';
import { UI_IMAGE_URLS } from '@fssrepository/myscoutee-components/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LazyBgImageDirective } from '@fssrepository/myscoutee-components/core';
import { IndicatorComponent } from '@fssrepository/myscoutee-components/core';
import type {
  CardContextBadgeConfig,
  CardImageSlide,
  SingleCardData
} from '@fssrepository/myscoutee-components/core';

import { RateCardBase } from '../rate-card-base';
import { RateCardFrameDirective } from '../rate-card-frame.directive';

@Component({
  selector: 'app-single-card',
  standalone: true,
  imports: [CommonModule, RateCardFrameDirective, MatIconModule, LazyBgImageDirective, IndicatorComponent, I18nPipe],
  templateUrl: './single-card.component.html',
  styleUrl: './single-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SingleCardComponent extends RateCardBase<SingleCardData> {
  protected readonly defaultBadgeLayout = 'floating';
  private readonly imageUrls = injectImageUrls(UI_IMAGE_URLS);
  private static readonly IMAGE_PULSE_DURATION_MS = 500;
  private static readonly MOBILE_VIEWPORT_MAX_WIDTH_PX = 760;
  private static readonly MOBILE_FULLSCREEN_ASPECT_RATIO = 9 / 16;
  private static readonly DESKTOP_FULLSCREEN_ASPECT_RATIO = 3 / 4;
  private static readonly activeIndexByRowId: Record<string, number> = {};

  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  protected activeIndex = 0;
  protected loading = false;

  override ngOnDestroy(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    super.ngOnDestroy();
  }

  protected resolvedSlides(): readonly CardImageSlide[] {
    return this.card?.slides ?? [];
  }

  protected contextBadgeLabel(badge: CardContextBadgeConfig): string {
    return badge.label.trim().slice(0, 3).toUpperCase();
  }

  protected currentSlide(): CardImageSlide | null {
    const slides = this.resolvedSlides();
    if (slides.length === 0) {
      return null;
    }
    return slides[this.clampedActiveIndex()] ?? slides[0] ?? null;
  }

  protected currentSlideImageUrl(): string {
    return this.imageUrls.variantUrl(
      this.currentSlide()?.imageUrl,
      this.resolvedPresentation() === 'fullscreen' ? 'large' : 'medium'
    );
  }

  protected clampedActiveIndex(): number {
    const slides = this.resolvedSlides();
    if (slides.length <= 1) {
      return 0;
    }
    return Math.max(0, Math.min(this.activeIndex, slides.length - 1));
  }

  protected hasOverlay(slide: CardImageSlide | null): boolean {
    return !!slide?.primaryLine && !!slide?.secondaryLine;
  }

  protected onSlideSelect(index: number, event: Event): void {
    event.stopPropagation();
    if (!this.isInteractive()) {
      return;
    }
    this.activeIndex = this.clampIndex(index);
    if (this.card?.rowId) {
      SingleCardComponent.activeIndexByRowId[this.card.rowId] = this.activeIndex;
    }
    this.startLoadingPulse();
  }

  protected onContextBadgeClick(badge: CardContextBadgeConfig, event: MouseEvent): void {
    event.stopPropagation();
    const profileView = badge.profileView;
    const userId = `${profileView?.userId ?? ''}`.trim();
    if (!profileView || !userId) {
      return;
    }
    this.emitDetailClick({
      ...profileView,
      userId
    });
  }

  protected override syncStateFromCard(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.clearBadgeBlinkTimer();
    const rowId = this.card?.rowId ?? '';
    const storedIndex = rowId ? SingleCardComponent.activeIndexByRowId[rowId] : undefined;
    const initialIndex = storedIndex ?? this.card?.initialActiveIndex ?? 0;
    this.activeIndex = this.clampIndex(initialIndex);
    this.loading = false;
    this.transientBadgeBlink = false;
    this.badgeMenuOpen = false;
    this.cdr.markForCheck();
  }

  private clampIndex(index: number): number {
    const slides = this.resolvedSlides();
    if (slides.length <= 1) {
      return 0;
    }
    return Math.max(0, Math.min(index, slides.length - 1));
  }

  private startLoadingPulse(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.loadingTimer = setTimeout(() => {
      this.loading = false;
      this.loadingTimer = null;
      this.cdr.markForCheck();
    }, SingleCardComponent.IMAGE_PULSE_DURATION_MS);
  }

  private isCompactViewport(): boolean {
    return typeof globalThis.innerWidth === 'number'
      && globalThis.innerWidth <= SingleCardComponent.MOBILE_VIEWPORT_MAX_WIDTH_PX;
  }

  protected override fullscreenDimensions(availableWidth: number, availableHeight: number): readonly [number, number] {
    if (this.isCompactViewport()) {
      return [availableWidth, availableWidth / SingleCardComponent.MOBILE_FULLSCREEN_ASPECT_RATIO];
    }
    const width = Math.min(availableWidth, availableHeight * SingleCardComponent.DESKTOP_FULLSCREEN_ASPECT_RATIO);
    return [width, width / SingleCardComponent.DESKTOP_FULLSCREEN_ASPECT_RATIO];
  }
}
