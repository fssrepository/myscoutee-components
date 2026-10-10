import { InjectionToken, type Provider, type Type } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import type { FormFlowControlModel } from '../ui/components/core/form/flow/form-flow.types';

export interface FormFlowControlContext {
  control: FormFlowControlModel;
  value: unknown;
  stringArrayValue: readonly string[];
  disabled: boolean;
  enabled: boolean;
  change: (value: unknown) => void;
  touch: () => void;
  changeEnabled: (enabled: boolean) => void;
}
/** Mount the actual consumer control using its existing ControlValueAccessor. */
export interface FormFlowControlDefinition {
  load: () => Promise<Type<ControlValueAccessor>>;
  inputs?: (context: FormFlowControlContext) => Record<string, unknown>;
  outputs?: Readonly<Record<string, (context: FormFlowControlContext, value: unknown) => void>>;
  value?: (context: FormFlowControlContext) => unknown;
}
export interface FormFlowControls {
  renderers: Readonly<Record<string, FormFlowControlDefinition>>;
  providers?: Provider[];
}
export const FORM_FLOW_CONTROLS = new InjectionToken<FormFlowControls>('FORM_FLOW_CONTROLS', {
  providedIn: 'root', factory: () => ({ renderers: {} })
});
