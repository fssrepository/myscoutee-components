import type { ListQuery } from '../../../../foundation/list/list.types';
import type { UiConverter } from '../../../../foundation/utils/converter.types';
import type { SmartListCalendarConfig, SmartListCalendarVariant, SmartListFilters, SmartListViewMode } from '../../smart-list.types';
import type { SmartListPage } from '../../smart-list-page.adapter';
import type { CalendarCardModel } from './calendar-card.types';

export interface CalendarCardConverterInput<T, TFilters extends SmartListFilters = SmartListFilters> {
  viewMode: SmartListViewMode;
  pages: readonly SmartListPage[];
  calendar: SmartListCalendarConfig<T, TFilters> | null;
  query: ListQuery<TFilters>;
  variant: SmartListCalendarVariant;
  touching: boolean;
  trackByItem?: ((index: number, item: T) => unknown) | null;
  onItemSelect?: ((item: T, event?: Event) => void) | null;
}

export class CalendarCardConverter {
  static convert<T, TFilters extends SmartListFilters = SmartListFilters>(
    input: CalendarCardConverterInput<T, TFilters>
  ): CalendarCardModel<T, TFilters> {
    return {
      mode: input.viewMode === 'week' || input.viewMode === 'timeline' ? input.viewMode : 'month',
      pages: input.pages,
      config: input.calendar,
      query: input.query,
      variant: input.variant,
      touching: input.touching,
      trackByItem: input.trackByItem ?? null,
      onItemSelect: input.onItemSelect ?? null
    };
  }
}

export const calendarCardConverter =
  CalendarCardConverter satisfies UiConverter<
    CalendarCardConverterInput<unknown>,
    CalendarCardModel<unknown>
  >;
