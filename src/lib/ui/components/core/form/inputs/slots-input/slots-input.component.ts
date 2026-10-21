import { type SlotTemplate, normalizeSlotTemplates, normalizeSlotOverrideDate, normalizeScheduleFrequency } from '../../../../../../foundation/slot-template';
import { UiDateUtils } from '../../../../../../foundation/date-utils';
import { AppMenuComponent } from '../../../menu/menu.component';
import { type AppMenuItem, type AppMenuItemSelectEvent, type AppMenuPalette, type AppMenuTrigger } from '../../../menu/menu.types';
import { TextCardComponent, type TextCardTone } from '../../../smart-list/card/text-card/text-card.component';
import { FormFlowComponent } from '../../flow/form-flow.component';
import { type FormFlowControlModel, type FormFlowModel } from '../../flow/form-flow.types';
import { PopupComponent } from '../../../popup/popup.component';
import { type PopupModel } from '../../../popup/popup.types';
import { I18nPipe } from '../../../../../../pipes/i18n.pipe';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, EventEmitter, forwardRef, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';


/** Shared by schedule choices and read-only frequency badges. */
export function scheduleFrequencyPalette(frequency: string): Extract<AppMenuPalette, 'blue' | 'green' | 'cyan' | 'violet' | 'amber' | 'gold'> {
  if (frequency.trim().toLowerCase() === 'quarterly') return 'violet';
  switch (normalizeScheduleFrequency(frequency)) {
    case 'Daily': return 'green';
    case 'Weekly': return 'cyan';
    case 'Bi-weekly': return 'violet';
    case 'Monthly': return 'amber';
    case 'Yearly': return 'gold';
    default: return 'blue';
  }
}

export type SlotsInputConfigValue<TValue> = TValue | (() => TValue);
export type SlotsInputEditorMode = 'base' | 'date';

export interface SlotsInputLabels {
  slotsDisabledDescription: string;
  slotsTimePending: string;
  slotsAddBaseAria: string;
  scheduleEdit: string;
  scheduleAdd: string;
  scheduleEditDescription: string;
  scheduleAddDescription: string;
  scheduleCloseAria: string;
  scheduleSaveAria: string;
  scheduleAddAria: string;
  slotsTitle: string;
  slotsSubtitle: string;
  startFrom: string;
  scheduleStartTime: string;
  slotsToggleAria: string;
  slotsEmpty: string;
}

const DEFAULT_SLOTS_LABELS: SlotsInputLabels = {
  'slotsDisabledDescription': 'slots.disabled.description',
  'slotsTimePending': 'slots.time.pending',
  'slotsAddBaseAria': 'slots.base.add.aria',
  'scheduleEdit': 'schedule.edit.title',
  'scheduleAdd': 'schedule.add.title',
  'scheduleEditDescription': 'schedule.edit.description',
  'scheduleAddDescription': 'schedule.add.description',
  'scheduleCloseAria': 'schedule.close.aria',
  'scheduleSaveAria': 'schedule.save.aria',
  'scheduleAddAria': 'schedule.add.aria',
  'slotsTitle': 'slots.title',
  'slotsSubtitle': 'slots.subtitle',
  'startFrom': 'schedule.start.from',
  'scheduleStartTime': 'schedule.start.time',
  'slotsToggleAria': 'slots.toggle.aria',
  'slotsEmpty': 'slots.empty.description'
};

export interface SlotsInputConfig {
  labels?: Partial<SlotsInputLabels>;
  frequencyLabel?: (frequency: string) => string;
  /** Consumer normalization for additional slot metadata. */
  normalizeTemplates?: (items: readonly SlotTemplate[]) => SlotTemplate[];
  /** Reuse the schedule popup for one recurring task, without slot rows. */
  scheduleOnly?: boolean;
  scheduleChange?: (value: { frequency: string; startAtIso: string }) => void;
  enabled?: SlotsInputConfigValue<boolean | null | undefined>;
  enabledChange?: (enabled: boolean) => void;
  startAtIso?: SlotsInputConfigValue<string | null | undefined>;
  endAtIso?: SlotsInputConfigValue<string | null | undefined>;
  frequency?: SlotsInputConfigValue<string | null | undefined>;
  frequencyOptions?: SlotsInputConfigValue<readonly string[] | null | undefined>;
  frequencyChange?: (frequency: string) => void;
  generated?: SlotsInputConfigValue<boolean | null | undefined>;
  title?: SlotsInputConfigValue<string>;
  subtitle?: SlotsInputConfigValue<string>;
}

export interface SlotOverrideRequest {
  slot: SlotTemplate;
  slotIndex: number;
}

interface ResolvedSlotsInputConfig {
  startAtIso: string;
  endAtIso: string;
  frequency: string;
  frequencyOptions: readonly string[];
  enabled: boolean;
  generated: boolean;
  title: string;
  subtitle: string;
}

interface SlotScheduleFormValue {
  frequency: string;
  startAt: string;
  time: string;
  weekday: string;
  day: number;
  month: string;
}

@Component({
  selector: 'app-slots-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    AppMenuComponent,
    PopupComponent,
    TextCardComponent,
    FormFlowComponent,
    I18nPipe
  ],
  templateUrl: './slots-input.component.html',
  styleUrl: './slots-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SlotsInputComponent),
      multi: true
    }
  ]
})
export class SlotsInputComponent implements OnChanges, DoCheck, ControlValueAccessor {
  @Input() config: SlotsInputConfig = {};
  @Input() popupZIndex = 2600;
  @Input() readOnly = false;
  @Input() disabled = false;
  @Output() readonly overrideSelect = new EventEmitter<SlotOverrideRequest>();

  protected slotTemplates: SlotTemplate[] = [];
  protected showSchedulePopup = false;
  protected schedulePopupMode: 'create' | 'edit' = 'create';
  protected resolvedConfig: ResolvedSlotsInputConfig = this.resolveConfig();
  protected scheduleFlowValue: SlotScheduleFormValue = this.createScheduleFlowValue();

