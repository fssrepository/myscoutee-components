export type UiDateValue = string | number | Date | null | undefined;

export interface UiDateRange {
  start: Date;
  end: Date;
}

/** Shared calendar operations. Local date and UTC semantics are preserved from AppUtils. */
export class UiDateUtils {

  static pad2(value: number): string {
    return `${value}`.padStart(2, '0');
  }

  static fromIsoDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  static isIsoDate(value: string | null | undefined): boolean {
    const normalized = `${value ?? ''}`.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return false;
    }
    return Number.isFinite(Date.parse(`${normalized}T00:00:00Z`));
  }

  static parseDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (value instanceof Date) {
      const parsedDate = new Date(value.getTime());
      return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
    }
    if (typeof value === 'number') {
      const parsedNumber = new Date(value);
      return Number.isFinite(parsedNumber.getTime()) ? parsedNumber : null;
    }
    const raw = `${value}`.trim();
    if (!raw) {
      return null;
    }
    const parsed = new Date(raw.replace(/\//g, '-'));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  static parseDateOnly(value: unknown): Date | null {
    const parsed = this.parseDate(value);
    return parsed ? this.dateOnly(parsed) : null;
  }

  static parseDateOnlyLocal(value: unknown): Date | null {
    const raw = `${value ?? ''}`.trim();
    if (!raw) {
      return null;
    }
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10) - 1;
      const day = Number.parseInt(match[3], 10);
      const parsed = new Date(year, month, day);
      return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day
        ? parsed
        : null;
    }
    const parsed = this.parseDate(value);
    return parsed ? this.dateOnly(parsed) : null;
  }

  static parseDateOnlyRange(
    startValue: UiDateValue,
    endValue: UiDateValue
  ): UiDateRange | null {
    const start = this.parseDateOnlyLocal(startValue);
    const end = this.parseDateOnlyLocal(endValue);
    return start && end ? { start, end } : null;
  }

  static parseDateRange(
    startValue: UiDateValue,
    endValue: UiDateValue,
    defaultDurationMs = 2 * 60 * 60 * 1000
  ): UiDateRange | null {
    const start = this.parseDate(startValue);
    if (!start) {
      return null;
    }
    const hasEndValue = `${endValue ?? ''}`.trim().length > 0;
    const parsedEnd = hasEndValue ? this.parseDate(endValue) : null;
    if (hasEndValue && !parsedEnd) {
      return null;
    }
    const durationMs = Math.max(0, Math.trunc(Number(defaultDurationMs) || 0));
    const end = parsedEnd && parsedEnd.getTime() > start.getTime()
      ? parsedEnd
      : new Date(start.getTime() + durationMs);
    return Number.isFinite(end.getTime()) ? { start, end } : null;
  }

  static dateRangeValuesOverlap(
    startValue: UiDateValue,
    endValue: UiDateValue,
    rangeStart: Date,
    rangeEnd: Date,
    defaultDurationMs = 2 * 60 * 60 * 1000
  ): boolean {
    const range = this.parseDateRange(startValue, endValue, defaultDurationMs);
    if (!range) {
      return false;
    }
    return this.dateRangeOverlaps(
      this.dateOnly(range.start),
      this.dateOnly(range.end),
      rangeStart,
      rangeEnd
    );
  }

  static filterItemsByDateOnlyRange<T>(
    items: readonly T[],
    rangeStartValue: UiDateValue,
    rangeEndValue: UiDateValue,
    resolveStartValue: (item: T) => UiDateValue,
    resolveEndValue: (item: T) => UiDateValue,
    defaultDurationMs = 2 * 60 * 60 * 1000
  ): T[] {
    const range = this.parseDateOnlyRange(rangeStartValue, rangeEndValue);
    if (!range) {
      return [...items];
    }
    return items.filter(item => this.dateRangeValuesOverlap(
      resolveStartValue(item),
      resolveEndValue(item),
      range.start,
      range.end,
      defaultDurationMs
    ));
  }

  static anchorDate(offsetInDays: number | null | undefined = 0, now = new Date(Date.now())): Date {
    const base = this.parseDate(now) ?? new Date(Date.now());
    const today = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const normalizedOffsetDays = Math.trunc(Number(offsetInDays) || 0);
    return this.addDays(today, normalizedOffsetDays);
  }

  static shiftDate(
    value: string | number | Date | null | undefined,
    referenceDate: string | number | Date | null | undefined,
    offsetInDays: number | null | undefined = 0,
    now = new Date(Date.now())
  ): Date {
    const parsedValue = this.parseDate(value);
    const parsedReferenceDate = this.parseDate(referenceDate);
    if (!parsedValue || !parsedReferenceDate) {
      return new Date(Number.NaN);
    }
    return new Date(
      this.anchorDate(offsetInDays, now).getTime()
      + (parsedValue.getTime() - parsedReferenceDate.getTime())
    );
  }

  static rebaseDateTime(
    value: string | number | Date | null | undefined,
    referenceDate: string | number | Date | null | undefined,
    offsetInDays: number | null | undefined = 0,
    now = new Date(Date.now())
  ): string | undefined {
    const shifted = this.shiftDate(value, referenceDate, offsetInDays, now);
    return Number.isFinite(shifted.getTime()) ? this.toIsoDateTimeLocal(shifted) : undefined;
  }

  static dateTimeMs(value: string | number | Date | null | undefined): number | null {
    return this.parseDate(value)?.getTime() ?? null;
  }

  static shortMonthDayLabel(value: Date): string {
    return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  static weekdayMonthDayLabel(value: Date): string {
    return value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  static weekdayMonthDayYearLabel(value: Date): string {
    return value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  static clockTimeLabel(value: Date): string {
    return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  static dateTimeRangeLabel(
    startIso: string | null | undefined,
    endIso: string | null | undefined,
    fallback = 'Date unavailable',
    defaultDurationMs = 2 * 60 * 60 * 1000
  ): string {
    const start = this.parseDate(startIso);
    const end = this.parseDate(endIso);
    if (!start) {
      return fallback;
    }
    const safeEnd = end && end.getTime() > start.getTime()
      ? end
      : new Date(start.getTime() + defaultDurationMs);
    const startDateLabel = this.shortMonthDayLabel(start);
    const startTimeLabel = this.clockTimeLabel(start);
    const endTimeLabel = this.clockTimeLabel(safeEnd);
    if (start.toDateString() === safeEnd.toDateString()) {
      return `${startDateLabel}, ${startTimeLabel} - ${endTimeLabel}`;
    }
    return `${startDateLabel}, ${startTimeLabel} - ${this.shortMonthDayLabel(safeEnd)}, ${endTimeLabel}`;
  }

  static normalizeDateTimeRangeText(
    value: string | null | undefined,
    fallback = 'Date unavailable'
  ): string {
    const normalized = `${value ?? ''}`.trim();
    if (!normalized) {
      return fallback;
    }
    const isoValues = normalized.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/g
    );
    return isoValues && isoValues.length >= 2
      ? this.dateTimeRangeLabel(isoValues[0], isoValues[1], normalized)
      : normalized;
  }

  static toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static dateKey(value: Date): string {
    return this.toIsoDate(this.dateOnly(value));
  }

  static monthKey(value: Date): string {
    const copy = this.startOfMonth(value);
    const year = copy.getFullYear();
    const month = `${copy.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  static toIsoDateTime(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    const hours = `${value.getHours()}`.padStart(2, '0');
    const minutes = `${value.getMinutes()}`.padStart(2, '0');
    const seconds = `${value.getSeconds()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  static toIsoDateTimeLocal(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    const hours = `${value.getHours()}`.padStart(2, '0');
    const minutes = `${value.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  static isoLocalDateTimeToDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  static isoLocalTimePart(value: string): string {
    const parsed = this.isoLocalDateTimeToDate(value);
    if (!parsed) {
      return '12:00';
    }
    const hours = `${parsed.getHours()}`.padStart(2, '0');
    const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  static applyDatePartToIsoLocal(current: string, date: Date | null): string {
    if (!date) {
      return current;
    }
    const base = this.isoLocalDateTimeToDate(current) ?? new Date();
    const next = new Date(base);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return this.toIsoDateTimeLocal(next);
  }

  static applyTimePartToIsoLocal(current: string, time: string): string {
    const base = this.isoLocalDateTimeToDate(current) ?? new Date();
    const [hoursRaw, minutesRaw] = time.split(':');
    const hours = Number.parseInt(hoursRaw ?? '', 10);
    const minutes = Number.parseInt(minutesRaw ?? '', 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return current;
    }
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    return this.toIsoDateTimeLocal(next);
  }

  static applyTimePartFromDateToIsoLocal(current: string, value: Date | null): string {
    if (!value) {
      return current;
    }
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return this.applyTimePartToIsoLocal(current, `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`);
  }

  static dateOnly(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  static dateRangeOverlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    return startA.getTime() <= endB.getTime() && endA.getTime() >= startB.getTime();
  }

  static addDays(value: Date, days: number): Date {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return this.dateOnly(copy);
  }

  static addMonths(value: Date, months: number): Date {
    const copy = new Date(value.getFullYear(), value.getMonth() + months, 1);
    return this.dateOnly(copy);
  }

  static startOfMonth(value: Date): Date {
    return this.dateOnly(new Date(value.getFullYear(), value.getMonth(), 1));
  }

  static endOfMonth(value: Date): Date {
    return this.dateOnly(new Date(value.getFullYear(), value.getMonth() + 1, 0));
  }

  static startOfWeekMonday(value: Date): Date {
    const copy = this.dateOnly(value);
    const day = copy.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return this.addDays(copy, mondayOffset);
  }

  static endOfWeekSunday(value: Date): Date {
    return this.addDays(this.startOfWeekMonday(value), 6);
  }

  static isoWeekNumber(date: Date): number {
    const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  static smartListDayLabel(value: Date): string {
    return value.toLocaleDateString(this.browserLocale(), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  static browserLocale(): string | string[] | undefined {
    if (typeof navigator === 'undefined') {
      return undefined;
    }
    return Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : (navigator.language || undefined);
  }

  static buildMonthAnchorWindow(focusMonth: Date, radius: number): Date[] {
    const anchors: Date[] = [];
    for (let offset = -radius; offset <= radius; offset += 1) {
      anchors.push(this.addMonths(focusMonth, offset));
    }
    return anchors;
  }

  static buildWeekAnchorWindow(focusWeek: Date, radius: number): Date[] {
    const anchors: Date[] = [];
    for (let offset = -radius; offset <= radius; offset += 1) {
      anchors.push(this.addDays(focusWeek, offset * 7));
    }
    return anchors;
  }

  static fromYearMonth(value: string): Date | null {
    if (!value || value === 'Present') {
      return null;
    }
    const match = value.trim().match(/^(\d{4})[/-](\d{1,2})(?:[/-](\d{1,2}))?$/);
    if (!match) {
      return null;
    }
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = match[3] ? Number.parseInt(match[3], 10) : 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  static toYearMonth(value: Date | null): string {
    if (!value) {
      return '';
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  static toSortableDate(value: string): number {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }
    const safe = value.replace(/\//g, '-');

    // Support full ISO date-time values directly (e.g. 2026-02-25T12:34:56).
    const direct = new Date(safe);
    if (!Number.isNaN(direct.getTime())) {
      return direct.getTime();
    }

    // Fallback for date-only and year-month values used in the app.
    if (/^\d{4}-\d{2}-\d{2}$/.test(safe)) {
      return new Date(`${safe}T00:00:00`).getTime();
    }
    if (/^\d{4}-\d{2}$/.test(safe)) {
      return new Date(`${safe}-01T00:00:00`).getTime();
    }
    return Number.POSITIVE_INFINITY;
  }

  static ageFromIsoDate(value: string, fallbackAge: number): number {
    const birthday = this.fromIsoDate(value);
    if (!birthday) {
      return fallbackAge;
    }
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const monthDiff = now.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthday.getDate())) {
      age -= 1;
    }
    return age;
  }

  static horoscopeByDate(value: Date): string {
    const month = value.getMonth() + 1;
    const day = value.getDate();
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    return 'Capricorn';
  }
}
