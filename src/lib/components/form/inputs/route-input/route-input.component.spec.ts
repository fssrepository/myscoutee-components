import { TestBed } from '@angular/core/testing';
import { RouteInputComponent } from './route-input.component';
import { FORM_FLOW_BUILTIN_CONTROLS } from '../../../../foundation/forms/form-flow-controls';

// Exercise the real lazy popup and its CVA boundary without application providers.
describe('RouteInputComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (media: string) => ({media, matches: false,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}}));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  async function open() {
    const fixture = TestBed.createComponent(RouteInputComponent);
    const changed = vi.fn();
    fixture.componentInstance.registerOnChange(changed);
    fixture.componentInstance.writeValue(['Budapest', 'Vienna']);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.route-input__open-btn').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.route-input-popup__row input')).not.toBeNull();
    });
    return { fixture, changed };
  }

  it('saves edited stops through the built-in FormFlow control', async () => {
    expect(await FORM_FLOW_BUILTIN_CONTROLS['route'].load()).toBe(RouteInputComponent);
    const {fixture, changed} = await open();
    const stop = fixture.nativeElement.querySelector('.route-input-popup__row input') as HTMLInputElement;
    stop.value = ' Bratislava ';
    stop.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="route.save.aria"]').click();
    fixture.detectChanges();
    expect(changed).toHaveBeenCalledExactlyOnceWith(['Bratislava', 'Vienna']);
    expect(fixture.nativeElement.querySelector('app-route-input-popup')).toBeNull();
  });

  it('discards a cancelled draft and reopens the original stops', async () => {
    const {fixture, changed} = await open();
    const stop = fixture.nativeElement.querySelector('.route-input-popup__row input') as HTMLInputElement;
    stop.value = 'Draft'; stop.dispatchEvent(new Event('input')); fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Close route setup"]').click();
    fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('.route-input__open-btn').click(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.route-input-popup__row input').value).toBe('Budapest');
  });

  it('does not offer an editor when read-only', () => {
    const fixture = TestBed.createComponent(RouteInputComponent);
    fixture.componentRef.setInput('readOnly', true);
    fixture.componentInstance.writeValue(['Budapest']); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.route-input__open-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.route-input__toggle').disabled).toBe(true);
  });
  it('opens the same encoded directions from the host and lazy editor, with stop search kept separate', async () => {
    const map = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      const { fixture } = await open();
      fixture.nativeElement.querySelector('.route-input__map-btn').click();
      fixture.nativeElement.querySelector('.route-input-popup__main-map-btn').click();
      const directions = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=Budapest&destination=Vienna';
      expect(map).toHaveBeenNthCalledWith(1, directions, '_blank', 'noopener,noreferrer');
      expect(map).toHaveBeenNthCalledWith(2, directions, '_blank', 'noopener,noreferrer');
      fixture.nativeElement.querySelector('.route-input-popup__map-btn').click();
      expect(map).toHaveBeenLastCalledWith('https://www.google.com/maps/search/?api=1&query=Budapest', '_blank', 'noopener,noreferrer');
    } finally { map.mockRestore(); }
  });

});
