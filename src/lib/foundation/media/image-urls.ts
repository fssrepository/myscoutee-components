import { InjectionToken } from '@angular/core';

export interface UiImageUrls {
  resolveSourceUrl(url: string): string;
  variantUrl(url: string | null | undefined, variant: 'small' | 'medium' | 'large'): string;
  cardFallbackUrl: string;
}

/** URL conventions and branding belong to the consumer, not the renderer. */
export const UI_IMAGE_URLS = new InjectionToken<UiImageUrls>('UI image URLs', {
  providedIn: 'root',
  factory: () => ({
    resolveSourceUrl: url => url,
    variantUrl: url => `${url ?? ''}`.trim(),
    cardFallbackUrl: ''
  })
});
