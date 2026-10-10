import { UiDateUtils } from '../../public-api';
describe('UiDateUtils date-time range text', () => {
  it('formats an embedded raw ISO interval', () => {
    const start = '2026-09-06T06:23:33.087Z';
    const end = '2026-09-06T08:23:33.087Z';

    expect(UiDateUtils.normalizeDateTimeRangeText(`${start} – ${end}`))
      .toBe(UiDateUtils.dateTimeRangeLabel(start, end));
  });

  it('preserves an already formatted label', () => {
    expect(UiDateUtils.normalizeDateTimeRangeText('Sep 6, 8:23 AM - 10:23 AM'))
      .toBe('Sep 6, 8:23 AM - 10:23 AM');
  });
});

