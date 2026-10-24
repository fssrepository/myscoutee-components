import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ErrorHandler, Input, OnChanges, inject, signal, type Type } from '@angular/core';
import { ConfirmationDialogComponent, type DialogLocalConfig } from './confirmation/confirmation-dialog.component';
import type { TourDialogConfig } from './tour/tour-dialog.types';
import type { ExplanationDialogConfig } from './explanation/explanation-dialog.types';
export type { DialogLocalConfig } from './confirmation/confirmation-dialog.component';
export type DialogViewConfig = DialogLocalConfig | TourDialogConfig | ExplanationDialogConfig;

/** Selects the UI mode. Content loading, localization and persistence belong to the host/store. */
@Component({
  selector: 'app-dialog', standalone: true,
  imports: [NgComponentOutlet, ConfirmationDialogComponent],
  templateUrl: './dialog.component.html', styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogComponent implements OnChanges {
  @Input() useStore = true;
  @Input() dialog: DialogViewConfig | null = null;
  @Input() zIndex: number | null = null;
  protected readonly renderer = signal<Type<unknown> | null>(null);
  private rendererMode: string | undefined;
  private loadSerial = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly errors = inject(ErrorHandler);

  ngOnChanges(): void {
    const mode = this.dialog?.mode;
    if (mode === this.rendererMode) return;
    this.rendererMode = mode;
    this.renderer.set(null);
    const serial = ++this.loadSerial;
    const loading = mode === 'tour'
      ? import('./tour/tour-dialog.component').then(module => module.TourDialogComponent)
      : mode === 'explanation'
        ? import('./explanation/explanation-dialog.component').then(module => module.ExplanationDialogComponent)
        : null;
    if (loading) void loading.then(component => {
      if (!this.destroyRef.destroyed && serial === this.loadSerial) this.renderer.set(component);
    }).catch(error => this.errors.handleError(error));
  }

  protected contentConfig(): TourDialogConfig | ExplanationDialogConfig | null {
    return this.dialog?.mode === 'tour' || this.dialog?.mode === 'explanation' ? this.dialog : null;
  }

  protected contentInputs(): Record<string, unknown> {
    const config = this.contentConfig();
    if (!config) return {};
    return config.mode === 'tour'
      ? { model: config.model, options: config.options ?? {}, actions: config.actions }
      : { model: config.model, actions: config.actions };
  }

  protected confirmationConfig(): DialogLocalConfig | null {
    return this.contentConfig() ? null : this.dialog as DialogLocalConfig | null;
  }
}
