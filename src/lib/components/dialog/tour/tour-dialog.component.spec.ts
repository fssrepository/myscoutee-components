import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OverlayNavigationStore } from '../../../stores/overlay/overlay-navigation.store';
import { UI_TRANSLATIONS } from '@fssrepository/myscoutee-components/foundation';
import { TourDialogComponent } from './tour-dialog.component';
import type { TourDialogModel, TourDialogOptions } from './tour-dialog.types';

describe('Guide first visible frame', () => {
  let fixture: ComponentFixture<TourDialogComponent>;
  let surface: HTMLElement;
  let target: HTMLElement;
  let position: () => void;
  let options: TourDialogOptions;
  let model: TourDialogModel;
  let guide: { setStepIndex(index: number): void; stepIndex(): number; setTourVisible: ReturnType<typeof vi.fn>;
    showNoGuide: ReturnType<typeof vi.fn>; closePopup: ReturnType<typeof vi.fn> };
  function setModel(patch: Partial<TourDialogModel>): void {
    model = { ...model, ...patch }; fixture.componentRef.setInput('model', model);
  }
  function setFields(fields: { id: string; group: string; order: number; i18nKey?: string; screenKey?: string }[]): void {
    setModel({ fields: fields.map(field => ({ id: field.id, group: field.group, order: field.order,
      label: field.i18nKey ?? field.id, description: field.id })) });
  }

  beforeEach(async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    options = {};
    model = { open: true, loading: false, loadError: false, noGuide: false, visible: false,
      contextKey: 'test', stepIndex: 0, content: null,
      fields: [{ id: 'target', group: 'card', label: 'Target', description: 'Description', order: 0 }],
      labels: { heading: 'Guide', close: 'Close', back: 'Back', next: 'Next', done: 'Done',
        empty: 'No guide', errorTitle: 'Error', errorBody: 'Retry' } };
    guide = { setStepIndex: (index: number) => setModel({ stepIndex: index }), stepIndex: () => model.stepIndex,
      setTourVisible: vi.fn(), showNoGuide: vi.fn(), closePopup: vi.fn() };
    TestBed.configureTestingModule({ imports: [TourDialogComponent], providers: [
      { provide: OverlayNavigationStore, useValue: { register: () => Symbol(), unregister: vi.fn(), bringToFront: vi.fn() } },
      { provide: UI_TRANSLATIONS, useValue: { translate: (key: string) => key, currentLanguage: signal('en'), revision: signal(0) } }
    ] });
    surface = document.createElement('section');
    surface.dataset['guideSurface'] = 'test';
    target = document.createElement('button');
    target.dataset['guideField'] = 'target';
    target.getBoundingClientRect = () => new DOMRect(20, window.innerHeight - 64, 80, 40);
    target.scrollIntoView = vi.fn();
    surface.append(target);
    document.body.append(surface);
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(TourDialogComponent);
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('actions', { stepChange: guide.setStepIndex,
      visibleChange: guide.setTourVisible, empty: guide.showNoGuide, close: guide.closePopup });
    fixture.detectChanges();
    position = () => {
      (fixture.componentInstance as unknown as { position(): void }).position();
      fixture.detectChanges();
    };
  });

  afterEach(() => {
    fixture?.destroy();
    surface?.remove();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mountMeasuredCard() {
    position(); // Prepare/scroll the actual target.
    position(); // Mount the card invisibly with its provisional placement.
    const card = fixture.nativeElement.querySelector('.explanation-guide-overlay__card') as HTMLElement;
    card.getBoundingClientRect = () => new DOMRect(parseFloat(card.style.left), parseFloat(card.style.top), 332, 300);
    return fixture.nativeElement.querySelector('.explanation-guide-overlay') as HTMLElement;
  }

  it('keeps the card and focus hidden until the actual card size has a stable placement', () => {
    const overlay = mountMeasuredCard();
    expect(overlay.style.visibility).toBe('hidden');
    expect(overlay.querySelector('.explanation-guide-overlay__focus')).not.toBeNull();
    position(); // Correct the provisional 248px placement using the real 300px card.
    expect(overlay.style.visibility).toBe('hidden');
    position();
    expect(overlay.style.visibility).toBe('');
    const before = overlay.querySelector<HTMLElement>('section')!.style.top;
    position();
    expect(overlay.querySelector<HTMLElement>('section')!.style.top).toBe(before);
  });

  it('shows only the shade during target animation, then reveals the stable focus and card together', () => {
    class PositionEffect {
      getComputedTiming() { return { endTime: 180 }; }
      getKeyframes() { return [{ transform: 'translateY(20px)' }, { transform: 'none' }]; }
    }
    vi.stubGlobal('KeyframeEffect', PositionEffect);
    const animation = { playState: 'running', pending: false, effect: new PositionEffect() };
    target.getAnimations = () => [animation as unknown as Animation];
    const overlay = mountMeasuredCard();
    position();
    position();
    expect(overlay.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__shade')!.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__focus')!.style.visibility).toBe('hidden');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__card')!.style.visibility).toBe('hidden');
    animation.playState = 'finished';
    position();
    expect(overlay.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__focus')!.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__card')!.style.visibility).toBe('');
  });

  it('does not hide or replace the established shade when a later step animates', () => {
    const overlay = mountMeasuredCard();
    position(); position();
    const existingShades = Array.from(overlay.querySelectorAll<HTMLElement>('.explanation-guide-overlay__shade'));
    class PositionEffect {
      getComputedTiming() { return { endTime: 180 }; }
      getKeyframes() { return [{ transform: 'translateY(20px)' }, { transform: 'none' }]; }
    }
    vi.stubGlobal('KeyframeEffect', PositionEffect);
    target.getAnimations = () => [{ playState: 'running', pending: false, effect: new PositionEffect() } as unknown as Animation];
    guide.setStepIndex(1);
    fixture.detectChanges();
    position();
    expect(overlay.style.visibility).toBe('');
    expect(Array.from(overlay.querySelectorAll('.explanation-guide-overlay__shade'))).toEqual(existingShades);
    expect(existingShades.every(shade => shade.style.visibility === '')).toBe(true);
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__card')!.style.visibility).toBe('');
    expect(guide.setTourVisible).toHaveBeenLastCalledWith(true);
  });

  it('keeps the shade visible while recomputing the focus and card after viewport resize', () => {
    const overlay = mountMeasuredCard();
    position(); position();
    expect(overlay.style.visibility).toBe('');
    (fixture.componentInstance as unknown as { onResize(): void }).onResize();
    fixture.detectChanges();
    expect(overlay.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__shade')!.style.visibility).toBe('');
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__card')!.style.visibility).toBe('');
    position();
    expect(overlay.querySelector<HTMLElement>('.explanation-guide-overlay__card')!.style.visibility).toBe('');
  });
  it('uses no-guide feedback when the only available step is Close', () => {
    setFields([
      { id: 'close', group: 'menus', screenKey: 'test', i18nKey: 'close', order: 0 }
    ]);
    target.dataset['guideField'] = 'close';
    position();
    expect(guide.showNoGuide).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.explanation-guide-overlay__card')).toBeNull();
  });

  it('retains conditional actions from repeated card owners and only toggles when the owner changes', () => {
    const fields = ['member-grantVote', 'member-profile', 'member-revokeVote'].map((id, order) => ({
      id: 'card-actions:' + id, group: 'menus', screenKey: 'test', i18nKey: id, order
    }));
    setFields(fields);
    const makeOwner = (ids: string[], top: number) => {
      const owner = document.createElement('app-menu');
      owner.dataset['guideControl'] = 'card-actions';
      const trigger = document.createElement('button');
      trigger.className = 'app-menu__trigger';
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.dataset['guideItems'] = ids.join('\n');
      trigger.getBoundingClientRect = () => new DOMRect(20, top, 40, 40);
      trigger.scrollIntoView = vi.fn();
      const click = vi.fn(() => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        trigger.setAttribute('aria-expanded', String(open));
        owner.querySelector('[role="menu"]')?.remove();
        if (open) {
          const panel = document.createElement('div');
          panel.className = 'app-menu__panel';
          panel.setAttribute('role', 'menu');
          panel.getBoundingClientRect = () => new DOMRect(20, top, 160, 120);
          for (const id of ids) {
            const item = document.createElement('button');
            item.dataset['guideItem'] = id;
            item.getBoundingClientRect = () => new DOMRect(20, top, 160, 40);
            item.scrollIntoView = vi.fn();
            panel.append(item);
          }
          owner.append(panel);
        }
      });
      trigger.addEventListener('click', click);
      owner.append(trigger);
      surface.append(owner);
      return { owner, trigger, click };
    };
    const maya = makeOwner(['member-grantVote', 'member-profile'], 80);
    const evan = makeOwner(['member-revokeVote', 'member-profile'], 180);
    const component = fixture.componentInstance as unknown as {
      fieldsDirty: boolean; indexFields(root: HTMLElement): void; syncAvailableSteps(root: HTMLElement): void;
      steps(): typeof fields; goToStep(index: number): void; settlePosition(): void;
      resolveTarget(field: typeof fields[number], root: HTMLElement): { element: HTMLElement } | null;
    };
    vi.spyOn(component, 'settlePosition').mockImplementation(() => {});
    component.fieldsDirty = true;
    component.indexFields(surface);
    component.syncAvailableSteps(surface);
    expect(component.steps().map(field => field.id)).toContain('card-actions:member-revokeVote');
    const visit = (id: string) => component.goToStep(component.steps().findIndex(field => field.id === 'card-actions:' + id));
    visit('member-grantVote');
    expect(maya.click).toHaveBeenCalledTimes(1);
    expect(evan.click).not.toHaveBeenCalled();
    expect(component.resolveTarget(fields[0], surface)?.element.closest('app-menu')).toBe(maya.owner);
    visit('member-profile');
    expect(maya.click).toHaveBeenCalledTimes(1);
    visit('member-revokeVote');
    expect(maya.click).toHaveBeenCalledTimes(2);
    expect(evan.click).toHaveBeenCalledTimes(1);
    expect(component.resolveTarget(fields[2], surface)?.element.closest('app-menu')).toBe(evan.owner);
    const orderBefore = component.steps().map(field => field.id);
    component.fieldsDirty = true;
    component.indexFields(surface);
    component.syncAvailableSteps(surface);
    expect(component.steps().map(field => field.id)).toEqual(orderBefore);
    visit('member-revokeVote');
    expect(evan.click).toHaveBeenCalledTimes(1);
  });

  it('continues on a newly opened popup but closes after an ordinary surface action', () => {
    vi.useFakeTimers();
    setModel({ visible: true });
    const popup = document.createElement('section');
    popup.className = 'ui-popup';
    popup.getBoundingClientRect = () => new DOMRect(10, 10, 300, 400);
    const childTarget = target.cloneNode() as HTMLElement;
    childTarget.dataset['guideField'] = 'child-target';
    childTarget.getBoundingClientRect = () => new DOMRect(30, 40, 80, 40);
    childTarget.scrollIntoView = vi.fn();
    popup.append(childTarget);
    target.addEventListener('click', () => document.body.append(popup), { once: true });
    const component = fixture.componentInstance as unknown as { fieldsDirty: boolean; steps(): { id: string }[] };
    try {
      target.click();
      vi.advanceTimersByTime(60);
      expect(guide.closePopup).not.toHaveBeenCalled();
      setFields([
        { id: 'child-target', group: 'popup', screenKey: 'child', i18nKey: 'child', order: 0 }
      ]);
      component.fieldsDirty = true;
      position();
      expect(component.steps().map(field => field.id)).toEqual(['child-target']);
      childTarget.click();
      vi.advanceTimersByTime(60);
      expect(guide.closePopup).toHaveBeenCalledOnce();
    } finally {
      popup.remove();
    }
  });

  it('uses application bindings for an external requested step without knowing its screen or service', () => {
    const external = document.createElement('button');
    external.getBoundingClientRect = () => new DOMRect(100, 50, 60, 30);
    external.scrollIntoView = vi.fn();
    document.body.append(external);
    const selected = vi.fn();
    const request = signal<string | null>('external-action');
    options.requestedStepId = request;
    options.onRequestedStepSelected = id => { selected(id); request.set(null); };
    options.resolveSurface = () => surface;
    options.resolveField = field => field.id === 'external-action' ? external : undefined;
    options.trailingStepIds = ['external-action'];
    setFields([
      { id: 'external-action', group: 'custom', screenKey: 'custom', i18nKey: 'external', order: 0 },
      { id: 'target', group: 'custom', screenKey: 'custom', i18nKey: 'target', order: 1 }
    ]);
    try {
      position();
      expect(guide.stepIndex()).toBe(1);
      expect(selected).toHaveBeenCalledExactlyOnceWith('external-action');
      expect(external.scrollIntoView).toHaveBeenCalled();
      position();
      expect(selected).toHaveBeenCalledTimes(1);
    } finally {
      external.remove();
    }
  });

});
