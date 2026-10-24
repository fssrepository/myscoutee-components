import { InjectionToken } from '@angular/core';
import type { AppMenuItem } from '../../components/menu/menu.types';

export interface ImageDetails { location: string; caption: string; [key: string]: unknown; }
export interface ImageDetailsConfig { [key: string]: unknown; }
export type ImageDetailsMap = Record<string, ImageDetails>;
export const IMAGE_CAPTION_MAX_LENGTH = 40;

/** Preserve caller-owned metadata while normalizing the common fields. */
export function normalizeImageDetails<T extends ImageDetails>(details: Record<string, T> | null | undefined, urls: readonly string[]): Record<string, T> {
  return Object.fromEntries(urls.filter(url => details?.[url]).map(url => {
    const value = details![url];
    const caption = `${value.caption ?? ''}`.replace(/\s+/g, ' ').trim();
    const location = `${value.location ?? ''}`.trim();
    if (caption.length > IMAGE_CAPTION_MAX_LENGTH || location.length > 240) throw new Error('Image details exceed the allowed length.');
    return [url, { ...value, location, caption }];
  }));
}
export interface ImageDetailsField {
  label: string;
  required?: boolean;
  guideFieldId?: string;
  items: readonly AppMenuItem[];
  description?: string;
  descriptionLabel?: string;
  select?: () => Promise<ImageDetails | null>;
}
export interface ImageDetailsAdapter {
  normalize: (details: ImageDetailsMap | null | undefined, urls: readonly string[]) => ImageDetailsMap;
  valid: (details: ImageDetails | undefined, config: ImageDetailsConfig) => boolean;
  showLocation: (config: ImageDetailsConfig, readOnly: boolean) => boolean;
  field: (details: ImageDetails, config: ImageDetailsConfig, readOnly: boolean) => ImageDetailsField | null;
}
export const UI_IMAGE_DETAILS = new InjectionToken<ImageDetailsAdapter>('UI_IMAGE_DETAILS', {
  providedIn: 'root', factory: () => ({ normalize: normalizeImageDetails, valid: () => true, showLocation: () => true, field: () => null })
});
export interface ImageUploadService {
  uploadImage(ownerId: string, entityId: string, file: File): Promise<{uploaded: boolean; imageUrl?: string | null}>;
}
export const UI_IMAGE_UPLOAD = new InjectionToken<ImageUploadService>('UI_IMAGE_UPLOAD');
