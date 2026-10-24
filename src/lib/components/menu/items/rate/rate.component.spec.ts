import { TestBed } from '@angular/core/testing';
import { UI_TRANSLATIONS } from '../../../../foundation/i18n/translation';
import { RateComponent } from './rate.component';

describe('shared rating label', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([['en', 'Sympathy'], ['hu', 'Szimpátia']])('uses the sympathy label in %s independently of administrative affinity', async (language, expected) => {
    TestBed.configureTestingModule({ imports: [RateComponent], providers: [
      { provide: UI_TRANSLATIONS, useValue: {
        revision: () => 0, currentLanguage: () => language,
        translate: (key: string) => key === 'sympathy' ? expected
          : key === 'Affinity' || key === 'admin.params.group.affinity' ? (language === 'hu' ? 'Affinitás' : 'Affinity') : key
      } }
    ] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(RateComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rate__label').textContent.trim()).toBe(expected);
    fixture.componentRef.setInput('config', { label: 'admin.params.group.affinity' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rate__label').textContent.trim()).toBe(language === 'hu' ? 'Affinitás' : 'Affinity');
  });
});
