import type { AppMenuItem, AppMenuPalette } from '../../menu/menu.types';
import { CARD_MENU_ACTIONS, type CardMenuAction, type CardMenuActionId } from './card.types';

export function buildCardMenuItems<TCard extends { menuActions?: readonly CardMenuActionId[] }>(
  card: TCard | null,
  context: Record<string, unknown> | null,
  surface: 'action' | 'tinted',
  defaultPalette: AppMenuPalette
): readonly AppMenuItem<string, Record<string, unknown>>[] {
  if (!card?.menuActions?.length) return [];
  return card.menuActions.flatMap(actionId => {
    const config = CARD_MENU_ACTIONS[actionId];
    if (!config) return [];
    const action: CardMenuAction = { id: actionId, ...config };
    return [{
      id: actionId,
      label: config.label,
      icon: config.icon,
      palette: cardMenuActionPalette(config.tone, defaultPalette),
      surface,
      context: { ...(context ?? {}), card, action }
    }];
  });
}

function cardMenuActionPalette(tone: CardMenuAction['tone'], defaultPalette: AppMenuPalette): AppMenuPalette {
  switch (tone) {
    case 'positive':
    case 'warning':
    case 'share':
      return 'teal';
    case 'accent':
      return 'brown';
    case 'review':
      return 'orange';
    case 'destructive':
      return 'danger';
    default:
      return defaultPalette;
  }
}
