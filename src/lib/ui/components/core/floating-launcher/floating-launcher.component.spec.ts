import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingLauncherComponent } from './floating-launcher.component';

interface GeometryPass { avoidActions(): void; }

describe('FloatingLauncherComponent geometry scheduling', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
      removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  function launcher() {
    const callbacks = new Map<number, FrameRequestCallback>();
    let frame = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callbacks.set(++frame, callback);
      return frame;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
    const fixture = TestBed.createComponent(FloatingLauncherComponent);
    fixture.componentRef.setInput('trigger', { id: 'test', icon: 'help', ariaLabel: 'help' });
    const geometry = vi.spyOn(fixture.componentInstance as unknown as GeometryPass, 'avoidActions');
    fixture.detectChanges();
    const flush = () => {
      const pending = [...callbacks];
      callbacks.clear();
      for (const [, callback] of pending) callback(0);
    };
    return { fixture, geometry, callbacks, cancel, flush };
  }

  it('combines initial rendering, scrolling and resize into one geometry pass', () => {
    const { fixture, geometry, flush } = launcher();
    fixture.detectChanges();
    document.dispatchEvent(new Event('scroll'));
    document.dispatchEvent(new Event('transitionend'));
    window.dispatchEvent(new Event('resize'));
    expect(geometry).not.toHaveBeenCalled();
    flush();
    expect(geometry).toHaveBeenCalledTimes(1);
  });

  it('continues checking later geometry changes without polling between events', () => {
    const { geometry, flush } = launcher();
    flush();
    expect(geometry).toHaveBeenCalledTimes(1);
    flush();
    expect(geometry).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('scroll'));
    document.dispatchEvent(new Event('scroll'));
    flush();
    expect(geometry).toHaveBeenCalledTimes(2);
  });

  it('cancels pending geometry work and removes event listeners when destroyed', () => {
    const { fixture, geometry, callbacks, cancel, flush } = launcher();
    fixture.destroy();
    expect(cancel).toHaveBeenCalled();
    document.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(geometry).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
  });
});
