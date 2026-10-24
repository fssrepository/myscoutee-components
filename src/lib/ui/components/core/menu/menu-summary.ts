import type {
  AppMenuCounter,
  AppMenuCounterValue,
  AppMenuGroup,
  AppMenuItem,
  AppMenuLiveValue,
  AppMenuModel,
  AppMenuTrigger,
  AppMenuTriggerLayout,
  AppMenuValueKey
} from './menu.types';

const CLOSE_TRIGGER_ICONS: readonly string[] = ['add', 'add_box', 'add_circle', 'more_horiz', 'more_vert'];

export interface AppMenuModelSummaryResult {
  label: string;
  counter: AppMenuCounter | AppMenuCounterValue | null;
  selectedCount: number;
}

export interface AppMenuModelSummarySelection {
  active: boolean;
  value: unknown;
  valueKey?: AppMenuValueKey | null;
}

export function appMenuModelGroups<TId extends string = string, TContext = unknown>(
  model: AppMenuModel<TId, TContext> | null | undefined,
  fallback: readonly AppMenuGroup<TId, TContext>[] = []
): readonly AppMenuGroup<TId, TContext>[] {
  return model?.groups ?? model?.nodes ?? fallback;
}

export function appMenuModelSummary<TId extends string = string, TContext = unknown>(
  model: AppMenuModel<TId, TContext> | null | undefined,
  fallbackGroups: readonly AppMenuGroup<TId, TContext>[] = [],
  selection: AppMenuModelSummarySelection | null = null
): AppMenuModelSummaryResult {
  const summary = model?.summary ?? null;
  if (!summary) {
    return {
      label: '',
      counter: null,
      selectedCount: 0
    };
  }

  const labels = appMenuSelectedLabels(appMenuModelGroups(model, fallbackGroups), selection);
  const maxLabels = Math.max(1, Math.trunc(Number(summary.maxLabels) || 1));
  const visibleLabels = labels.slice(0, maxLabels);
  const label = visibleLabels.length > 0
    ? visibleLabels.join(', ')
    : `${appMenuResolveLiveValue(summary.emptyLabel) ?? ''}`.trim();
  const counter = appMenuSummaryCounter(labels.length, maxLabels, summary.counter ?? 'overflow');

  return {
    label,
    counter,
    selectedCount: labels.length
  };
}

export function appMenuResolveLiveValue<T>(value: AppMenuLiveValue<T> | null | undefined): T | null | undefined {
  if (typeof value === 'function') {
    return (value as () => T)();
  }
  return value;
}

export function appMenuAlertCounter<TId extends string = string, TContext = unknown>(
  items: readonly AppMenuItem<TId, TContext>[] = [],
  model: AppMenuModel<TId, TContext> | null | undefined = null,
  fallbackGroups: readonly AppMenuGroup<TId, TContext>[] = []
): AppMenuCounter | AppMenuCounterValue | null {
  const visited = new Set<AppMenuItem<TId, TContext>>();
  let numericTotal = 0;
  let fallbackLabel = '';

  const collect = (item: AppMenuItem<TId, TContext>): void => {
    if (visited.has(item)) {
      return;
    }
    visited.add(item);
    if (item.counterTone === 'alert') {
      const value = appMenuCounterValue(item.counter);
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        numericTotal += Math.trunc(value);
      } else if (!fallbackLabel) {
        fallbackLabel = `${value ?? ''}`.trim();
      }
    }
    for (const child of item.items ?? []) {
      collect(child);
    }
    for (const group of appMenuModelGroups(item.model, item.groups ?? [])) {
      for (const child of group.items ?? []) {
        collect(child);
      }
    }
  };

  for (const item of items) {
    collect(item);
  }
  for (const group of appMenuModelGroups(model, fallbackGroups)) {
    for (const item of group.items ?? []) {
      collect(item);
    }
  }
  if (numericTotal > 0) {
    return { value: numericTotal, max: 99 };
  }
  return fallbackLabel || null;
}

