import { InjectionToken } from '@angular/core';
/** Optional host coordination for guide-aware controls; no data or persistence policy. */
export interface GuideContext { registerContext(contextKey: string | null): () => void; popupOpen(): boolean; }
export const GUIDE_CONTEXT = new InjectionToken<GuideContext>('Guide UI context', {
  providedIn: 'root', factory: () => ({ registerContext: () => () => {}, popupOpen: () => false })
});
