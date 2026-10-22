import { describe, expect, it } from 'vitest';

import { type AppMenuItem, appMenuAlertCounter } from '../../../../../public-api';
import { buildTabbedMenuGroups } from './menu-option-groups';
import { appMenuCounterLabel, appMenuCounterVisible, appMenuTriggerIcon, appMenuTriggerTrailingIcon } from './menu-summary';

describe('shared trigger and panel presentation', () => {
  it('retains live counters, configured maxima, empty values and nonnumeric badges', () => {
    let value = 101;
    const counter = { value: () => value, max: 50 };
    expect(appMenuCounterLabel(counter)).toBe('50+');
    expect(appMenuCounterVisible(counter)).toBe(true);
    value = 2;
    expect(appMenuCounterLabel(counter)).toBe('2');
    value = 0;
    expect(appMenuCounterVisible(counter)).toBe(false);
    expect(appMenuCounterVisible(Number.NaN)).toBe(false);
    expect(appMenuCounterVisible(null)).toBe(false);
    expect(appMenuCounterLabel(null)).toBe('');
    expect(appMenuCounterLabel(' +3 ')).toBe('+3');
  });

  it('retains select, action and explicitly configured icons in both open states', () => {
    expect(appMenuTriggerIcon(null, false, true, false, 'icon')).toBe('add');
    expect(appMenuTriggerIcon(null, false, false, true, 'pill')).toBe('');
    expect(appMenuTriggerIcon({ icon: 'more_vert' }, true, false, false, 'icon')).toBe('close');
    expect(appMenuTriggerIcon({ icon: 'more_vert' }, true, false, false, 'field')).toBe('more_vert');
    expect(appMenuTriggerIcon({ icon: 'add', closeIcon: () => '' }, true, false, false, 'icon')).toBe('');
    expect(appMenuTriggerTrailingIcon(null, false, false, true, 'pill')).toBe('expand_more');
    expect(appMenuTriggerTrailingIcon({ hideLabel: true }, false, false, true, 'pill')).toBe('');
    expect(appMenuTriggerTrailingIcon({ closeTrailingIcon: () => 'close' }, true, true, true, 'pill')).toBe('close');
  });
});

describe('static menu option identities', () => {
  it('preserves normalized identities and bounds punctuation-only options', () => {
    const groups = buildTabbedMenuGroups({ idPrefix: 'test', context: option => option,
      groups: [{ title: '! Group !', options: ['--Sample--', 'First & second', '-'.repeat(50000)] }] });
    expect(groups[0].id).toBe('test-group-group');
    expect(groups[0].items?.map(item => item.id)).toEqual(['test-sample', 'test-first-second', 'test-item']);
  });
});

describe('appMenuAlertCounter', () => {
  it('aggregates red item counters for the shared three-dot trigger', () => {
    const items: AppMenuItem[] = [
      {
        id: 'view',
        counter: { value: 1, max: 99 },
        counterTone: 'alert'
      },
      {
        id: 'neutral-total',
        counter: 45,
        counterTone: 'default'
      },
      {
        id: 'runtime',
        counter: 2,
        counterTone: 'alert'
      }
    ];

    expect(appMenuAlertCounter(items)).toEqual({ value: 3, max: 99 });
  });
  it('preserves trigger image overrides and reads a live fallback label only when needed', async () => {
    const { appMenuTriggerImageAlt, appMenuTriggerImageFallback, appMenuTriggerImageUrl } = await import('./menu-summary');
    const label = vi.fn(() => ' Anna ');
    const trigger = { imageUrl: () => ' image.webp ', imageAlt: () => ' Photo ', imageFallback: () => ' A ' };
    expect(appMenuTriggerImageUrl(trigger)).toBe('image.webp');
    expect(appMenuTriggerImageAlt(trigger, label)).toBe('Photo');
    expect(appMenuTriggerImageFallback(trigger, label)).toBe('A');
    expect(label).not.toHaveBeenCalled();
    expect(appMenuTriggerImageFallback(null, label)).toBe('');
    expect(label).not.toHaveBeenCalled();
    expect(appMenuTriggerImageFallback({ imageUrl: 'image.webp' }, label)).toBe('A');
    expect(appMenuTriggerImageAlt(null, label)).toBe('Anna');
    expect(label).toHaveBeenCalledTimes(2);
  });

});
