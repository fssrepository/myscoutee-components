import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PopupComponent } from '../../popup/popup.component';
import { LazyBgImageDirective } from '../../../../directives/lazy-bg-image.directive';
import { IndicatorComponent } from '../../../../../components/indicator/indicator.component';
import type { ExplanationDialogModel, ExplanationDialogConfig } from './explanation-dialog.types';

@Component({ selector: 'app-explanation-dialog', standalone: true,
  imports: [PopupComponent, MatIconModule, LazyBgImageDirective, IndicatorComponent],
  templateUrl: './explanation-dialog.component.html', styleUrl: './explanation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush })
export class ExplanationDialogComponent {
  readonly model = input.required<ExplanationDialogModel>();
  readonly actions = input.required<ExplanationDialogConfig['actions']>();
  protected readonly popup = computed(() => ({ ...this.model().popup, onClose: (event: Event) => {
    event.stopPropagation(); this.actions().close();
  } }));
}
