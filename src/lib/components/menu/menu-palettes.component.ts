import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

// Angular installs this stylesheet once, including when both menu renderers exist.
@Component({
  selector: 'app-menu-palettes',
  standalone: true,
  template: '',
  styleUrl: './menu-palettes.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: none', 'aria-hidden': 'true' }
})
export class MenuPalettesComponent {}
