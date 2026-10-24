import { InjectionToken, type Provider, type Type } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import type { FormFlowControlModel } from '../../components/form/flow/form-flow.types';

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

export const FORM_FLOW_BUILTIN_CONTROLS: FormFlowControls['renderers'] = {
  'date-input': {
    load: () => import('@fssrepository/myscoutee-components/date').then(m => m.DateInputComponent),
    inputs: context => ({ model: (context.control.config as { model?: unknown }).model })
  },
  route: {
    load: () => import('../../components/form/inputs/route-input/route-input.component').then(m => m.RouteInputComponent),
    inputs: context => ({config: (context.control.config as {model?: unknown} | null)?.model ?? {},
      readOnly: context.disabled, disabled: context.disabled}),
    value: context => context.stringArrayValue
  }
};
