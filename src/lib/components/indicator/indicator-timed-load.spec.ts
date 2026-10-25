import { TestBed } from '@angular/core/testing';
import { IndicatorComponent } from '../../../public-api';

describe('Timed load ring', () => {
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('runs timed progress on HTML transform layers without JavaScript progress frames', () => {
    const fixture = TestBed.createComponent(IndicatorComponent);
    Object.assign(fixture.componentInstance, { kind: 'load-ring', state: 'loading', durationMs: 1500 });
    const frame = vi.spyOn(globalThis, 'requestAnimationFrame');
    fixture.componentInstance.ngOnChanges({});
    expect(frame).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-indicator__load-ring-progress.is-timed')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.app-indicator__load-ring-half')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.app-indicator__load-ring-cap')).toHaveLength(2);
    expect(fixture.nativeElement.style.getPropertyValue('--app-indicator-duration')).toBe('1500ms');
    fixture.componentRef.setInput('state', 'success');
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('.app-indicator__load-ring-progress');
    expect(circle.classList.contains('is-timed')).toBe(false);
    expect(fixture.nativeElement.querySelector('.app-indicator__load-ring-half')).toBeNull();
    expect(circle.getAttribute('stroke-dashoffset')).toBe('0');
    fixture.destroy();
  });

  it('runs a loading bar on the CSS timeline without JavaScript progress frames', () => {
    const fixture = TestBed.createComponent(IndicatorComponent);
    fixture.componentRef.setInput('kind', 'bar');
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('durationMs', 3000);
    const frame = vi.spyOn(globalThis, 'requestAnimationFrame');
    fixture.detectChanges();
    expect(frame).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.app-indicator__bar-loading.is-timed')).not.toBeNull();
    fixture.componentRef.setInput('state', 'scrolling');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-indicator__bar-loading.is-timed')).toBeNull();
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
    expect(fixture.nativeElement.querySelector('.app-indicator__load-ring-half')).toBeNull();
    fixture.componentRef.setInput('position', undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.app-indicator__load-ring-half')).toHaveLength(2);
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
