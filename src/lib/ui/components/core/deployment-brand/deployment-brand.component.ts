import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject
} from '@angular/core';

import { UI_BRANDING } from '../../../../foundation/branding';
import type { UiBranding as DeploymentBrandingDto } from '../../../../foundation/branding';

interface DeploymentBrandRenderModel {
  readonly branding: DeploymentBrandingDto;
  readonly inlineLogo: boolean;
  readonly beforeLogo: string;
  readonly afterLogo: string;
}

@Component({
  selector: 'app-deployment-brand',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deployment-brand.component.html',
  styleUrl: './deployment-brand.component.scss'
})
export class DeploymentBrandComponent {
  private readonly defaultBranding = inject(UI_BRANDING, { optional: true });

  @Input() branding: DeploymentBrandingDto | null = null;
  @Input() ariaLabel: string | null = null;

  protected renderModel(): DeploymentBrandRenderModel {
    const branding = this.branding ?? this.defaultBranding?.();
    if (!branding) throw new Error('DeploymentBrand requires a branding input or UI_BRANDING provider.');
    const characters = Array.from(branding.productName);
    const index = branding.logoCharacterIndex ?? 0;
    const inlineLogo = Boolean(branding.logoUrl.trim()) && index >= 0;
    return {
      branding,
      inlineLogo,
      beforeLogo: inlineLogo
        ? characters.slice(0, index).join('')
        : branding.productName,
      afterLogo: inlineLogo
        ? characters.slice(index + 1).join('')
        : ''
    };
  }
}
