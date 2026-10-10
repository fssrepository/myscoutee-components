import { EXPLANATION_GUIDE_OPTIONS, type ExplanationGuideOptions } from '../src/lib/guide/explanation-guide.service';
import { UI_TRANSLATIONS, type UiTranslations } from '../src/lib/foundation/translation';

const translations: UiTranslations = {
  revision: () => 0,
  currentLanguage: () => 'en',
  translate: (value, fallback) => fallback ?? value ?? '',
  translateParams: (value, _values, fallback) => fallback ?? value ?? ''
};

const guide: ExplanationGuideOptions = {
  isExplainableContext: () => false,
  loadState: async () => ({activeRevision: null, guideFields: []})
};

export default [
  { provide: UI_TRANSLATIONS, useValue: translations },
  { provide: EXPLANATION_GUIDE_OPTIONS, useValue: guide }
];
