import { CalendarCardConverter } from '../../../../../public-api';

describe('Calendar card conversion', () => {
  it.each(['list', 'month', 'week', 'timeline'] as const)('maps %s without copying caller-owned pages or query', viewMode => {
    const pages = [{key: '2026-10', label: 'October', anchor: new Date(2026, 9, 1)}];
    const query = {page: 0, pageSize: 20, filters: {category: 'test'}};
    const selected = vi.fn();
    const track = (_index: number, item: {id: string}) => item.id;
    const model = CalendarCardConverter.convert({viewMode, pages, calendar: null, query,
      variant: 'counter', touching: true, trackByItem: track, onItemSelect: selected});
    expect(model.mode).toBe(viewMode === 'list' ? 'month' : viewMode);
    expect(model.pages).toBe(pages); expect(model.query).toBe(query);
    expect(model.variant).toBe('counter'); expect(model.touching).toBe(true);
    expect(model.trackByItem).toBe(track); expect(model.onItemSelect).toBe(selected);
    const defaults = CalendarCardConverter.convert({viewMode, pages, calendar: null, query, variant: 'default', touching: false});
    expect(defaults.trackByItem).toBeNull(); expect(defaults.onItemSelect).toBeNull();
  });
});