export function appMenuCounterConfig(
  counter: AppMenuCounter | AppMenuCounterValue | null | undefined
): AppMenuCounter | null {
  if (counter === null || counter === undefined) {
    return null;
  }
  if (typeof counter === 'object' && 'value' in counter) {
    return counter;
  }
  return { value: counter };
}

export function appMenuCounterValue(counter: AppMenuCounter | AppMenuCounterValue | null | undefined): number | string | null | undefined {
  return appMenuResolveLiveValue(appMenuCounterConfig(counter)?.value ?? null);
}

export function appMenuCounterVisible(counter: AppMenuCounter | AppMenuCounterValue | null | undefined): boolean {
  const value = appMenuCounterValue(counter);
  return typeof value === 'number' ? Number.isFinite(value) && value > 0 : `${value ?? ''}`.trim().length > 0;
}

export function appMenuCounterLabel(counter: AppMenuCounter | AppMenuCounterValue | null | undefined): string {
  const value = appMenuCounterValue(counter);
  if (typeof value !== 'number') return `${value ?? ''}`.trim();
  const max = Math.max(1, Math.trunc(Number(appMenuCounterConfig(counter)?.max) || 99));
  return value > max ? `${max}+` : `${Math.trunc(value)}`;
}

export function appMenuTriggerImageUrl(trigger: AppMenuTrigger | null): string {
  return `${appMenuResolveLiveValue(trigger?.imageUrl) ?? ''}`.trim();
}

export function appMenuTriggerImageAlt(trigger: AppMenuTrigger | null, label: () => string): string {
  return `${appMenuResolveLiveValue(trigger?.imageAlt) ?? label()}`.trim();
}

export function appMenuImageLabelFallback(label: string): string {
  return Array.from(label.trim())[0]?.toLocaleUpperCase() ?? '';
}

export function appMenuTriggerImageFallback(trigger: AppMenuTrigger | null, label: () => string): string {
  const configured = `${appMenuResolveLiveValue(trigger?.imageFallback) ?? ''}`.trim();
  return configured || (appMenuTriggerImageUrl(trigger) ? appMenuImageLabelFallback(label()) : '');
}

export function appMenuTriggerIcon(
  trigger: AppMenuTrigger | null, open: boolean, fab: boolean, selectLike: boolean, layout: AppMenuTriggerLayout
): string {
  if (open) {
    const configuredOpenIcon = appMenuResolveLiveValue(trigger?.closeIcon ?? trigger?.openIcon);
    if (configuredOpenIcon !== null && configuredOpenIcon !== undefined) return `${configuredOpenIcon}`.trim();
    const baseIcon = `${appMenuResolveLiveValue(trigger?.icon) ?? ''}`.trim();
    if ((layout === 'icon' || trigger?.hideLabel === true)
        && CLOSE_TRIGGER_ICONS.includes(baseIcon)) return 'close';
    if (!baseIcon && selectLike) return '';
    return `${baseIcon || 'close'}`.trim();
  }
  const configuredIcon = appMenuResolveLiveValue(trigger?.icon);
  if (!configuredIcon && fab) return 'add';
  if (!configuredIcon && selectLike) return '';
  return `${configuredIcon ?? 'more_vert'}`.trim();
}

export function appMenuTriggerTrailingIcon(
  trigger: AppMenuTrigger | null, open: boolean, customAction: boolean, selectLike: boolean, layout: AppMenuTriggerLayout
): string {
  const configuredIcon = appMenuResolveLiveValue(open
    ? trigger?.closeTrailingIcon ?? trigger?.openTrailingIcon ?? trigger?.trailingIcon
    : trigger?.trailingIcon);
  if (configuredIcon !== null && configuredIcon !== undefined) return `${configuredIcon}`.trim();
  if (trigger?.hideLabel === true || customAction) return '';
  return selectLike && layout !== 'icon' ? 'expand_more' : '';
}

