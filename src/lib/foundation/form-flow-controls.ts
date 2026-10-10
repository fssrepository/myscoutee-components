import { InjectionToken, type Provider, type Type } from '@angular/core';
import type { FormFlowControlModel } from '../ui/components/core/form/flow/form-flow.types';

export interface FormFlowControlContext {
  control: FormFlowControlModel;
  value: unknown;
  stringArrayValue: readonly string[];
  disabled: boolean;
  enabled: boolean;
  change: (value: unknown) => void;
  changeEnabled: (enabled: boolean) => void;
}
/** Each renderer receives a `context` input. Its implementation stays in the consumer. */
export interface FormFlowControls {
  renderers: Readonly<Record<string, () => Promise<Type<unknown>>>>;
  providers?: Provider[];
}
export const FORM_FLOW_CONTROLS = new InjectionToken<FormFlowControls>('FORM_FLOW_CONTROLS', {
  providedIn: 'root', factory: () => ({ renderers: {} })
});
