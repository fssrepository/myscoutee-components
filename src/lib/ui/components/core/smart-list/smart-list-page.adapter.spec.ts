import { smartListPageBadgeLabel } from './smart-list-page.adapter';

describe('calendar and timeline page labels', () => {
  it('preserves custom labels, primitive labels and field precedence', () => {
    expect(smartListPageBadgeLabel({ title: 'Title' }, ' Custom ')).toBe(' Custom ');
    expect(smartListPageBadgeLabel(0, null)).toBe('0');
    expect(smartListPageBadgeLabel(' Text ', '')).toBe(' Text ');
    expect(smartListPageBadgeLabel({ title: null, name: 'Name', label: 'Label' }, undefined)).toBe('Name');
    expect(smartListPageBadgeLabel({ title: '', name: 'Name' }, null)).toBe('Item');
    expect(smartListPageBadgeLabel(null, ' ')).toBe('Item');
  });
});
