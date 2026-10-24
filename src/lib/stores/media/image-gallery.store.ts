import { ImageDetailsMap } from '../../foundation/media/image-details';
import { ImageDetailsConfig } from '../../foundation/media/image-details';
import { UI_IMAGE_DETAILS } from '../../foundation/media/image-details';
import { Injectable, computed, signal, inject } from '@angular/core';

export interface ImageGalleryRequest {
  images: readonly string[];
  imageDetails?: ImageDetailsMap;
  detailsConfig?: ImageDetailsConfig;
  onDetailsChange?: (details: ImageDetailsMap) => void;
  slotCount: number;
  readOnly: boolean;
  presentation?: 'editor' | 'slideshow';
  title: string;
  uploadOwnerId: string;
  uploadEntityId: string;
  onSave?: (images: string[], details: ImageDetailsMap) => Promise<void>;
  onChange?: (images: string[]) => void;
}

@Injectable({ providedIn: 'root' })
export class ImageGalleryStore {
  private readonly detailsAdapter = inject(UI_IMAGE_DETAILS);
  private readonly requestRef = signal<(ImageGalleryRequest & { token: object }) | null>(null);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal(false);
  readonly request = this.requestRef.asReadonly();
  readonly invalid = computed(() => {
    const request = this.request();
    return !!request && request.images.some(url => !this.detailsAdapter.valid(request.imageDetails?.[url], request.detailsConfig ?? {}));
  });

  open(request: ImageGalleryRequest): object {
    const token = {};
    this.saving.set(false); this.uploading.set(false); this.error.set(false);
    this.requestRef.set({ ...request, images: [...request.images], imageDetails: this.detailsAdapter.normalize(request.imageDetails, request.images), token });
    return token;
  }

  close(token?: object): void {
    if (!token || this.request()?.token === token) this.requestRef.set(null);
  }

  setUploading(token: object, value: boolean): void {
    if (this.request()?.token === token) this.uploading.set(value);
  }

  async save(token: object): Promise<void> {
    const request = this.request();
    if (!request || request.token !== token || request.readOnly || !request.onSave
      || this.saving() || this.uploading() || this.invalid() || !request.images.length) return;
    this.saving.set(true); this.error.set(false);
    try {
      await request.onSave([...request.images], this.detailsAdapter.normalize(request.imageDetails, request.images));
      this.close(token);
    } catch {
      if (this.request()?.token === token) this.error.set(true);
    } finally {
      if (!this.request() || this.request()?.token === token) this.saving.set(false);
    }
  }

  updateImages(token: object, images: readonly string[]): void {
    const request = this.request();
    if (!request || request.token !== token || request.readOnly || this.saving() || images.length > request.slotCount) return;
    const next = [...images];
    const imageDetails = this.detailsAdapter.normalize(request.imageDetails, next);
    this.requestRef.set({ ...request, images: next, imageDetails });
    request.onDetailsChange?.(imageDetails);
    request.onChange?.(next);
  }
  updateDetails(token: object, details: ImageDetailsMap): void {
    const request = this.request();
    if (!request || request.token !== token || request.readOnly || this.saving()) return;
    const imageDetails = this.detailsAdapter.normalize(details, request.images);
    this.requestRef.set({ ...request, imageDetails });
    request.onDetailsChange?.(imageDetails);
  }

}
