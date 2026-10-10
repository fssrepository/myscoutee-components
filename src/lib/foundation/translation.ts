import { InjectionToken, type Provider, type Type } from '@angular/core';

/** Presentation-facing contract of the existing translation engine.
 * Bundle loading, persistence and session scope belong to the consumer.
 */
export interface UiTranslations {
  readonly revision: () => number;
  readonly currentLanguage: () => string;
  translate(value: string | null | undefined, fallback?: string | null): string;
  translateParams(
    value: string | null | undefined,
    values: Record<string, string | number>,
    fallback?: string | null
  ): string;
}

/** A consumer supplies its existing engine; the library creates no translation state. */
export const UI_TRANSLATIONS = new InjectionToken<UiTranslations>('MyScoutee UI translations');

export function provideUiTranslations(service: Type<UiTranslations>): Provider {
  return { provide: UI_TRANSLATIONS, useExisting: service };
}
