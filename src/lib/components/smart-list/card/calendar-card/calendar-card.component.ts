import { smartListPageBadgeLabel } from '../../smart-list-page.adapter';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input, TemplateRef, computed, signal } from '@angular/core';

import {
  countSmartListCalendarOverlaps
} from '../../smart-list-calendar.adapter';
import type {
  ListQuery,
  SmartListCalendarConfig,
  SmartListCalendarCounter,
  SmartListCalendarDay,
  SmartListCalendarMonthPage,
  SmartListCalendarMonthSpan,
  SmartListCalendarMonthWeek,
  SmartListCalendarTimedBadge,
  SmartListCalendarWeekPage,
  SmartListClassValue,
  SmartListFilters,
  SmartListItemTemplateContext,
  SmartListTimelineConfig,
  SmartListTimelinePage,
  SmartListTimelineSpan,
  SmartListTimelineTick
} from '../../smart-list.types';
import type { CalendarCardModel } from './calendar-card.types';

@Component({
  selector: 'app-calendar-card, app-smart-list-page-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-card.component.html',
  styleUrl: './calendar-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarCardComponent<T, TFilters extends SmartListFilters = SmartListFilters> {
  private readonly modelRef = signal<CalendarCardModel<T, TFilters> | null>(null);
  @Input() set model(value: CalendarCardModel<T, TFilters> | null) { this.modelRef.set(value); }
  get model(): CalendarCardModel<T, TFilters> | null { return this.modelRef(); }

  @HostBinding('class.is-touching')
  protected get isTouching(): boolean {
    return this.model?.touching === true;
  }

  protected readonly trackByCalendarPageKey = (
    _index: number,
    page: SmartListCalendarMonthPage<T> | SmartListCalendarWeekPage<T> | SmartListTimelinePage<T>
  ): string => page.key;

  protected readonly trackByCalendarMonthWeekKey = (_index: number, week: SmartListCalendarMonthWeek<T>): string =>
    `${week.start.toISOString()}-${week.end.toISOString()}`;

  protected readonly trackByCalendarDayKey = (_index: number, day: SmartListCalendarDay<T>): string => day.key;

  protected readonly trackByCalendarSpanKey = (_index: number, span: SmartListCalendarMonthSpan<T>): string => span.key;

  protected readonly trackByCalendarTimedBadge = (index: number, badge: SmartListCalendarTimedBadge<T>): unknown =>
    `${index}:${badge.topPct}`;

  protected readonly trackByTimelineTickKey = (_index: number, tick: SmartListTimelineTick): string => tick.key;

  protected readonly trackByTimelineSpanKey = (_index: number, span: SmartListTimelineSpan<T>): string => span.key;

  protected readonly monthPages = computed(() => {
    const model = this.modelRef();
    if (model?.mode !== 'month') return [];
    return (model.pages as readonly SmartListCalendarMonthPage<T>[]).map(page => ({...page,
      weeks: page.weeks.map(week => ({...week,
        days: week.days.map(day => ({...day, counter: this.counterView(this.monthCellCounter(day))})),
        spans: this.monthBadgeSpans(week).map(span => ({...span, ...this.badgeView(span.item)}))
      }))
    }));
  });

  protected readonly weekPages = computed(() => {
    const model = this.modelRef();
    if (model?.mode !== 'week') return [];
    const counterVariant = this.isCounterCalendarVariant();
    return (model.pages as readonly SmartListCalendarWeekPage<T>[]).map(page => ({...page,
      days: page.days.map(day => ({...day,
        counter: counterVariant ? this.counterView(this.calendarDayCounter(day)) : null,
        hours: this.calendarWeekHours().map(hour => ({hour,
          counter: this.counterView(counterVariant
            ? this.calendarCounterGranularity() === 'hour' ? this.calendarHourCounter(day, hour) : null
            : this.hybridHourCounter(day, hour))
        })),
        badges: counterVariant ? [] : this.weekDayTimedBadges(day).map(badge => ({...badge, ...this.badgeView(badge.item)}))
      }))
    }));
  });

  private counterView(counter: SmartListCalendarCounter | null) {
    return counter ? {...counter, classes: this.calendarCounterClass(counter),
      accentHue: this.calendarCounterSurface(counter)?.accentHue} : null;
  }

  private badgeView(item: T) {
    return {label: this.calendarBadgeLabel(item), classes: this.calendarBadgeClasses(item),
      accentHue: this.calendarBadgeSurface(item)?.accentHue};
  }

  protected timelinePages(): readonly SmartListTimelinePage<T>[] {
    if (this.model?.mode !== 'timeline') {
      return [];
    }
    return (this.model?.pages ?? []) as readonly SmartListTimelinePage<T>[];
  }

  protected isMonthMode(): boolean {
    return this.model?.mode === 'month';
  }

  protected isWeekMode(): boolean {
    return this.model?.mode === 'week';
  }

  protected isCounterCalendarVariant(): boolean {
    return this.model?.variant === 'counter';
  }

  protected calendarWeekdayLabels(): readonly string[] {
    return this.calendar()?.weekdayLabels ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }

  protected calendarWeekHours(): number[] {
    const startHour = this.calendarWeekStartHour();
    const endHour = this.calendarWeekEndHour();
    return Array.from(
      { length: Math.max(0, endHour - startHour + 1) },
      (_value, index) => startHour + index
    );
  }

  protected weekHourLabel(hour: number): string {
    return `${`${hour}`.padStart(2, '0')}:00`;
  }

  protected calendarCounterGranularity(): 'day' | 'hour' {
    return this.calendar()?.counterGranularity ?? 'hour';
  }

  protected readonly monthMinimumHeight = computed(() => {
    const limit = this.calendar()?.density?.monthMaxBadges;
    return limit == null ? null : 22 + limit * 20;
  });

  private monthCellCounter(day: SmartListCalendarDay<T>): SmartListCalendarCounter | null {
    if (this.isCounterCalendarVariant()) return this.calendarDayCounter(day);
    const limit = this.calendar()?.density?.monthMaxBadges;
    if (limit == null) return null;
    const query = this.query();
    return (query ? this.calendar()?.dayCounter?.(day, query) : null)
      ?? (day.items.length > limit ? this.counterFromCount(day.items.length) : null);
  }

  private hybridHourCounter(day: SmartListCalendarDay<T>, hour: number): SmartListCalendarCounter | null {
    const calendar = this.calendar(), query = this.query();
    const limit = calendar?.density?.weekMaxBadgesPerHour;
    if (limit == null || !query || !calendar) return null;
    const custom = calendar.hourCounter?.(day, hour, query);
    if (custom) return custom;
    const start = new Date(day.date); start.setHours(hour, 0, 0, 0);
    const end = new Date(start); end.setHours(hour + 1);
    const count = countSmartListCalendarOverlaps(day.items, start, end, item => calendar.resolveDateRange(item, query));
    return count > limit ? this.counterFromCount(count) : null;
  }

  private monthBadgeSpans(week: SmartListCalendarMonthWeek<T>): SmartListCalendarMonthSpan<T>[] {
    if (this.isCounterCalendarVariant()) return [];
    if (this.calendar()?.density?.monthMaxBadges == null) return week.spans;
    const dense = week.days.map(day => !!this.monthCellCounter(day));
    const result: SmartListCalendarMonthSpan<T>[] = [];
    const lanes: number[] = [];
    for (const span of week.spans) {
      let col = span.startCol;
      while (col <= span.endCol) {
        if (dense[col]) { col++; continue; }
        const startCol = col;
        while (col <= span.endCol && !dense[col]) col++;
        const endCol = col - 1;
        let lane = 0;
        const mask = ((1 << (endCol - startCol + 1)) - 1) << startCol;
        while ((lanes[lane] ?? 0) & mask) lane++;
        lanes[lane] = (lanes[lane] ?? 0) | mask;
        result.push({...span, key: `${span.key}:${startCol}`, startCol, endCol, lane});
      }
    }
    return result;
  }

  protected calendarDayCounter(day: SmartListCalendarDay<T>): SmartListCalendarCounter | null {
    const calendar = this.calendar();
    const query = this.query();
    if (!query) {
      return null;
    }
    const customCounter = calendar?.dayCounter?.(day, query) ?? null;
    if (customCounter) {
      return customCounter;
    }
    const count = day.items.length;
    return count > 0 ? this.counterFromCount(count) : null;
  }

  protected calendarHourCounter(day: SmartListCalendarDay<T>, hour: number): SmartListCalendarCounter | null {
    const calendar = this.calendar();
    const query = this.query();
    if (!calendar || !query) {
      return null;
    }
    const customCounter = calendar.hourCounter?.(day, hour, query) ?? null;
    if (customCounter) {
      return customCounter;
    }
    const slotStart = new Date(day.date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    const count = countSmartListCalendarOverlaps(
      day.items,
      slotStart,
      slotEnd,
      item => calendar.resolveDateRange(item, query)
    );
    return count > 0 ? this.counterFromCount(count) : null;
  }

  protected weekDayTimedBadges(day: SmartListCalendarDay<T>): SmartListCalendarTimedBadge<T>[] {
    const calendar = this.calendar();
    const query = this.query();
    if (!calendar || !query) {
      return [];
    }
    const dayStart = new Date(day.date);
    dayStart.setHours(this.calendarWeekStartHour(), 0, 0, 0);
    const dayEnd = new Date(day.date);
    dayEnd.setHours(this.calendarWeekEndHour() + 1, 0, 0, 0);
    const totalMinutes = Math.max(1, (dayEnd.getTime() - dayStart.getTime()) / 60000);
    const badges: SmartListCalendarTimedBadge<T>[] = [];
    const denseHours = calendar.density?.weekMaxBadgesPerHour == null ? []
      : this.calendarWeekHours().filter(hour => !!this.hybridHourCounter(day, hour));

    for (const item of day.items) {
      const range = calendar.resolveDateRange(item, query);
      if (!range) {
        continue;
      }
      const segmentStart = new Date(Math.max(range.start.getTime(), dayStart.getTime()));
      const segmentEnd = new Date(Math.min(range.end.getTime(), dayEnd.getTime()));
      if (segmentEnd.getTime() <= segmentStart.getTime()) {
        continue;
      }
      const minutesFromTop = (segmentStart.getTime() - dayStart.getTime()) / 60000;
      const durationMinutes = (segmentEnd.getTime() - segmentStart.getTime()) / 60000;
      if (calendar.density?.weekMaxBadgesPerHour == null) {
        badges.push({item, topPct: minutesFromTop / totalMinutes * 100,
          heightPct: Math.max(2.2, durationMinutes / totalMinutes * 100)});
        continue;
      }
      // Keep continuous sparse portions; dense hours use the existing counter cell.
      let start = segmentStart.getTime();
      for (const hour of denseHours) {
        const boundary = new Date(day.date); boundary.setHours(hour, 0, 0, 0);
        const from = boundary.getTime(); boundary.setHours(hour + 1);
        const until = boundary.getTime();
        if (until <= start || from >= segmentEnd.getTime()) continue;
        if (from > start) badges.push({item, topPct: (start - dayStart.getTime()) / 60000 / totalMinutes * 100,
          heightPct: (from - start) / 60000 / totalMinutes * 100});
        start = Math.max(start, until);
      }
      if (start < segmentEnd.getTime()) badges.push({item,
        topPct: (start - dayStart.getTime()) / 60000 / totalMinutes * 100,
        heightPct: (segmentEnd.getTime() - start) / 60000 / totalMinutes * 100});
    }

    return badges;
  }

  protected counterHeatClassByCount(count: number): string {
    if (count <= 0) {
      return 'calendar-counter-heat-0';
    }
    const clamped = Math.min(100, count);
    const normalized = (clamped - 1) / 99;
    if (normalized <= 0.16) {
      return 'calendar-counter-heat-1';
    }
    if (normalized <= 0.32) {
      return 'calendar-counter-heat-2';
    }
    if (normalized <= 0.5) {
      return 'calendar-counter-heat-3';
    }
    if (normalized <= 0.68) {
      return 'calendar-counter-heat-4';
    }
    if (normalized <= 0.84) {
      return 'calendar-counter-heat-5';
    }
    return 'calendar-counter-heat-6';
  }

  protected counterLabel(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
      return '0';
    }
    return value > 99 ? '99+' : `${value}`;
  }

  protected calendarBadgeLabel(item: T): string {
    const query = this.query();
    return smartListPageBadgeLabel(item, query ? this.calendar()?.badgeLabel?.(item, query) : null);
  }

  protected calendarBadgeToneClass(item: T): SmartListClassValue {
    const query = this.query();
    return query ? this.calendar()?.badgeToneClass?.(item, query) ?? null : null;
  }

  protected calendarBadgeSurface(item: T) {
    const query = this.query();
    const colors = this.calendar()?.badgeColors;
    const key = query && colors ? colors.resolveKey(item, query) : null;
    return key == null ? null : colors?.palette[key] ?? null;
  }

  protected calendarBadgeClasses(item: T): SmartListClassValue {
    const surface = this.calendarBadgeSurface(item);
    return surface?.badgeTone ? `calendar-badge-color-${surface.badgeTone}`
      : surface ? `ui-info-card--tone-${surface.surfaceTone ?? 'default'}` : this.calendarBadgeToneClass(item);
  }

  protected calendarCounterClass(counter: SmartListCalendarCounter | null): SmartListClassValue {
    const surface = this.calendarCounterSurface(counter);
    return surface?.badgeTone ? `calendar-badge-color-${surface.badgeTone}`
      : surface ? `ui-info-card--tone-${surface.surfaceTone ?? 'default'}` : counter?.toneClass ?? null;
  }

  private calendarCounterSurface(counter: SmartListCalendarCounter | null) {
    return counter?.colorKey ? this.calendar()?.badgeColors?.palette[counter.colorKey] ?? null : null;
  }

  protected selectCalendarDay(day: SmartListCalendarDay<T>, sourceEvent?: Event): void {
    sourceEvent?.preventDefault();
    sourceEvent?.stopPropagation();
    const item = day.items[0] ?? null;
    if (!item) {
      return;
    }
    this.selectItem(item, sourceEvent, {
      calendarDate: new Date(day.date),
      calendarDateIso: day.key
    });
  }

  protected selectItem(
    item: T,
    sourceEvent?: Event,
    context?: {
      calendarDate?: Date;
      calendarDateIso?: string;
      timelineStartOffsetMinutes?: number;
      timelineEndOffsetMinutes?: number;
    }
  ): void {
    this.model?.onItemSelect?.(item, sourceEvent, context);
  }

  protected selectTimelineSpan(span: SmartListTimelineSpan<T>, sourceEvent?: Event): void {
    if (!this.timelineItemInteractive()) {
      return;
    }
    sourceEvent?.preventDefault();
    sourceEvent?.stopPropagation();
    this.selectItem(span.item, sourceEvent, {
      timelineStartOffsetMinutes: span.startOffsetMinutes,
      timelineEndOffsetMinutes: span.endOffsetMinutes
    });
  }

  protected onTimelineSpanKeydown(span: SmartListTimelineSpan<T>, event: KeyboardEvent): void {
    if (!this.timelineItemInteractive()) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    this.selectTimelineSpan(span, event);
  }

  protected timelineRows(page: SmartListTimelinePage<T>): number[] {
    return Array.from({ length: Math.max(1, page.rowCount) }, (_item, index) => index);
  }

  protected timelineItemContext(
    span: SmartListTimelineSpan<T>,
    index: number
  ): SmartListItemTemplateContext<T, TFilters> | null {
    return this.model?.itemContext?.(span.item, index) ?? null;
  }

  protected timelineItemTemplate(): TemplateRef<SmartListItemTemplateContext<T, TFilters>> | null {
    if (!this.shouldUseTimelineItemTemplate()) {
      return null;
    }
    return this.model?.itemTemplate ?? null;
  }

  protected timelineItemInteractive(): boolean {
    const config = this.timeline();
    const query = this.query();
    const value = config?.itemInteractive;
    if (typeof value === 'function' && query) {
      return value(query) === true;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return !this.shouldUseTimelineItemTemplate();
  }

  private shouldUseTimelineItemTemplate(): boolean {
    const config = this.timeline();
    const query = this.query();
    const value = config?.useItemTemplate;
    if (typeof value === 'function' && query) {
      return value(query) === true;
    }
    return value === true;
  }

  private calendarWeekStartHour(): number {
    return Math.max(0, Math.min(23, Math.trunc(this.calendar()?.weekStartHour ?? 0)));
  }

  private calendarWeekEndHour(): number {
    return Math.max(this.calendarWeekStartHour(), Math.min(23, Math.trunc(this.calendar()?.weekEndHour ?? 23)));
  }

  private calendarTrackKey(index: number, item: T): unknown {
    return this.model?.trackByItem?.(index, item) ?? index;
  }

  private calendar(): SmartListCalendarConfig<T, TFilters> | null {
    return (this.model?.config ?? null) as SmartListCalendarConfig<T, TFilters> | null;
  }

  private timeline(): SmartListTimelineConfig<T, TFilters> | null {
    return (this.model?.config ?? null) as SmartListTimelineConfig<T, TFilters> | null;
  }

  private query(): ListQuery<TFilters> | null {
    return this.model?.query ?? null;
  }

  private counterFromCount(count: number): SmartListCalendarCounter {
    return {
      label: this.counterLabel(count),
      colorKey: this.calendar()?.badgeColors?.counterKey,
      toneClass: this.counterHeatClassByCount(count)
    };
  }
}
