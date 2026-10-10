import { Component, Injectable, Input, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FORM_FLOW_CONTROLS, FormFlowComponent, type FormFlowControlContext } from '@myscoutee/components';

@Injectable()
class FormScope { readonly destroyed = vi.fn(); ngOnDestroy() { this.destroyed(); } }
@Component({selector: 'test-custom-field', standalone: true, template: '<button (click)="context.change(42)">Update</button>'})
class CustomField {
  @Input({required: true}) context!: FormFlowControlContext;
  readonly scope = inject(FormScope);
}

describe('FormFlow consumer controls', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('loads a consumer field, writes its binding and isolates providers by form', async () => {
    const load = vi.fn(async () => CustomField);
    TestBed.configureTestingModule({providers: [{provide: FORM_FLOW_CONTROLS, useValue: {
      providers: [FormScope], renderers: {custom: load}
    }}]});
    const model = {title: 'Test', deferPreparation: false, steps: [{id: 'one', title: 'Step', controls: [
      {id: 'first', kind: 'custom', bind: 'nested.first', enabledBind: 'enabled'},
      {id: 'second', kind: 'custom', bind: 'nested.second'}
    ]}]};
    const first = TestBed.createComponent(FormFlowComponent);
    first.componentRef.setInput('model', model);
    first.componentInstance.writeValue({nested: {first: 1, second: 2}, enabled: false});
    const changed = vi.fn();
    first.componentInstance.registerOnChange(changed);
    first.detectChanges(); await first.whenStable(); first.detectChanges();
    const fields = first.debugElement.queryAll(By.directive(CustomField)).map(node => node.componentInstance as CustomField);
    expect(fields).toHaveLength(2);
    expect(fields[0].scope).toBe(fields[1].scope);
    expect(fields[0].context.value).toBe(1);
    expect(fields[0].context.enabled).toBe(false);
    fields[0].context.change(42);
    expect(changed).toHaveBeenLastCalledWith({nested: {first: 42, second: 2}, enabled: false});
    fields[0].context.changeEnabled(true);
    expect(changed).toHaveBeenLastCalledWith({nested: {first: 42, second: 2}, enabled: true});
    const second = TestBed.createComponent(FormFlowComponent);
    second.componentRef.setInput('model', model);
    second.detectChanges(); await second.whenStable(); second.detectChanges();
    const other = second.debugElement.query(By.directive(CustomField)).componentInstance as CustomField;
    expect(other.scope).not.toBe(fields[0].scope);
    first.destroy();
    expect(fields[0].scope.destroyed).toHaveBeenCalledOnce();
    expect(other.scope.destroyed).not.toHaveBeenCalled();
  });
});
