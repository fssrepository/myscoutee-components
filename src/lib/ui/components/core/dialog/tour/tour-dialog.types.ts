/** Ready-to-render content; editor/version/audit and localization metadata belong to the host. */
export interface TourDialogSection { id: string; title: string; contentHtml: string; guideStepId?: string | null; }
export interface TourDialogStep { id: string; group: string; order: number; label: string; description: string; }
export interface TourDialogModel {
  open: boolean; loading: boolean; loadError: boolean; noGuide: boolean; visible: boolean;
  contextKey: string | null; stepIndex: number; fields: TourDialogStep[];
  content: { title: string; sections: TourDialogSection[] } | null;
  labels: { heading: string; close: string; back: string; next: string; done: string;
    empty: string; errorTitle: string; errorBody: string; };
  groups?: Readonly<Record<string, { label: string; icon: string }>>;
}
export interface TourDialogActions {
  stepChange: (index: number) => void;
  visibleChange: (visible: boolean) => void;
  close: () => void;
  empty: () => void;
}

type IsRendered = (element: HTMLElement) => boolean;
export interface TourDialogOptions {
  resolveSurface?: (contextKey: string | null, isRendered: IsRendered) => HTMLElement | null;
  resolveField?: (field: TourDialogStep, root: HTMLElement, isRendered: IsRendered) => HTMLElement | null | undefined;
  ignoreClickSelector?: string;
  trailingStepIds?: readonly string[];
  requestedStepId?: () => string | null;
  onRequestedStepSelected?: (id: string) => void;
}
export interface TourDialogConfig {
  mode: 'tour'; model: TourDialogModel; options?: TourDialogOptions; actions: TourDialogActions;
}
