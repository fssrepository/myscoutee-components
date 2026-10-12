import { UiDateUtils } from './date-utils';

export interface SlotTemplate {
  id: string;
  startAt: string;
  overrideDate?: string | null;
  closed?: boolean;
}

export function normalizeSlotOverrideDate(value: unknown): string | null {
  const parsed = UiDateUtils.parseDateOnly(value);
  return parsed ? UiDateUtils.toIsoDate(parsed) : null;
}

export function normalizeScheduleFrequency(value: unknown): string {
  const normalized = `${value ?? ''}`.trim().toLowerCase();
  if (normalized === 'custom') {
    return 'Custom';
  }
  if (normalized === 'daily') {
    return 'Daily';
  }
  if (normalized === 'weekly') {
    return 'Weekly';
  }
  if (normalized.includes('bi-week') || normalized.includes('bi week')) {
    return 'Bi-weekly';
  }
  if (normalized === 'monthly') {
    return 'Monthly';
  }
  if (normalized === 'yearly' || normalized === 'annual' || normalized === 'annually') {
    return 'Yearly';
  }
  return 'One-time';
}

/** Normalize schedule fields while retaining consumer-owned metadata. */
export function normalizeSlotTemplates<T extends SlotTemplate>(items: readonly T[]): T[] {
  return items.map((item, index) => {
    const startAt = String(item.startAt ?? '').trim();
    const parsed = UiDateUtils.parseDate(startAt);
    return {
      ...item,
      id: String(item.id ?? `slot-${index + 1}`).trim() || `slot-${index + 1}`,
      startAt: item.closed === true ? '' : parsed ? startAt : UiDateUtils.toIsoDateTimeLocal(new Date()),
      overrideDate: normalizeSlotOverrideDate(item.overrideDate),
      closed: item.closed === true
    };
  });
}
