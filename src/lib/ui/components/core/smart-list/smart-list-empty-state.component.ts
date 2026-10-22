import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nPipe } from '@fssrepository/myscoutee-components/foundation';

/** Shared empty/error content for lists and list surfaces whose initial read failed. */
@Component({
  selector: 'app-smart-list-empty-state',
  standalone: true,
  imports: [I18nPipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'smart-list__empty',
    '[class.smart-list__empty--start]': "placement() === 'start'",
    '[class.smart-list__empty--error]': "tone() === 'error'",
    '[attr.role]': "tone() === 'error' ? 'alert' : 'status'"
  },
  template: `
    @if (tone() === 'error') { <mat-icon class="smart-list__empty-icon" aria-hidden="true">error_outline</mat-icon> }
    <h4>{{ label() | i18n }}</h4>
    @if (description()) { <p>{{ description() | i18n }}</p> }
  `,
  styleUrl: './smart-list-empty-state.component.scss'
})
export class SmartListEmptyStateComponent {
  readonly label = input('no.items');
  readonly description = input('');
  readonly placement = input<'center' | 'start'>('center');
  readonly tone = input<'empty' | 'error'>('empty');
}
