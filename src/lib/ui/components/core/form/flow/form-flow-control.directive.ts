import { ComponentRef, Directive, ErrorHandler, Injector, Input, OnChanges, OnDestroy, ViewContainerRef, inject } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { FORM_FLOW_BUILTIN_CONTROLS, FORM_FLOW_CONTROLS, type FormFlowControlContext, type FormFlowControlDefinition } from '../../../../../foundation/form-flow-controls';

/** Creates the registered component directly; no proxy component or duplicate state. */
@Directive({selector: '[formFlowControl]', standalone: true})
export class FormFlowControlDirective implements OnChanges, OnDestroy {
  @Input({required: true}) formFlowControl!: FormFlowControlContext;
  @Input({required: true}) controlInjector!: Injector;
  @Input() controlAttributes: Readonly<Record<string, string | null>> = {};
  private readonly controls = inject(FORM_FLOW_CONTROLS);
  private readonly view = inject(ViewContainerRef);
  private readonly errors = inject(ErrorHandler);
  private ref?: ComponentRef<ControlValueAccessor>;
  private definition?: FormFlowControlDefinition;
  private kind = '';
  private version = 0;
  private subscriptions: {unsubscribe(): void}[] = [];
  private value: unknown;
  private disabled?: boolean;
  private written = false;
  private appliedAttributes: Readonly<Record<string, string | null>> = {};

  ngOnChanges(): void {
    const kind = this.formFlowControl.control.kind;
    if (kind === this.kind) { this.update(); return; }
    this.kind = kind;
    this.clear();
    const version = ++this.version;
    const definition = this.controls.renderers[kind] ?? FORM_FLOW_BUILTIN_CONTROLS[kind];
    this.definition = definition;
    definition.load().then(type => {
      if (this.version !== version) return;
      const ref = this.view.createComponent(type, {injector: this.controlInjector});
      this.ref = ref;
      ref.instance.registerOnChange((value: unknown) => this.formFlowControl.change(value));
      ref.instance.registerOnTouched(() => this.formFlowControl.touch());
      for (const [name, listener] of Object.entries(definition.outputs ?? {})) {
        const output = (ref.instance as unknown as Record<string, unknown>)[name] as {subscribe(fn: (value: unknown) => void): {unsubscribe(): void}};
        this.subscriptions.push(output.subscribe(value => listener(this.formFlowControl, value)));
      }
      this.update();
      ref.changeDetectorRef.detectChanges();
    }).catch(error => this.errors.handleError(error));
  }
  private update(): void {
    if (!this.ref || !this.definition) return;
    const context = this.formFlowControl;
    const host = this.ref.location.nativeElement as HTMLElement;
    for (const name of new Set([...Object.keys(this.appliedAttributes), ...Object.keys(this.controlAttributes)])) {
      const value = this.controlAttributes[name] ?? null;
      if (value === (this.appliedAttributes[name] ?? null)) continue;
      if (name === 'class') {
        for (const token of (this.appliedAttributes[name] ?? '').split(/\s+/).filter(Boolean)) host.classList.remove(token);
        for (const token of (value ?? '').split(/\s+/).filter(Boolean)) host.classList.add(token);
      } else if (value === null) host.removeAttribute(name);
      else host.setAttribute(name, value);
    }
    this.appliedAttributes = { ...this.controlAttributes };
    for (const [name, value] of Object.entries(this.definition.inputs?.(context) ?? {})) this.ref.setInput(name, value);
    const value = this.definition.value ? this.definition.value(context) : context.value;
    if (!this.written || !Object.is(value, this.value)) {
      this.ref.instance.writeValue(value); this.value = value;
    }
    if (!this.written || context.disabled !== this.disabled) this.ref.instance.setDisabledState?.(context.disabled);
    this.disabled = context.disabled;
    this.written = true;
  }
  private clear(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe()); this.subscriptions = [];
    this.view.clear(); this.ref = undefined; this.written = false; this.appliedAttributes = {};
  }
  ngOnDestroy(): void { this.version++; this.clear(); }
}