  private resolvedConfigSignature = this.buildResolvedConfigSignature(this.resolvedConfig);
  private scheduleFlowModelCache: { signature: string; model: FormFlowModel } | null = null;
  private scheduleEditIndex: number | null = null;
  private onModelChange: (value: SlotTemplate[]) => void = () => {};
  private onModelTouched: () => void = () => {};

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.syncResolvedConfig();
      this.cdr.markForCheck();
    }
  }

  ngDoCheck(): void {
    this.syncResolvedConfig();
  }

  writeValue(value: readonly SlotTemplate[] | null | undefined): void {
    this.slotTemplates = this.normalizeTemplates(value ?? []);
    this.normalizeSlotTemplatesForConfig(false);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: SlotTemplate[]) => void): void {
    this.onModelChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onModelTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readOnly = isDisabled;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    if (this.showSchedulePopup) {
      event.preventDefault();
      this.closeSchedulePopup();
    }
  }

  private normalizeTemplates(items: readonly SlotTemplate[]): SlotTemplate[] {
    return (this.config.normalizeTemplates ?? normalizeSlotTemplates)(items);
  }

  private normalizeFrequency(value: unknown): string {
    if (this.config.scheduleOnly && String(value).toLowerCase() === 'quarterly') return 'Quarterly';
    return normalizeScheduleFrequency(value);
  }
  openScheduleEditor(): void {
    if (!this.canUpdateSlotsConfig()) return;
    this.openSchedulePopup(); this.cdr.markForCheck();
  }
  protected shouldShowPanel(): boolean {
    return !this.config.scheduleOnly && (this.canUpdateSlotsConfig() || this.slotsEnabled());
  }

  protected canUpdateSlotsConfig(): boolean {
    return !this.readOnly && !this.disabled && !this.resolvedConfig.generated;
  }

  protected canConfigureSlotsSeries(): boolean {
    return this.canUpdateSlotsConfig() && (this.config.scheduleOnly === true || this.resolvedConfig.enabled);
  }

  protected slotsEnabled(): boolean {
    return this.resolvedConfig.enabled;
  }

  protected slotsPanelSubtitle(): string {
    return this.slotsEnabled()
      ? this.resolvedConfig.subtitle
      : this.slotLabel('slotsDisabledDescription');
  }

  protected toggleSlotsEnabled(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canUpdateSlotsConfig()) {
      return;
    }
    this.setSlotsEnabled(!this.resolvedConfig.enabled);
  }

  protected slotSummaryBaseItems(): SlotTemplate[] {
    return this.baseSlotTemplates();
  }

  protected slotSummaryWindowLabel(slot: SlotTemplate): string {
    const start = this.parseDateValue(slot.startAt);
    if (!start) {
      return this.slotLabel('slotsTimePending');
    }
    const overrideCount = this.slotOverrideCount(slot);
    const overrideSuffix = overrideCount > 0
      ? ` · ${overrideCount} ${overrideCount === 1 ? 'override' : 'overrides'}`
      : '';
    if (normalizeSlotOverrideDate(slot.overrideDate)) {
      return `Starts ${this.formatSlotDateTimeLabel(start)}${overrideSuffix}`;
    }
    return `${this.formatRecurringSlotLabel(start)}${overrideSuffix}`;
  }

  protected slotSummaryCardTone(_slot: SlotTemplate): TextCardTone {
    const frequency = this.normalizeFrequency(this.resolvedConfig.frequency);
    if (frequency === 'Daily') {
      return 'green';
    }
    if (frequency === 'Weekly' || frequency === 'Bi-weekly') {
      return frequency === 'Bi-weekly' ? 'violet' : 'cyan';
    }
    if (frequency === 'Monthly') {
      return 'amber';
    }
    if (frequency === 'Yearly') {
      return 'gold';
    }
    return 'blue';
  }

  protected slotSummaryMenuPalette(_slot: SlotTemplate): AppMenuPalette {
    const frequency = this.normalizeFrequency(this.resolvedConfig.frequency);
    return this.scheduleFrequencyPalette(frequency);
  }

  protected slotOverrideCount(slot: SlotTemplate): number {
    const slotId = `${slot.id ?? ''}`.trim();
    if (!slotId) {
      return 0;
    }
    const overridePrefix = `${slotId}-override-`;
    return this.slotTemplates.filter(item => {
      if (!normalizeSlotOverrideDate(item.overrideDate)) {
        return false;
      }
      const itemId = `${item.id ?? ''}`.trim();
      return itemId === slotId || itemId.startsWith(overridePrefix);
    }).length;
  }

  protected slotSummaryAddMenuItems(): readonly AppMenuItem<string, unknown>[] {
    if (!this.canConfigureSlotsSeries()) {
      return [];
    }
    return [{
      id: 'add',
      icon: 'add',
      ariaLabel: this.slotLabel('slotsAddBaseAria'),
      palette: 'amber'
    }];
  }

  protected onSlotSummaryAddSelect(event: AppMenuItemSelectEvent<string, unknown>): void {
    if (event.id !== 'add') {
      return;
    }
    this.addBaseSlotFromPanel(event.sourceEvent);
  }

  protected slotSummaryMenuItems(slot?: SlotTemplate): readonly AppMenuItem<string, unknown>[] {
    if (!this.canConfigureSlotsSeries()) {
      return [];
    }
    const overrideCount = slot ? this.slotOverrideCount(slot) : 0;
    return [
      {
        id: 'edit',
        label: 'edit',
        icon: 'edit',
        palette: 'blue',
        surface: 'tinted'
      },
      {
        id: 'override',
        label: 'override',
        icon: 'published_with_changes',
        palette: 'violet',
        surface: 'tinted',
        counter: overrideCount > 0 ? { value: overrideCount, max: 9 } : null
      },
      {
        id: 'delete',
        label: 'delete',
        icon: 'delete',
        palette: 'danger',
        surface: 'tinted'
      }
    ];
  }

  protected onBaseSlotSummaryMenuSelect(
    index: number,
    event: AppMenuItemSelectEvent<string, unknown>
  ): void {
    event.sourceEvent.preventDefault();
    event.sourceEvent.stopPropagation();
    switch (event.id) {
      case 'edit':
        this.openBaseSlotEditor(index, event.sourceEvent);
        break;
      case 'override':
        this.openBaseSlotOverride(index, event.sourceEvent);
        break;
      case 'delete':
        this.removeBaseSlotFromPanel(index, event.sourceEvent);
        break;
      default:
        break;
    }
  }

  protected addBaseSlotFromPanel(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canConfigureSlotsSeries()) {
      return;
    }
    this.openSchedulePopup();
    this.cdr.markForCheck();
  }

  private openBaseSlotEditor(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.openSchedulePopup(index);
  }

  private openBaseSlotOverride(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canConfigureSlotsSeries()) {
      return;
    }
    const slot = this.baseSlotTemplates()[index];
    if (!slot) {
      return;
    }
    this.overrideSelect.emit({ slot: { ...slot }, slotIndex: index });
  }

  protected schedulePopupTitle(): string {
    return this.config.scheduleOnly ? this.resolvedConfig.title : this.schedulePopupMode === 'edit' ? this.slotLabel('scheduleEdit') : this.slotLabel('scheduleAdd');
  }

  protected schedulePopupSubtitle(): string {
    if (this.config.scheduleOnly) return '';
    return this.schedulePopupMode === 'edit'
      ? this.slotLabel('scheduleEditDescription')
      : this.slotLabel('scheduleAddDescription');
  }

  protected schedulePopupModel(): PopupModel<unknown> {
    return {
      title: this.schedulePopupTitle(),
      subtitle: this.schedulePopupSubtitle(),
      ariaLabel: this.schedulePopupTitle(),
      closeAriaLabel: this.slotLabel('scheduleCloseAria'),
      closeOnBackdrop: true,
      size: 'default',
      height: 'auto',
      headerTone: 'accent',
      bodyLayout: 'overflow',
      backdropTone: 'dim',
      headerActions: [
        {
          id: this.schedulePopupMode === 'edit' ? 'save-schedule' : 'add-schedule',
          icon: 'check',
          ariaLabel: this.schedulePopupMode === 'edit' ? this.slotLabel('scheduleSaveAria') : this.slotLabel('scheduleAddAria'),
          palette: 'green',
          disabled: !this.canConfigureSlotsSeries()
        }
      ],
      onClose: () => this.closeSchedulePopup(),
      onAction: event => this.confirmSchedulePopup(event.sourceEvent)
    };
  }

  protected closeSchedulePopup(): void {
    this.showSchedulePopup = false;
    this.schedulePopupMode = 'create';
    this.scheduleEditIndex = null;
    this.cdr.markForCheck();
  }

  protected scheduleFrequencyLocked(): boolean {
    return !this.config.scheduleOnly && this.baseSlotTemplates().length > 0;
  }

  protected scheduleFlowModel(): FormFlowModel {
    const signature = this.scheduleFlowModelSignature();
    if (this.scheduleFlowModelCache?.signature === signature) {
      return this.scheduleFlowModelCache.model;
    }
    const model: FormFlowModel = {
      title: this.slotLabel('scheduleAdd'),
      header: false,
      layout: 'grouped',
      allowMenuOverflow: true,
      summary: { enabled: false },
      save: null,
      completion: { controls: 'none' },
      steps: [
        {
          id: 'schedule',
          title: '',
          controls: [
            {
              id: 'frequency',
              guideFieldId: 'frequency',
              bind: 'frequency',
              kind: 'menu',
              layout: 'wide',
              label: 'frequency',
              disabled: this.scheduleFrequencyLocked(),
              config: {
                kind: 'select',
                layout: 'row',
                panelMode: 'auto',
                closeOnSelect: true,
                trigger: this.scheduleFrequencyMenuTrigger(),
                items: this.scheduleFrequencyMenuItems()
              }
            },
            ...this.scheduleTimeControls()
          ]
        }
      ]
    };
    this.scheduleFlowModelCache = { signature, model };
    return model;
  }

  private scheduleFlowModelSignature(): string {
    return JSON.stringify({
      frequency: this.normalizeFrequency(this.scheduleFlowValue.frequency),
      month: this.scheduleFlowValue.month,
      locked: this.scheduleFrequencyLocked(),
      startAtIso: this.resolvedConfig.startAtIso,
      endAtIso: this.resolvedConfig.endAtIso,
      options: this.scheduleFrequencyOptions()
    });
  }

  protected onScheduleFlowValueChange(value: unknown): void {
    const previousFrequency = this.normalizeFrequency(this.scheduleFlowValue.frequency);
    const nextValue = this.normalizeScheduleFlowValue(value);
    if (this.scheduleFrequencyLocked()) {
      nextValue.frequency = this.scheduleFlowValue.frequency;
    }
    const nextFrequency = this.normalizeFrequency(nextValue.frequency);
    if (!this.config.scheduleOnly && nextFrequency !== previousFrequency) {
      const nextStartAt = this.buildScheduleDraftStartAt(nextFrequency, nextValue);
      this.scheduleFlowValue = this.scheduleFlowValueFromDate(nextFrequency, this.parseDateValue(nextStartAt) ?? new Date());
      this.cdr.markForCheck();
      return;
    }
    this.scheduleFlowValue = nextValue;
    this.cdr.markForCheck();
  }

  protected confirmSchedulePopup(event?: Event | AppMenuItemSelectEvent<string, unknown>): void {
    const sourceEvent = event && 'sourceEvent' in event ? event.sourceEvent : event;
    sourceEvent?.preventDefault();
    sourceEvent?.stopPropagation();
    this.createScheduleFromPopup();
  }

  protected scheduleFrequencyOptions(): readonly string[] {
    return this.config.scheduleOnly ? this.resolvedConfig.frequencyOptions : this.resolvedConfig.frequencyOptions.filter(item => this.normalizeFrequency(item) !== 'One-time');
  }

  private createScheduleFromPopup(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canConfigureSlotsSeries()) {
      return;
    }
    const draft = this.normalizeScheduleFlowValue(this.scheduleFlowValue);
    const frequency = this.normalizeFrequency(draft.frequency);
    if (this.config.scheduleOnly) {
      const startAt = this.parseDateValue(draft.startAt); if (!startAt) return;
      this.config.scheduleChange?.({ frequency, startAtIso: startAt.toISOString() });
      this.closeSchedulePopup(); return;
    }
    if (!this.scheduleFrequencyLocked()) {
      this.setFrequency(frequency);
    }
    const startAt = this.buildScheduleDraftStartAt(frequency, draft);
    const currentTemplates = this.baseSlotTemplates();
    const editIndex = this.scheduleEditIndex;
    if (editIndex !== null && editIndex >= 0 && editIndex < currentTemplates.length) {
      this.setActiveSlotTemplates(currentTemplates.map((item, index) => index === editIndex
        ? {
          ...item,
          startAt,
          overrideDate: null,
          closed: false
        }
        : item));
    } else {
      const nextIndex = currentTemplates.length + 1;
      this.setActiveSlotTemplates([
        ...currentTemplates,
        {
          id: this.buildSlotTemplateId(nextIndex),
          startAt,
          overrideDate: null,
          closed: false
        }
      ]);
    }
    this.closeSchedulePopup();
  }

  protected removeBaseSlotFromPanel(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canConfigureSlotsSeries() || index < 0) {
      return;
    }
    this.setActiveSlotTemplates(this.baseSlotTemplates()
      .filter((_, currentIndex) => currentIndex !== index)
      .map((item, currentIndex) => ({
        ...item,
        id: item.id?.trim() || this.buildSlotTemplateId(currentIndex + 1),
        overrideDate: null,
        closed: false
      })));
    this.cdr.markForCheck();
  }

  private formatRecurringSlotLabel(start: Date): string {
    const time = this.formatSlotTimeLabel(start);
    switch (this.resolvedConfig.frequency) {
      case 'Daily':
        return `Every day at ${time}`;
      case 'Weekly':
        return `Every ${this.formatSlotWeekday(start)} at ${time}`;
      case 'Bi-weekly':
        return `Every second ${this.formatSlotWeekday(start)} at ${time}`;
      case 'Monthly':
        return `Every month on day ${start.getDate()} at ${time}`;
      case 'Yearly':
        return `Every year on ${this.formatSlotMonthDay(start)} at ${time}`;
      default:
        return `Starts ${this.formatSlotDateTimeLabel(start)}`;
    }
  }

  private formatSlotTimeLabel(value: Date): string {
    return value.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private formatSlotWeekday(value: Date): string {
    return value.toLocaleDateString('en-US', {
      weekday: 'long'
    });
  }

  private formatSlotMonthDay(value: Date): string {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  protected slotTrackId(index: number, slot: SlotTemplate): string {
    return `${slot.overrideDate ?? 'base'}:${slot.id || `slot-${index + 1}`}:${slot.startAt}`;
  }

  protected slotTemplateLabel(index: number): string {
    return `Slot ${index + 1}`;
  }

  private syncResolvedConfig(): void {
    const nextConfig = this.resolveConfig();
    const nextSignature = this.buildResolvedConfigSignature(nextConfig);
    if (nextSignature === this.resolvedConfigSignature) {
      return;
    }
    this.resolvedConfig = nextConfig;
    this.resolvedConfigSignature = nextSignature;
    this.normalizeSlotTemplatesForConfig(true);
    this.cdr.markForCheck();
  }

  private resolveConfig(): ResolvedSlotsInputConfig {
    const frequency = this.normalizeFrequency(this.resolveConfigValue(this.config.frequency, 'One-time'));
    const frequencyOptions = this.resolveFrequencyOptions(this.resolveConfigValue(this.config.frequencyOptions, null));
    const configuredEnabled = this.resolveConfigValue(this.config.enabled, null);
    return {
      startAtIso: `${this.resolveConfigValue(this.config.startAtIso, '') ?? ''}`.trim(),
      endAtIso: `${this.resolveConfigValue(this.config.endAtIso, '') ?? ''}`.trim(),
      frequency,
      frequencyOptions,
      enabled: configuredEnabled === null || configuredEnabled === undefined ? frequency !== 'One-time' : configuredEnabled === true,
      generated: this.resolveConfigValue(this.config.generated, false) === true,
      title: this.resolveConfigValue(this.config.title, this.slotLabel('slotsTitle')),
      subtitle: this.resolveConfigValue(this.config.subtitle, this.slotLabel('slotsSubtitle'))
    };
  }

  private resolveConfigValue<TValue>(
    value: SlotsInputConfigValue<TValue> | null | undefined,
    fallback: TValue
  ): TValue {
    if (typeof value === 'function') {
      return (value as () => TValue)() ?? fallback;
    }
    return value ?? fallback;
  }

  private resolveFrequencyOptions(value: readonly string[] | null | undefined): readonly string[] {
    const options = (value?.length ? value : ['Custom', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly'])
      .map(item => this.normalizeFrequency(item));
    return Array.from(new Set(options));
  }

  private buildResolvedConfigSignature(config: ResolvedSlotsInputConfig): string {
    return JSON.stringify(config);
  }

  private setFrequency(value: string): void {
    if (!this.canUpdateSlotsConfig()) {
      return;
    }
    const normalized = this.normalizeFrequency(value);
    this.config.frequencyChange?.(normalized);
    this.onModelTouched();
    this.syncResolvedConfig();
  }

  private setSlotsEnabled(value: boolean): void {
    if (!this.canUpdateSlotsConfig()) {
      return;
    }
    this.config.enabledChange?.(value);
    if (!value) {
      this.showSchedulePopup = false;
    }
    this.onModelTouched();
    this.syncResolvedConfig();
  }

  private defaultEnabledFrequency(): string {
    return this.scheduleFrequencyOptions()[0] ?? 'Custom';
  }

  private openSchedulePopup(index: number | null = null): void {
    const currentTemplates = this.baseSlotTemplates();
    const editSlot = index !== null ? currentTemplates[index] : null;
    const seedDate = this.parseDateValue(this.config.scheduleOnly ? this.resolvedConfig.startAtIso : editSlot?.startAt) ?? this.defaultScheduleDraftDate();
    const currentFrequency = this.normalizeFrequency(this.resolvedConfig.frequency);
    this.scheduleEditIndex = editSlot ? index : null;
    this.schedulePopupMode = editSlot ? 'edit' : 'create';
    this.scheduleFlowValue = this.scheduleFlowValueFromDate(
      !this.config.scheduleOnly && currentFrequency === 'One-time' ? this.defaultEnabledFrequency() : currentFrequency,
      seedDate
    );
    this.showSchedulePopup = true;
    this.onModelTouched();
  }

  private createScheduleFlowValue(): SlotScheduleFormValue {
    return this.scheduleFlowValueFromDate(
      this.defaultEnabledFrequency(),
      this.parseDateValue(this.resolvedConfig.startAtIso) ?? new Date()
    );
  }

  private normalizeScheduleFlowValue(value: unknown): SlotScheduleFormValue {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const frequency = this.normalizeFrequency(record['frequency']);
    const startAt = `${record['startAt'] ?? ''}`.trim()
      || UiDateUtils.toIsoDateTimeLocal(this.defaultScheduleDraftDate());
    const baseDate = this.parseDateValue(startAt) ?? this.defaultScheduleDraftDate();
    const normalizedFrequency = !this.config.scheduleOnly && frequency === 'One-time' ? this.defaultEnabledFrequency() : frequency;
    const month = this.normalizeScheduleMonth(record['month'], baseDate);
    const day = this.normalizeScheduleDay(record['day'], normalizedFrequency, month, baseDate);
    return {
      frequency: normalizedFrequency,
      startAt,
      time: this.normalizeScheduleTime(record['time'], baseDate),
      weekday: this.normalizeScheduleWeekday(record['weekday'], baseDate),
      day,
      month
    };
  }

  private scheduleFlowValueFromDate(frequency: string, date: Date): SlotScheduleFormValue {
    const normalizedFrequency = this.normalizeFrequency(frequency);
    const month = `${date.getMonth() + 1}`;
    return {
      frequency: !this.config.scheduleOnly && normalizedFrequency === 'One-time' ? this.defaultEnabledFrequency() : normalizedFrequency,
      startAt: UiDateUtils.toIsoDateTimeLocal(date),
      time: this.formatScheduleTimeInput(date),
      weekday: `${date.getDay()}`,
      day: date.getDate(),
      month
    };
  }

  private scheduleFrequencyMenuTrigger(): AppMenuTrigger {
    return {
      id: 'schedule-frequency',
      label: 'frequency',
      icon: 'event',
      trailingIcon: 'expand_more',
      layout: 'field',
      disabled: this.scheduleFrequencyLocked()
    };
  }

  private scheduleTimeControls(): FormFlowControlModel[] {
    if(this.config.scheduleOnly)return [{id:'startAt',guideFieldId:'startAt',bind:'startAt',kind:'date',layout:'wide',label:this.slotLabel('startFrom'),required:true,
      config:{model:{mode:'single',precision:'minute',valueFormat:'iso-date-time',field:{label:this.slotLabel('startFrom'),required:true}}}}];
    switch (this.normalizeFrequency(this.scheduleFlowValue.frequency)) {
      case 'Custom':
        return [{
          id: 'startAt',
          bind: 'startAt',
          kind: 'date',
          layout: 'wide',
          label: 'start',
          required: true,
          config: {
            model: {
              mode: 'single',
              precision: 'minute',
              valueFormat: 'iso-date-time',
              field: {
                label: 'start',
                required: true,
                min: this.resolvedConfig.startAtIso || null,
                max: this.resolvedConfig.endAtIso || null
              }
            }
          }
        }];
      case 'Daily':
        return [this.scheduleTimeControl('time', this.slotLabel('scheduleStartTime'), 'wide')];
      case 'Weekly':
      case 'Bi-weekly':
        return [
          this.scheduleWeekdayControl(),
          this.scheduleTimeControl('time', this.slotLabel('scheduleStartTime'))
        ];
      case 'Monthly':
        return [
          this.scheduleDayControl(),
          this.scheduleTimeControl('time', this.slotLabel('scheduleStartTime'))
        ];
      case 'Yearly':
        return [
          this.scheduleMonthControl(),
          this.scheduleDayControl(),
          this.scheduleTimeControl('time', this.slotLabel('scheduleStartTime'), 'wide')
        ];
      default:
        return [this.scheduleTimeControl('time', this.slotLabel('scheduleStartTime'), 'wide')];
    }
  }

  private scheduleTimeControl(id: string, label: string, layout: FormFlowControlModel['layout'] = 'half'): FormFlowControlModel {
    return {
      id,
      bind: id,
      kind: 'date',
      layout,
      label,
      required: true,
      config: {
        model: {
          mode: 'time',
          precision: 'minute',
          field: {
            label,
            required: true
          }
        }
      }
    };
  }

  private scheduleWeekdayControl(): FormFlowControlModel {
    return {
      id: 'weekday',
      bind: 'weekday',
      kind: 'menu',
      layout: 'half',
      label: 'day',
      required: true,
      config: {
        kind: 'select',
        layout: 'row',
        panelMode: 'auto',
        closeOnSelect: true,
        trigger: {
          id: 'schedule-weekday',
          label: 'day',
          icon: 'calendar_view_week',
          trailingIcon: 'expand_more',
          layout: 'field'
        },
        items: this.scheduleWeekdayMenuItems()
      }
    };
  }

  private scheduleDayControl(): FormFlowControlModel {
    return {
      id: 'day',
      bind: 'day',
      kind: 'number',
      layout: 'half',
      label: 'day',
      required: true,
      min: 1,
      max: this.scheduleDayMax(),
      step: 1
    };
  }

  private scheduleMonthControl(): FormFlowControlModel {
    return {
      id: 'month',
      bind: 'month',
      kind: 'menu',
      layout: 'half',
      label: 'month',
      required: true,
      config: {
        kind: 'select',
        layout: 'row',
        panelMode: 'auto',
        closeOnSelect: true,
        trigger: {
          id: 'schedule-month',
          label: 'month',
          icon: 'calendar_month',
          trailingIcon: 'expand_more',
          layout: 'field'
        },
        items: this.scheduleMonthMenuItems()
      }
    };
  }

  private scheduleWeekdayMenuItems(): readonly AppMenuItem<string, unknown>[] {
    return [
      ['0', 'Sunday'],
      ['1', 'Monday'],
      ['2', 'Tuesday'],
      ['3', 'Wednesday'],
      ['4', 'Thursday'],
      ['5', 'Friday'],
      ['6', 'Saturday']
    ].map(([value, label]) => ({
      id: value,
      value,
      kind: 'radio',
      label,
      icon: this.scheduleWeekdayIcon(Number(value)),
      palette: this.scheduleWeekdayPalette(Number(value)),
      surface: 'tinted'
    }));
  }

  private scheduleWeekdayIcon(weekday: number): string {
    switch (weekday) {
      case 0:
        return 'wb_sunny';
      case 1:
        return 'work_history';
      case 2:
        return 'bolt';
      case 3:
        return 'calendar_view_week';
      case 4:
        return 'explore';
      case 5:
        return 'celebration';
      case 6:
        return 'weekend';
      default:
        return 'calendar_view_week';
    }
  }

  private scheduleWeekdayPalette(weekday: number): AppMenuPalette {
    switch (weekday) {
      case 0:
        return 'gold';
      case 1:
        return 'blue';
      case 2:
        return 'orange';
      case 3:
        return 'cyan';
      case 4:
        return 'violet';
      case 5:
        return 'pink';
      case 6:
        return 'teal';
      default:
        return 'cyan';
    }
  }

  private scheduleMonthMenuItems(): readonly AppMenuItem<string, unknown>[] {
    return [
      ['1', 'January'],
      ['2', 'February'],
      ['3', 'March'],
      ['4', 'April'],
      ['5', 'May'],
      ['6', 'June'],
      ['7', 'July'],
      ['8', 'August'],
      ['9', 'September'],
      ['10', 'October'],
      ['11', 'November'],
      ['12', 'December']
    ].map(([value, label]) => {
      const zodiac = this.scheduleMonthZodiac(value);
      return {
        id: value,
        value,
        kind: 'radio',
        label,
        icon: zodiac.icon,
        palette: zodiac.palette,
        surface: 'tinted'
      };
    });
  }

  private scheduleMonthZodiac(value: string): { icon: string; palette: AppMenuPalette } {
    switch (value) {
      case '1':
        return { icon: '♑', palette: 'capricorn' };
      case '2':
        return { icon: '♒', palette: 'aquarius' };
      case '3':
        return { icon: '♓', palette: 'pisces' };
      case '4':
        return { icon: '♈', palette: 'aries' };
      case '5':
        return { icon: '♉', palette: 'taurus' };
      case '6':
        return { icon: '♊', palette: 'gemini' };
      case '7':
        return { icon: '♋', palette: 'cancer' };
      case '8':
        return { icon: '♌', palette: 'leo' };
      case '9':
        return { icon: '♍', palette: 'virgo' };
      case '10':
        return { icon: '♎', palette: 'libra' };
      case '11':
        return { icon: '♏', palette: 'scorpio' };
      case '12':
        return { icon: '♐', palette: 'sagittarius' };
      default:
        return { icon: 'calendar_month', palette: 'amber' };
    }
  }

  private scheduleFrequencyMenuItems(): readonly AppMenuItem<string, unknown>[] {
    return this.scheduleFrequencyOptions().map(frequency => {
      const normalized = this.normalizeFrequency(frequency);
      return {
        id: normalized,
        value: normalized,
        kind: 'radio',
        label: this.scheduleFrequencyLabel(normalized),
        icon: this.scheduleFrequencyIcon(normalized),
        palette: this.scheduleFrequencyPalette(normalized),
        surface: 'tinted'
      };
    });
  }

  protected slotLabel(key: keyof SlotsInputLabels): string {
    return this.config.labels?.[key] ?? DEFAULT_SLOTS_LABELS[key];
  }

  private scheduleFrequencyLabel(frequency: string): string {
    return this.config.frequencyLabel?.(frequency) ?? frequency;
  }

  private scheduleFrequencyIcon(frequency: string): string {
    switch (this.normalizeFrequency(frequency)) {
      case 'Custom':
        return 'event';
      case 'Daily':
        return 'today';
      case 'Weekly':
        return 'calendar_view_week';
      case 'Bi-weekly':
        return 'date_range';
      case 'Monthly':
        return 'calendar_month';
      case 'Yearly':
        return 'event_available';
      default:
        return 'event';
    }
  }

  private scheduleFrequencyPalette(frequency: string): AppMenuPalette {
    return scheduleFrequencyPalette(this.normalizeFrequency(frequency));
  }

  private defaultScheduleDraftDate(): Date {
    const baseSlots = this.baseSlotTemplates();
    const previousStart = this.parseDateValue(baseSlots[baseSlots.length - 1]?.startAt);
    if (previousStart) {
      return new Date(previousStart.getTime() + (60 * 60 * 1000));
    }
    return this.parseDateValue(this.resolvedConfig.startAtIso) ?? new Date();
  }

  private buildScheduleDraftStartAt(frequency: string, draft: SlotScheduleFormValue): string {
    const eventStart = this.parseDateValue(this.resolvedConfig.startAtIso) ?? new Date();
    const draftStart = this.parseDateValue(draft.startAt) ?? eventStart;
    const timeSource = this.parseScheduleTimeInput(draft.time, draftStart);
    let start = new Date(eventStart);
    switch (this.normalizeFrequency(frequency)) {
      case 'Custom':
        start = new Date(draftStart);
        break;
      case 'Weekly':
      case 'Bi-weekly':
        start = this.nextWeekdayDate(eventStart, this.scheduleInteger(draft.weekday, draftStart.getDay(), 0, 6));
        break;
      case 'Monthly':
        start = this.nextMonthlyDate(eventStart, this.scheduleInteger(draft.day, draftStart.getDate(), 1, 31));
        break;
      case 'Yearly':
        start = this.nextYearlyDate(
          eventStart,
          this.scheduleInteger(draft.month, draftStart.getMonth() + 1, 1, 12),
          this.scheduleInteger(draft.day, draftStart.getDate(), 1, 31)
        );
        break;
      default:
        start = new Date(eventStart);
        break;
    }
    return UiDateUtils.toIsoDateTimeLocal(this.applyDraftTime(start, timeSource));
  }

  private normalizeScheduleTime(value: unknown, fallbackDate: Date): string {
    const normalized = `${value ?? ''}`.trim();
    return /^\d{2}:\d{2}$/.test(normalized) ? normalized : this.formatScheduleTimeInput(fallbackDate);
  }

  private normalizeScheduleWeekday(value: unknown, fallbackDate: Date): string {
    return `${this.scheduleInteger(value, fallbackDate.getDay(), 0, 6)}`;
  }

  private normalizeScheduleMonth(value: unknown, fallbackDate: Date): string {
    return `${this.scheduleInteger(value, fallbackDate.getMonth() + 1, 1, 12)}`;
  }

  private normalizeScheduleDay(value: unknown, frequency: string, month: string, fallbackDate: Date): number {
    const max = this.scheduleDayMaxFor(frequency, month);
    return this.scheduleInteger(value, Math.min(fallbackDate.getDate(), max), 1, max);
  }

  private scheduleDayMax(): number {
    return this.scheduleDayMaxFor(this.scheduleFlowValue.frequency, this.scheduleFlowValue.month);
  }

  private scheduleDayMaxFor(frequency: string, month: string): number {
    if (this.normalizeFrequency(frequency) !== 'Yearly') {
      return 31;
    }
    const monthIndex = this.scheduleInteger(month, 1, 1, 12) - 1;
    return new Date(2026, monthIndex + 1, 0).getDate();
  }

  private scheduleInteger(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Math.trunc(Number(value));
    const normalized = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(max, Math.max(min, normalized));
  }

  private formatScheduleTimeInput(value: Date): string {
    return `${value.getHours()}`.padStart(2, '0') + ':' + `${value.getMinutes()}`.padStart(2, '0');
  }

  private parseScheduleTimeInput(value: string, fallbackDate: Date): Date {
    const normalized = this.normalizeScheduleTime(value, fallbackDate);
    const [hours, minutes] = normalized.split(':').map(item => Number(item));
    const next = new Date(fallbackDate);
    next.setHours(hours, minutes, 0, 0);
    return next;
  }

  private applyDraftTime(date: Date, timeSource: Date): Date {
    const next = new Date(date);
    next.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
    return next;
  }

  private nextWeekdayDate(start: Date, weekday: number): Date {
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const delta = (weekday - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + delta);
    return next;
  }

  private nextMonthlyDate(start: Date, day: number): Date {
    const next = this.monthlyDate(start.getFullYear(), start.getMonth(), day);
    if (next.getTime() >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) {
      return next;
    }
    return this.monthlyDate(start.getFullYear(), start.getMonth() + 1, day);
  }

  private monthlyDate(year: number, monthIndex: number, day: number): Date {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(Math.max(1, day), lastDay));
  }

  private nextYearlyDate(start: Date, month: number, day: number): Date {
    const monthIndex = Math.min(11, Math.max(0, month - 1));
    const next = this.monthlyDate(start.getFullYear(), monthIndex, day);
    if (next.getTime() >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) {
      return next;
    }
    return this.monthlyDate(start.getFullYear() + 1, monthIndex, day);
  }

  private normalizeSlotTemplatesForConfig(emitChanges: boolean): void {
    const before = this.slotTemplatesSignature(this.slotTemplates);
    if (!this.resolvedConfig.enabled) {
      this.slotTemplates = [];
    } else {
      this.slotTemplates = this.normalizeTemplates(
        this.slotTemplates.map(item => item.closed === true ? { ...item } : this.normalizeSlotTemplateBounds({ ...item }))
      );
    }
    if (emitChanges && before !== this.slotTemplatesSignature(this.slotTemplates)) {
      this.emitSlots();
    }
  }

  private emitSlots(): void {
    const nextSlots = this.normalizeTemplates(this.slotTemplates);
    this.slotTemplates = nextSlots;
    this.onModelChange(nextSlots.map(item => ({ ...item })));
    this.onModelTouched();
    this.cdr.markForCheck();
  }

  private slotTemplatesSignature(items: readonly SlotTemplate[]): string {
    return JSON.stringify(items.map(item => ({
      id: item.id,
      startAt: item.startAt,
      overrideDate: normalizeSlotOverrideDate(item.overrideDate),
      closed: item.closed === true
    })));
  }

  private baseSlotTemplates(): SlotTemplate[] {
    return this.slotTemplates
      .filter(item => !normalizeSlotOverrideDate(item.overrideDate))
      .filter(item => item.closed !== true)
      .map(item => ({
        ...item,
        overrideDate: null,
        closed: false
      }));
  }

  private buildSlotTemplateId(index: number): string {
    return `slot-${index}`;
  }

  private setActiveSlotTemplates(nextTemplates: SlotTemplate[]): void {
    const normalizedTemplates = this.normalizeTemplates(
      this.normalizeEditableSlotTemplates(nextTemplates)
    );
    const overrides = this.slotTemplates
      .filter(item => {
        const overrideDate = normalizeSlotOverrideDate(item.overrideDate);
        return Boolean(overrideDate);
      })
      .map(item => ({ ...item }));
    this.slotTemplates = [
      ...normalizedTemplates.map(item => ({ ...item, overrideDate: null, closed: false })),
      ...overrides
    ];
    this.emitSlots();
  }

  private normalizeSlotTemplateBounds(slot: SlotTemplate): SlotTemplate {
    const window = this.slotWindowForEditing(slot.overrideDate);
    const fallbackStart = window?.start ?? this.parseDateValue(this.resolvedConfig.startAtIso) ?? new Date();
    const fallbackEnd = window?.end ?? this.parseDateValue(this.resolvedConfig.endAtIso) ?? new Date(fallbackStart.getTime() + (60 * 60 * 1000));
    const windowStartMs = fallbackStart.getTime();
    const windowEndMs = Math.max(windowStartMs + (60 * 1000), fallbackEnd.getTime());

    let startDate = this.parseDateValue(slot.startAt) ?? new Date(fallbackStart);
    let startMs = startDate.getTime();
    const maxStartMs = Math.max(windowStartMs, windowEndMs - (60 * 1000));
    startMs = Math.min(maxStartMs, Math.max(windowStartMs, startMs));
    startDate = new Date(startMs);

    return {
      ...slot,
      startAt: UiDateUtils.toIsoDateTimeLocal(startDate)
    };
  }

  private normalizeEditableSlotTemplates(
    nextTemplates: readonly SlotTemplate[]
  ): SlotTemplate[] {
    return this.normalizeTemplates(nextTemplates)
      .map(item => item.closed === true ? { ...item } : this.normalizeSlotTemplateBounds({ ...item }));
  }

  private slotWindowForEditing(overrideDate: string | null | undefined = null): {
    start: Date;
    end: Date;
    startAt: string;
    endAt: string;
  } | null {
    return this.slotWindowForOverrideDate(overrideDate);
  }

  private slotWindowForOverrideDate(overrideDate: string | null | undefined): {
    start: Date;
    end: Date;
    startAt: string;
    endAt: string;
  } | null {
    const baseStart = this.parseDateValue(this.resolvedConfig.startAtIso);
    const baseEnd = this.parseDateValue(this.resolvedConfig.endAtIso);
    if (!baseStart || !baseEnd) {
      return null;
    }

    if (!overrideDate) {
      return {
        start: new Date(baseStart),
        end: new Date(baseEnd),
        startAt: UiDateUtils.toIsoDateTimeLocal(baseStart),
        endAt: UiDateUtils.toIsoDateTimeLocal(baseEnd)
      };
    }

    const overrideDateValue = this.parseOverrideDate(overrideDate);
    const shiftedStartAt = overrideDateValue
      ? UiDateUtils.applyDatePartToIsoLocal(this.resolvedConfig.startAtIso, overrideDateValue)
      : this.resolvedConfig.startAtIso;
    const shiftedStart = this.parseDateValue(shiftedStartAt) ?? new Date(baseStart);
    const boundaryEnd = this.eventFrequencyBoundaryEnd(shiftedStart) ?? new Date(baseEnd);
    const shiftedEnd = boundaryEnd.getTime() > baseEnd.getTime() ? new Date(baseEnd) : boundaryEnd;
    if (shiftedEnd.getTime() <= shiftedStart.getTime()) {
      const fallbackEnd = new Date(Math.min(baseEnd.getTime(), shiftedStart.getTime() + (60 * 60 * 1000)));
      return {
        start: shiftedStart,
        end: fallbackEnd,
        startAt: UiDateUtils.toIsoDateTimeLocal(shiftedStart),
        endAt: UiDateUtils.toIsoDateTimeLocal(fallbackEnd)
      };
    }
    return {
      start: shiftedStart,
      end: shiftedEnd,
      startAt: UiDateUtils.toIsoDateTimeLocal(shiftedStart),
      endAt: UiDateUtils.toIsoDateTimeLocal(shiftedEnd)
    };
  }

  private eventFrequencyBoundaryEnd(start: Date | null): Date | null {
    if (!start) {
      return null;
    }
    let boundaryDate: Date | null = null;
    switch (this.resolvedConfig.frequency) {
      case 'Daily':
        boundaryDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        break;
      case 'Weekly':
        boundaryDate = UiDateUtils.endOfWeekSunday(start);
        break;
      case 'Bi-weekly':
        boundaryDate = UiDateUtils.addDays(UiDateUtils.endOfWeekSunday(start), 7);
        break;
      case 'Monthly':
        boundaryDate = UiDateUtils.endOfMonth(start);
        break;
      case 'Yearly':
        boundaryDate = new Date(start.getFullYear(), 11, 31);
        break;
      default:
        boundaryDate = null;
        break;
    }
    if (!boundaryDate) {
      return null;
    }
    return new Date(boundaryDate.getFullYear(), boundaryDate.getMonth(), boundaryDate.getDate(), 23, 59, 0, 0);
  }

  private formatSlotDateTimeLabel(value: Date | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private parseDateValue(value: unknown): Date | null {
    return UiDateUtils.parseDate(value);
  }

  private parseOverrideDate(value: unknown): Date | null {
    return UiDateUtils.parseDateOnly(value);
  }
}
