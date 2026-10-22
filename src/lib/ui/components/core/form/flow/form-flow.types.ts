import type {
  AppMenuItem,
  AppMenuItemSelectEvent,
  AppMenuKind,
  AppMenuLayout,
  AppMenuModel,
  AppMenuPanelMode,
  AppMenuTrigger
} from '../../menu/index';
import type { DateInputMetaModel, DateInputModel } from '@fssrepository/myscoutee-components/date';
import type { LinkInputConfig } from '../inputs/link-input/index';
import type { LocationInputConfig } from '../inputs/location-input/index';
import type { TextCardsConfig } from '../inputs/text-cards-input/text-cards-input.component';
import type { ImageCardData, InfoCardData } from '../../smart-list/card/card.types';

export interface FormFlowDraft<TData> {
  version: 1;
  userId: string;
  currentStepId: string;
  updatedAtIso: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  data: TData;
}

export type FormFlowControlKind =
  | 'checkbox'
  | 'toggle'
  | 'date'
  | 'image-carousel'
  | 'link'
  | 'location'
  | 'menu'
  | 'number'
  | 'review'
  | 'section'
  | 'static'
  | 'table'
  | 'text'
  | 'textarea'
  | 'text-cards'
  | (string & {});

export interface FormFlowHeaderModel {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  icon?: string;
  palette?: string;
  imageCard?: ImageCardData | null;
  infoCard?: InfoCardData | null;
}

export interface FormFlowMenuControlConfig {
  kind?: AppMenuKind;
  layout?: AppMenuLayout;
  panelMode?: AppMenuPanelMode;
  title?: string;
  filterable?: boolean;
  closeOnSelect?: boolean;
  trigger?: AppMenuTrigger | null;
  model?: AppMenuModel<string, unknown> | null;
  items?: readonly AppMenuItem<string, unknown>[];
}

export interface FormFlowImageCarouselControlConfig {
  gallery?: boolean;
  slotCount?: number;
  compact?: boolean;
  autoSize?: boolean;
  slotImageVariant?: 'small' | 'medium' | 'large';
  previewMode?: boolean;
  ariaLabel?: string;
  uploadOwnerId?: string;
  uploadEntityId?: string;
}

export type FormFlowDateMetaConfig = DateInputMetaModel;

export interface FormFlowDateControlConfig {
  model?: DateInputModel | null;
  meta?: FormFlowDateMetaConfig | null;
}

export interface FormFlowLocationControlConfig {
  model?: LocationInputConfig | null;
}

export interface FormFlowLinkControlConfig {
  model?: LinkInputConfig | null;
}

export interface FormFlowTableControlConfig {
  rows: readonly { id?: string; label: string; value: string; icon?: string; badgeTone?: 'danger'; palette?: import('../../menu/index').AppMenuPalette; actions?: readonly AppMenuItem<string, unknown>[] }[];
}

export interface FormFlowControlSummaryConfig {
  hidden?: boolean;
  label?: string;
  emptyLabel?: string;
  value?: (formValue: unknown, control: FormFlowControlModel) => unknown;
}

export type FormFlowCompletionMetric = 'filled' | 'count' | 'length' | 'positiveNumber' | 'isoDate';
export type FormFlowTone = 'default' | 'blue' | 'green' | 'orange';
export type FormFlowControlValidationError =
  | string
  | null
  | ((value: unknown, formValue: unknown) => string | null | undefined);

export interface FormFlowCompletionItemConfig {
  id?: string;
  bind?: string | readonly (string | number)[];
  valueFormat?: 'csv';
  metric?: FormFlowCompletionMetric;
  thresholds?: readonly number[];
  weight?: number;
}

export interface FormFlowCompletionModel {
  items?: readonly FormFlowCompletionItemConfig[];
  controls?: 'all' | 'required' | 'none';
}

export interface FormFlowControlModel {
  id: string;
  guideFieldId?: string;
  bind?: string | readonly (string | number)[];
  kind: FormFlowControlKind;
  layout?: 'default' | 'half' | 'wide';
  rowSpan?: number;
  align?: 'start' | 'end';
  label?: string;
  description?: string;
  validationError?: FormFlowControlValidationError;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  step?: number | string;
  rows?: number;
  maxLength?: number;
  valueFormat?: 'csv';
  enabledBind?: string | readonly (string | number)[];
  config?:
    | FormFlowMenuControlConfig
    | FormFlowImageCarouselControlConfig
    | FormFlowDateControlConfig
    | FormFlowLinkControlConfig
    | FormFlowLocationControlConfig
    | FormFlowTableControlConfig
    | TextCardsConfig
    | { model?: unknown; [key: string]: unknown }
    | null;
  accessory?: { menu?: FormFlowMenuControlConfig | null } | null;
  summary?: FormFlowControlSummaryConfig | null;
}

export interface FormFlowStepModel {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  chrome?: 'default' | 'none';
  presentation?: 'default' | 'media';
  /** Keep compact controls together on mobile, wrapping only when they no longer fit. */
  wrapControlsOnMobile?: boolean;
  palette?: string;
  header?: FormFlowHeaderModel | null;
  headerControl?: FormFlowControlModel | null;
  controls: readonly FormFlowControlModel[];
}

export interface FormFlowSummaryModel {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  icon?: string;
  emptyLabel?: string;
  includeEmpty?: boolean;
}

export interface FormFlowSaveModel {
  label?: string;
  ariaLabel?: string;
  icon?: string;
  disabled?: boolean;
}

export interface FormFlowPushEvent {
  value: unknown;
  stepId: string;
  stepIndex: number;
  signal?: AbortSignal;
}

export interface FormFlowModel {
  title: string;
  deferPreparation?: boolean;
  subtitle?: string;
  layout?: 'default' | 'carousel' | 'grouped';
  tone?: FormFlowTone;
  header?: boolean;
  allowMenuOverflow?: boolean;
  steps: readonly FormFlowStepModel[];
  summary?: FormFlowSummaryModel | null;
  save?: FormFlowSaveModel | null;
  completion?: FormFlowCompletionModel | null;
  pushIntervalMs?: number | null;
  onPush?: (event: FormFlowPushEvent) => void | Promise<void>;
  loadingLabel?: string;
}

export interface FormFlowSaveEvent {
  value: unknown;
  stepId: string;
  stepIndex: number;
  sourceEvent?: Event;
}

export interface FormFlowActionEvent {
  control: FormFlowControlModel;
  value: unknown;
  context?: unknown;
  sourceEvent: AppMenuItemSelectEvent<string, unknown>;
}
