export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  contentHtml: string;
  imageUrls?: string[];
  panelSpan?: GuideSectionPanelSpan;
  optional?: boolean;
  guideStepId?: string | null;
  details?: string[];
  points?: string[];
}


export type GuideSectionPanelSpan = 'span-1' | 'span-2' | 'span-3';


export type GuideDocumentKind = 'help' | 'privacy' | 'terms' | 'explanation';

export type GuidePresentation = 'document' | 'tour';

export type GuideHeaderColor = 'amber' | 'blue' | 'green' | 'rose' | 'violet' | 'slate';


export interface GuideRevision {
  isSystem?: boolean;
  id: string;
  documentKind?: GuideDocumentKind;
  contextKey?: string | null;
  lang: string;
  languageLabel: string;
  version: number;
  title: string;
  summary: string;
  description: string;
  headerColor?: GuideHeaderColor;
  presentation?: GuidePresentation;
  sections: GuideSection[];
  active: boolean;
  createdAtIso: string;
  createdByUserId: string;
  updatedAtIso: string;
  updatedByUserId: string;
}


export interface GuideField {
  id: string;
  screenKey: string;
  group: string;
  i18nKey: string;
  order: number;
}
export interface GuideState {
  activeRevision: GuideRevision | null;
  guideFields: GuideField[];
}
