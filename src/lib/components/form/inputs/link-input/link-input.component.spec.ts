import { TestBed } from '@angular/core/testing';

import { UI_TRANSLATIONS } from '../../../../../public-api';
import { LinkInputComponent } from '../../../../../public-api';

describe('LinkInputComponent', () => {
  beforeEach(() => {
    // JSDOM has no matchMedia; preserve the component's configured viewport boundary.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: window.innerWidth <= Number(query.match(/max-width: (\d+)px/)?.[1] ?? 0),
      media: query, addEventListener() {}, removeEventListener() {}
    }));
    TestBed.configureTestingModule({
      imports: [LinkInputComponent],
      providers: [{
        provide: UI_TRANSLATIONS,
        useValue: {
          revision: () => 0,
          translate: (value: string | null | undefined) => value ?? ''
        }
      }]
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders a positive configured maxlength on the URL input', () => {
    const fixture = TestBed.createComponent(LinkInputComponent);
    fixture.componentRef.setInput('config', {
      label: 'Website',
      maxLength: 2048
    });
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('2048');
    expect(input.maxLength).toBe(2048);
  });
});
