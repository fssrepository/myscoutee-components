import { Directive, Input } from '@angular/core';
import type { PairCardData, SingleCardData } from './card.types';

/** Common bindings on the existing article; creates no elements or views. */
@Directive({
  selector: 'article[appRateCardFrame]',
  standalone: true,
  host: {
    class: 'activities-rate-profile-card activities-row-item',
    '[class.activities-rates-fullscreen-card]': 'fullscreen',
    '[class.activities-rates-fullscreen-card-active]': "fullscreen && card?.state === 'active'",
    '[class.activities-rates-fullscreen-card-leaving]': "fullscreen && card?.state === 'leaving'",
    '[attr.data-activity-rate-row-id]': 'card?.rowId',
    '[attr.data-group-label]': 'fullscreen ? null : card?.groupLabel',
    '[style.width]': 'fullscreen ? fullscreenWidth : null',
    '[style.height]': 'fullscreen ? fullscreenHeight : null'
  }
})
export class RateCardFrameDirective {
  @Input('appRateCardFrame') card: SingleCardData | PairCardData | null = null;
  @Input() fullscreenWidth: string | null = null;
  @Input() fullscreenHeight: string | null = null;

  protected get fullscreen(): boolean {
    return this.card?.presentation === 'fullscreen';
  }
}
