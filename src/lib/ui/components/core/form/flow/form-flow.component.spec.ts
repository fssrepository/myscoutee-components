import { TestBed } from '@angular/core/testing';

import { type FormFlowControlModel, FormFlowComponent, type LinkInputConfig } from '../../../../../../public-api';

import { UI_TRANSLATIONS } from '../../../../../../public-api';

describe('FormFlowComponent controls', () => {
  it('associates native field labels with unique controls across simultaneous forms', () => {
    TestBed.configureTestingModule({ imports: [FormFlowComponent], providers: [
      { provide: UI_TRANSLATIONS, useValue: { revision: () => 0, translate: (text: string) => text } }
    ] });
    const model = { title: 'Profile', layout: 'grouped' as const, header: false, deferPreparation: false,
      steps: [{ id: 'basics', title: 'Basics', controls: [
        { id: 'name', bind: 'name', kind: 'text' as const, label: 'Name' },
        { id: 'about', bind: 'about', kind: 'textarea' as const, label: 'About' }
      ] }] };
    const fixtures = [TestBed.createComponent(FormFlowComponent), TestBed.createComponent(FormFlowComponent)];
    const ids: string[] = [];
    for (const fixture of fixtures) {
      fixture.componentRef.setInput('model', model);
      fixture.detectChanges();
      const labels = [...fixture.nativeElement.querySelectorAll('label.form-flow__label')] as HTMLLabelElement[];
      expect(labels).toHaveLength(2);
      for (const label of labels) {
        expect(label.control).not.toBeNull();
        expect(fixture.nativeElement.contains(label.control)).toBe(true);
        expect(label.htmlFor).toBe(label.control!.id);
        ids.push(label.htmlFor);
      }
    }
    expect(new Set(ids).size).toBe(4);
    fixtures.forEach(fixture => fixture.destroy());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('keeps header toggles boolean through the shared menu and honors disabled state', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: window.innerWidth <= Number(query.match(/max-width: (\d+)px/)?.[1] ?? 0),
      media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}
    }));
    const fixture = TestBed.createComponent(FormFlowComponent);
    const model = {title: 'Settings', layout: 'grouped' as const, deferPreparation: false,
      steps: [{id: 'settings', title: 'Settings', controls: [],
        headerControl: {id: 'enabled', kind: 'toggle' as const, bind: 'enabled', label: 'Enable settings'}}]};
    fixture.componentRef.setInput('model', model);
    fixture.componentInstance.writeValue({enabled: false});
    const changed = vi.fn(); fixture.componentInstance.registerOnChange(changed);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.form-flow__group-header-menu button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click(); fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({enabled: true});
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click(); fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({enabled: false});
    fixture.componentInstance.setDisabledState(true); fixture.detectChanges();
    expect(button.disabled).toBe(true); button.click();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('emits an unbound menu action without replacing the form with its item ID', () => {
    TestBed.configureTestingModule({ imports: [FormFlowComponent] });
    const fixture = TestBed.createComponent(FormFlowComponent);
    const component = fixture.componentInstance;
    const form = { name: 'Group', policy: { enabled: true, requiredFields: ['profile.name'] } };
    const control: FormFlowControlModel = { id: 'rules-open', kind: 'menu' };
    const changed = vi.fn();
    const action = vi.fn();
    component.registerOnChange(changed);
    component.action.subscribe(action);
    component.writeValue(form);
    const view = component as any;
    view.updateControlValue(control, 'rules-open');
    view.emitControlAction(control, { id: 'rules-open', item: { id: 'rules-open' }, sourceEvent: new Event('click') });
    expect(changed).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledWith(expect.objectContaining({ value: form,
      sourceEvent: expect.objectContaining({ id: 'rules-open' }) }));
    fixture.destroy();
  });

  it('forwards the control maxlength to the shared link input config', () => {
    TestBed.configureTestingModule({
      imports: [FormFlowComponent]
    });
    const fixture = TestBed.createComponent(FormFlowComponent);
    const componentView = fixture.componentInstance as unknown as {
      linkConfig: (control: FormFlowControlModel) => LinkInputConfig;
    };
    const control: FormFlowControlModel = {
      id: 'website',
      bind: 'website',
      kind: 'link',
      label: 'Website',
      placeholder: 'https://',
      required: true,
      maxLength: 2048,
      config: {
        model: {}
      }
    };

    expect(componentView.linkConfig(control)).toEqual(expect.objectContaining({
      label: 'Website',
      placeholder: 'https://',
      required: true,
      maxLength: 2048
    }));

    fixture.destroy();
  });

  it('keeps an empty number input empty and normalizes a pasted leading zero', () => {
    TestBed.configureTestingModule({
      imports: [FormFlowComponent]
    });
    const fixture = TestBed.createComponent(FormFlowComponent);
    const component = fixture.componentInstance;
    const componentView = component as unknown as {
      controlNumberValue: (control: FormFlowControlModel) => number | null;
      updateControlValue: (control: FormFlowControlModel, value: unknown) => void;
    };
    const control: FormFlowControlModel = {
      id: 'height',
      bind: 'height',
      kind: 'number',
      label: 'Height'
    };
    let emittedValue: unknown;
    component.registerOnChange(value => emittedValue = value);

    component.writeValue({ height: '' });
    expect(componentView.controlNumberValue(control)).toBeNull();

    componentView.updateControlValue(control, '0170');
    expect(emittedValue).toEqual({ height: 170 });
    expect(componentView.controlNumberValue(control)).toBe(170);

    componentView.updateControlValue(control, '');
    expect(emittedValue).toEqual({ height: '' });
    expect(componentView.controlNumberValue(control)).toBeNull();

    fixture.destroy();
  });
});

