import { InjectionToken } from '@angular/core';

export interface UiListDefaults {
  loadingWindowMs: number;
}

export const UI_LIST_DEFAULTS = new InjectionToken<UiListDefaults>('UI list defaults', {
  providedIn: 'root', factory: () => ({loadingWindowMs: 3000})
});
