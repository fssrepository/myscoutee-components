import { buildCardMenuItems } from './card-menu.helpers';

describe('shared card action menus', () => {
  it.each([['action', 'blue'], ['tinted', 'default']] as const)('keeps %s surfaces, palettes and action contexts', (surface, palette) => {
    const card = { id: 'card', menuActions: ['edit', 'delete', 'addOrganizerNote', 'not-an-action', 'feature'] };
    const items = buildCardMenuItems(card, { source: 'list', card: 'old', action: 'old' }, surface, palette);
    expect(items.map(item => item.id)).toEqual(['edit', 'delete', 'addOrganizerNote', 'feature']);
    expect(items.map(item => item.palette)).toEqual(['brown', 'danger', palette, 'brown']);
    for (const item of items) {
      expect(item.surface).toBe(surface);
      expect(item.context).toMatchObject({ source: 'list', card, action: { id: item.id } });
      expect(item.context!.card).toBe(card);
    }
    expect(buildCardMenuItems(null, null, surface, palette)).toEqual([]);
  });
});
