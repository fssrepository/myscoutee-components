import { normalizeScheduleFrequency, normalizeSlotOverrideDate, normalizeSlotTemplates } from './slot-template';

describe('shared slot normalization', () => {
  it('normalizes common fields while retaining consumer metadata without mutating input', () => {
    const metadata = [{ id: 'consumer-specific' }];
    const input = { id: ' s1 ', startAt: '2026-10-12T10:00', overrideDate: '2026-10-13', closed: true, metadata };
    expect(normalizeSlotTemplates([input])).toEqual([{ ...input, id: 's1', startAt: '', metadata }]);
    expect(input.startAt).toBe('2026-10-12T10:00');
    expect(normalizeSlotOverrideDate('not a date')).toBeNull();
  });
  it.each([['bi weekly', 'Bi-weekly'], ['annually', 'Yearly'], ['MONTHLY', 'Monthly'], ['once', 'One-time']])
  ('normalizes %s to %s', (input, expected) => expect(normalizeScheduleFrequency(input)).toBe(expected));
});
