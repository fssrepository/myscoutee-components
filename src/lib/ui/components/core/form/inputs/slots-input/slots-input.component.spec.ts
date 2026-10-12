import { TestBed } from '@angular/core/testing';
import { SlotsInputComponent } from './slots-input.component';

describe('SlotsInputComponent standalone schedules', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (media: string) => ({media, matches: false,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}}));
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });

  it.each(['Monthly', 'Quarterly', 'Yearly'])('saves a %s task schedule without event slot rows', async frequency => {
    const fixture = TestBed.createComponent(SlotsInputComponent);
    const scheduleChange = vi.fn();
    fixture.componentRef.setInput('config', {scheduleOnly: true, frequency,
      frequencyOptions: ['One-time', 'Monthly', 'Quarterly', 'Yearly'],
      startAtIso: '2026-10-12T10:00:00Z', scheduleChange});
    fixture.detectChanges();
    fixture.componentInstance.openScheduleEditor(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const save = fixture.nativeElement.querySelector('[aria-label="Add schedule"]') as HTMLButtonElement;
    expect(save).not.toBeNull(); save.click(); fixture.detectChanges();
    expect(scheduleChange).toHaveBeenCalledExactlyOnceWith({frequency, startAtIso:'2026-10-12T10:00:00.000Z'});
    expect(fixture.nativeElement.querySelector('app-popup')).toBeNull();
  });
});
