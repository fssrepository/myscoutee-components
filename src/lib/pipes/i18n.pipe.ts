import { Pipe, PipeTransform, inject } from '@angular/core';

import { UI_TRANSLATIONS } from '../foundation/i18n/translation';
import type { UiTranslations } from '../foundation/i18n/translation';

@Pipe({
  name: 'i18n',
  standalone: true,
  pure: false
})
export class I18nPipe implements PipeTransform {
  private readonly i18n: UiTranslations = inject(UI_TRANSLATIONS);

  transform(value: string | null | undefined, fallback?: string | null): string {
    this.i18n.revision();
    return this.i18n.translate(value, fallback);
  }
}