describe('FormFlowComponent initial rendering', () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  const model = { title: 'Profile', layout: 'grouped' as const, header: false,
    steps: [{ id: 'basics', title: 'Basics', controls: [
      { id: 'name', bind: 'name', kind: 'text' as const, label: 'Name' }
    ] }] };

  beforeEach(() => {
    frames = new Map(); nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback); return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    TestBed.configureTestingModule({ imports: [FormFlowComponent], providers: [
      { provide: UI_TRANSLATIONS, useValue: { revision: () => 0, translate: (text: string) => text } }
    ] });
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
  function paint() {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
  }

  it('paints the ring, renders inert fields behind it, then reveals the same fields', () => {
    const fixture = TestBed.createComponent(FormFlowComponent);
    fixture.componentRef.setInput('model', model);
    fixture.componentInstance.writeValue({ name: 'Anna' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"] app-indicator')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    paint(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    paint(); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(input).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"] app-indicator').getAttribute('kind')).toBe('spinner-ring');
    expect(input.closest('.form-flow__stage').hasAttribute('inert')).toBe(true);
    expect(fixture.nativeElement.querySelector('.form-flow').getAttribute('aria-busy')).toBe('true');
    paint(); fixture.detectChanges(); paint(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBe(input);
    expect(input.closest('.form-flow__stage').hasAttribute('inert')).toBe(false);
    expect(fixture.nativeElement.querySelector('.form-flow').getAttribute('aria-busy')).toBe('false');
    fixture.componentRef.setInput('model', { ...model });
    fixture.componentInstance.writeValue({ name: 'Updated' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBe(input);
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('continues showing the ring while data is loading and cancels preparation on destroy', () => {
    const fixture = TestBed.createComponent(FormFlowComponent);
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges(); paint(); paint(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    fixture.componentRef.setInput('loading', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    paint(); paint(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    paint(); paint(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    fixture.destroy();

    const cancelled = TestBed.createComponent(FormFlowComponent);
    cancelled.detectChanges();
    cancelled.destroy(); paint(); paint();
    expect((cancelled.componentInstance as any).preparing()).toBe(true);
  });
});

describe('FormFlowComponent carousel navigation', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('keeps the destination heading through delayed scrolling and form updates', () => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    TestBed.configureTestingModule({ imports: [FormFlowComponent], providers: [
      { provide: UI_TRANSLATIONS, useValue: { revision: () => 0, translate: (text: string) => text } }
    ] });
    const fixture = TestBed.createComponent(FormFlowComponent);
    fixture.componentRef.setInput('model', { layout: 'carousel', deferPreparation: false,
      steps: [{ id: 'basics', title: 'Basics', controls: [] }, { id: 'photos', title: 'Photos', controls: [] }],
      summary: { enabled: false } });
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.form-flow__body') as HTMLElement;
    [...body.querySelectorAll('.form-flow__slide')].forEach((slide, index) =>
      Object.defineProperty(slide, 'offsetLeft', { get: () => index * 340 }));
    fixture.nativeElement.querySelector('.form-flow__nav--next').click();
    fixture.detectChanges();
    const expectDestination = () => {
      expect(fixture.nativeElement.querySelector('.form-flow__step-badge').textContent).toContain('Photos');
      expect(fixture.nativeElement.querySelector('.form-flow__counter').textContent.trim()).toBe('2 / 2');
      expect(fixture.nativeElement.querySelector('.form-flow__progress-track span').style.width).toBe('100%');
    };
    expectDestination();
    // A busy first render can postpone both paint callbacks beyond the old 96ms lock.
    vi.advanceTimersByTime(150); fixture.detectChanges();
    expectDestination();
    fixture.componentInstance.writeValue({ name: 'Updated during transition' });
    fixture.componentRef.setInput('model', { ...fixture.componentInstance.model });
    fixture.detectChanges();
    expectDestination();
    for (let i = 0; i < 3; i++) { const queued = frames.splice(0); queued.forEach(callback => callback(0)); }
    body.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100); fixture.detectChanges();
    expectDestination();
    expect(body.scrollLeft).toBe(340);
    fixture.destroy();
  });
});

describe('FormFlow shared field path parsing', () => {
  afterEach(() => TestBed.resetTestingModule());

  it.each(['people[1].name', ['people', 1, ' name ']])('reads and immutably writes the same nested field path %s', bind => {
    const fixture = TestBed.createComponent(FormFlowComponent);
    const view = fixture.componentInstance as unknown as {
      controlTextValue(control: FormFlowControlModel): string;
      updateControlValue(control: FormFlowControlModel, value: unknown): void;
    };
    const control: FormFlowControlModel = { id: 'name', kind: 'text', bind };
    const original = { people: [{ name: 'First' }, { name: 'Before' }] };
    const changed = vi.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.writeValue(original);
    expect(view.controlTextValue(control)).toBe('Before');
    view.updateControlValue(control, 'After');
    expect(changed).toHaveBeenCalledWith({ people: [{ name: 'First' }, { name: 'After' }] });
    expect(original.people[1].name).toBe('Before');
    fixture.destroy();
  });
});
