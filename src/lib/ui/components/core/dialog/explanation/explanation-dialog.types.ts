import type { PopupModel } from '../../popup/popup.types';
export interface ExplanationDialogSection {
  id: string; title: string; blurb: string; html: string;
  layout: 'span-1' | 'span-2' | 'span-3' | null;
  icon: string; showIcon: boolean;
}
export interface ExplanationDialogModel {
  open: boolean; popup: PopupModel; zIndex: number; loading: boolean;
  loadingLabel: string; sections: ExplanationDialogSection[];
}
export interface ExplanationDialogConfig {
  mode: 'explanation'; model: ExplanationDialogModel; actions: { close: () => void };
}
