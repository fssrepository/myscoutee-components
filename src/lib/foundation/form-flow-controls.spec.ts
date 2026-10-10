import { Component, Injectable, Input, Output, EventEmitter, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FORM_FLOW_CONTROLS, FormFlowComponent } from '../../public-api';

@Injectable()
class FormScope { readonly destroyed = vi.fn(); ngOnDestroy() { this.destroyed(); } }
@Component({selector: 'test-custom-field', standalone: true, template: '<button (click)="change(42)">Update</button>'})
class CustomField {
  @Input() enabled = false;
  @Output() readonly enabledChange = new EventEmitter<boolean>();
  value: unknown;
  change: (value: unknown) => void = () => {};
  writeValue(value: unknown) { this.value = value; }
  registerOnChange(fn: (value: unknown) => void) { this.change = fn; }
  registerOnTouched(_fn: () => void) {}
  readonly scope = inject(FormScope);
}

describe('FormFlow consumer controls', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('loads a consumer field, writes its binding and isolates providers by form', async () => {
    const load = vi.fn(async () => CustomField);
    TestBed.configureTestingModule({providers: [{provide: FORM_FLOW_CONTROLS, useValue: {
      providers: [FormScope], renderers: {custom: {load,
        inputs: (context: {enabled: boolean}) => ({enabled: context.enabled}),
        outputs: {enabledChange: (context: {changeEnabled: (v: boolean) => void}, value: unknown) => context.changeEnabled(value === true)}
      }}
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
    expect(fields[0].value).toBe(1);
    expect(fields[0].enabled).toBe(false);
    fields[0].change(42);
    expect(changed).toHaveBeenLastCalledWith({nested: {first: 42, second: 2}, enabled: false});
    fields[0].enabledChange.emit(true);
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