function appMenuSelectedLabels<TId extends string, TContext>(
  groups: readonly AppMenuGroup<TId, TContext>[],
  selection: AppMenuModelSummarySelection | null
): string[] {
  const selectedLabels: string[] = [];
  const seenLabels = new Set<string>();
  for (const group of groups) {
    for (const item of group.items ?? []) {
      collectSelectedItemLabels(item, selectedLabels, seenLabels, selection);
    }
  }
  return selectedLabels;
}

function collectSelectedItemLabels<TId extends string, TContext>(
  item: AppMenuItem<TId, TContext>,
  selectedLabels: string[],
  seenLabels: Set<string>,
  selection: AppMenuModelSummarySelection | null
): void {
  const kind = item.kind ?? 'action';
  if (kind !== 'divider' && kind !== 'section' && isActiveItem(item, selection)) {
    const label = `${appMenuResolveLiveValue(item.label) ?? ''}`.trim();
    const key = label.toLowerCase();
    if (label && !seenLabels.has(key)) {
      selectedLabels.push(label);
      seenLabels.add(key);
    }
  }
  for (const child of item.items ?? []) {
    collectSelectedItemLabels(child, selectedLabels, seenLabels, selection);
  }
  for (const group of appMenuModelGroups(item.model, item.groups ?? [])) {
    for (const child of group.items ?? []) {
      collectSelectedItemLabels(child, selectedLabels, seenLabels, selection);
    }
  }
}

function isActiveItem<TId extends string, TContext>(
  item: AppMenuItem<TId, TContext>,
  selection: AppMenuModelSummarySelection | null
): boolean {
  return appMenuResolveLiveValue(item.active) === true
    || appMenuResolveLiveValue(item.checked) === true
    || isSelectedByValue(item, selection);
}

function isSelectedByValue<TId extends string, TContext>(
  item: AppMenuItem<TId, TContext>,
  selection: AppMenuModelSummarySelection | null
): boolean {
  if (!selection?.active) {
    return false;
  }
  const itemValue = item.value !== undefined ? item.value : item.id;
  const selectedValue = selection.value;
  if (Array.isArray(selectedValue)) {
    return selectedValue.some(value => appMenuValuesEqual(value, itemValue, selection.valueKey));
  }
  return appMenuValuesEqual(selectedValue, itemValue, selection.valueKey);
}

function appMenuValuesEqual(first: unknown, second: unknown, valueKey: AppMenuValueKey | null | undefined): boolean {
  if (!valueKey) {
    return Object.is(first, second);
  }
  return Object.is(appMenuValueIdentity(first, valueKey), appMenuValueIdentity(second, valueKey));
}

export function appMenuValueIdentity(value: unknown, valueKey: AppMenuValueKey): unknown {
  if (typeof valueKey === 'function') {
    return valueKey(value);
  }
  if (value && typeof value === 'object' && valueKey in value) {
    return (value as Record<string, unknown>)[valueKey];
  }
  return value;
}

function appMenuSummaryCounter(
  selectedCount: number,
  maxLabels: number,
  mode: 'overflow' | 'count' | 'none'
): AppMenuCounterValue | null {
  if (selectedCount <= 0 || mode === 'none') {
    return null;
  }
  if (mode === 'count') {
    return selectedCount;
  }
  const overflow = selectedCount - maxLabels;
  return overflow > 0 ? `+${overflow}` : null;
}

/** Current menu inventory for the guide, including items in unopened branches. */
export function appMenuGuideItemIds(
  items: readonly AppMenuItem[] = [], model: AppMenuModel | null = null,
  groups: readonly AppMenuGroup[] = []
): string {
  const ids = new Set<string>();
  const visit = (item: AppMenuItem): void => {
    const id = item.guideId ?? item.id;
    if (ids.has(id)) return;
    ids.add(id);
    for (const child of item.items ?? []) visit(child);
    for (const group of appMenuModelGroups(item.model, item.groups ?? [])) {
      for (const child of group.items ?? []) visit(child);
    }
  };
  for (const item of items) visit(item);
  for (const group of appMenuModelGroups(model, groups)) for (const item of group.items ?? []) visit(item);
  return [...ids].join('\n');
}
