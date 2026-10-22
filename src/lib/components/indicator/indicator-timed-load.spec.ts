import { TestBed } from '@angular/core/testing';
import { IndicatorComponent } from '../../../public-api';

describe('Timed load ring', () => {
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('uses the existing CSS timeline without scheduling JavaScript progress frames', () => {
    const fixture = TestBed.createComponent(IndicatorComponent);
    Object.assign(fixture.componentInstance, { kind: 'load-ring', state: 'loading', durationMs: 1500 });
    const frame = vi.spyOn(globalThis, 'requestAnimationFrame');
    fixture.componentInstance.ngOnChanges({});
    expect(frame).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-indicator__load-ring-progress.is-timed')).not.toBeNull();
    expect(fixture.nativeElement.style.getPropertyValue('--app-indicator-duration')).toBe('1500ms');
    fixture.componentRef.setInput('state', 'success');
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('.app-indicator__load-ring-progress');
    expect(circle.classList.contains('is-timed')).toBe(false);
    expect(circle.getAttribute('stroke-dashoffset')).toBe('0');
    fixture.destroy();
  });

  it('preserves caller-controlled progress when a position is supplied', () => {
    const fixture = TestBed.createComponent(IndicatorComponent);
    fixture.componentRef.setInput('kind', 'load-ring');
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('position', 0.4);
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('.app-indicator__load-ring-progress');
    expect(circle.classList.contains('is-timed')).toBe(false);
    expect(circle.getAttribute('stroke-dashoffset')).toBe('60');
    fixture.destroy();
  });
});

describe('Action ring shared SVG definitions', () => {
  afterEach(() => TestBed.resetTestingModule());

  it.each(['circle', 'button', 'surface'] as const)('keeps %s geometry and its own gradient references', shape => {
    const fixtures = [TestBed.createComponent(IndicatorComponent), TestBed.createComponent(IndicatorComponent)];
    const ids = new Set<string>();
    for (const fixture of fixtures) {
      fixture.componentRef.setInput('kind', 'action-ring');
      fixture.componentRef.setInput('shape', shape);
      fixture.componentRef.setInput('state', 'loading');
      fixture.componentRef.setInput('tone', 'accent');
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
      const gradients = svg.querySelectorAll('linearGradient');
      expect(gradients).toHaveLength(3);
      gradients.forEach(gradient => {
        expect(gradient.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(ids.has(gradient.id)).toBe(false); ids.add(gradient.id);
      });
      const progress = svg.querySelector('.app-indicator__action-ring-progress')!;
      expect(progress.tagName.toLowerCase()).toBe(shape === 'circle' ? 'circle' : 'path');
      expect(progress.getAttribute('stroke')).toBe(`url(#${gradients[2].id})`);
      expect(svg.getAttribute('preserveAspectRatio')).toBe(shape === 'circle' ? null : 'none');
      fixture.componentRef.setInput('state', 'error'); fixture.detectChanges();
      expect(progress.getAttribute('stroke')).toBe(`url(#${gradients[1].id})`);
      fixture.destroy();
    }
  });
});
