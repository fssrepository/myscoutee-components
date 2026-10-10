import { InjectionToken } from '@angular/core';
export interface UiBranding {
  productName: string;
  homeLabel: string;
  logoUrl: string;
  logoCharacterIndex: number | null;
  revision: number;
}
export const UI_BRANDING = new InjectionToken<() => UiBranding>('UI_BRANDING');
