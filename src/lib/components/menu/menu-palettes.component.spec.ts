import { TestBed } from '@angular/core/testing';
import { AppMenuComponent } from './menu.component';
import { AppMenuTriggerComponent } from './trigger/menu-trigger.component';

describe('shared menu palette styles', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    TestBed.configureTestingModule({ imports: [AppMenuComponent, AppMenuTriggerComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('keeps palettes available to both renderers when either menu is destroyed', () => {
    const menu = TestBed.createComponent(AppMenuComponent);
    menu.componentRef.setInput('items', [{ id: 'save', label: 'Save', palette: 'green', layout: 'action' }]);
    menu.detectChanges();
    const trigger = TestBed.createComponent(AppMenuTriggerComponent);
    trigger.componentRef.setInput('trigger', { label: 'Select', palette: 'green' });
    trigger.detectChanges();

    const foreground = (element: Element) => getComputedStyle(element).getPropertyValue('--app-menu-fg').trim();
    expect(foreground(menu.nativeElement.querySelector('button'))).toBe('#236d51');
    expect(foreground(trigger.nativeElement.querySelector('button'))).toBe('#236d51');

    menu.destroy();
    expect(foreground(trigger.nativeElement.querySelector('button'))).toBe('#236d51');
    trigger.componentRef.setInput('trigger', { label: 'Select', palette: 'blue' });
    trigger.detectChanges();
    expect(foreground(trigger.nativeElement.querySelector('button'))).toBe('#2b5d98');
    trigger.destroy();
  });

  it('keeps menu palette values inside menu surfaces', () => {
    const menu = TestBed.createComponent(AppMenuComponent);
    menu.componentRef.setInput('items', [{ id: 'one', label: 'One', palette: 'blue' }]);
    menu.detectChanges();
    const outside = document.createElement('div');
    outside.className = 'app-menu__palette--blue';
    document.body.append(outside);
    try {
      expect(getComputedStyle(outside).getPropertyValue('--app-menu-fg')).toBe('');
    } finally {
      outside.remove();
      menu.destroy();
    }
  });
});
