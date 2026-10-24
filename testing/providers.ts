import { UI_TRANSLATIONS, type UiTranslations } from '../src/lib/foundation/translation';

const translations: UiTranslations = {
  revision: () => 0,
  currentLanguage: () => 'en',
  translate: (value, fallback) => fallback ?? value ?? '',
  translateParams: (value, _values, fallback) => fallback ?? value ?? ''
};

export default [
  { provide: UI_TRANSLATIONS, useValue: translations }
];
