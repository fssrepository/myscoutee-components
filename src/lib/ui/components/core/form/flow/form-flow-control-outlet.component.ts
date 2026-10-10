import { NgComponentOutlet } from '@angular/common';
import { Component, ErrorHandler, Injector, Input, OnChanges, OnDestroy, Type, inject, signal } from '@angular/core';
import { FORM_FLOW_CONTROLS } from '../../../../../foundation/form-flow-controls';
import { type FormFlowControlContext } from '../../../../../foundation/form-flow-controls';

@Component({
  selector: 'app-form-flow-control-outlet', standalone: true, imports: [NgComponentOutlet],
  template: `@if (renderer(); as type) { <ng-container *ngComponentOutlet="type; inputs: {context: context}; injector: controlInjector" /> }`,
  styles: [':host { display: contents; }']
})
export class FormFlowControlOutletComponent implements OnChanges, OnDestroy {
  @Input({required: true}) context!: FormFlowControlContext;
  @Input({required: true}) controlInjector!: Injector;
  private readonly controls = inject(FORM_FLOW_CONTROLS);
  private readonly errors = inject(ErrorHandler);
  protected readonly renderer = signal<Type<unknown> | null>(null);
  private kind = '';
  private version = 0;
  ngOnChanges(): void {
    const kind = this.context.control.kind;
    if (kind === this.kind) return;
    this.kind = kind;
    const version = ++this.version;
    this.renderer.set(null);
    this.controls.renderers[kind]().then(type => {
      if (this.version === version) this.renderer.set(type);
    }).catch(error => this.errors.handleError(error));
  }
  ngOnDestroy(): void { this.version++; }
}
