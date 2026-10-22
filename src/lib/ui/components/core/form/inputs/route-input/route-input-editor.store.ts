import { Injectable, Type, signal } from '@angular/core';

export interface RouteInputEditorState {
  ownerId: string;
  title: string;
  subtitle: string;
  zIndex: number;
  routes: string[];
  routeRowIds: string[];
  saving: boolean;
  error: string | null;
  canSave: boolean;
  readOnly: boolean;
}

interface RouteInputEditorActionBase {
  ownerId: string;
  requestId: number;
  event?: Event;
}

export type RouteInputEditorActionRequest =
  | (RouteInputEditorActionBase & { kind: 'close' })
  | (RouteInputEditorActionBase & {
    kind: 'save';
    routes: string[];
    routeRowIds: string[];
  });

type RouteInputEditorActionPayload =
  | (Omit<RouteInputEditorActionBase, 'requestId'> & { kind: 'close' })
  | (Omit<RouteInputEditorActionBase, 'requestId'> & {
    kind: 'save';
    routes: string[];
    routeRowIds: string[];
  });

@Injectable()
export class RouteInputEditorStore {
  readonly routeInputEditorRef = signal<RouteInputEditorState | null>(null);

  private readonly routeInputEditorComponentRef = signal<Type<unknown> | null>(null);

  private readonly routeInputEditorActionRequestRef = signal<RouteInputEditorActionRequest | null>(null);

  private routeInputEditorActionSequence = 0;

  readonly routeInputEditorComponent = this.routeInputEditorComponentRef.asReadonly();

  readonly routeInputEditorActionRequest = this.routeInputEditorActionRequestRef.asReadonly();

  openRouteInputEditor(editor: RouteInputEditorState): void {
    this.routeInputEditorRef.set(this.cloneRouteInputEditor(editor));
  }

  updateRouteInputEditor(editor: RouteInputEditorState): void {
    const current = this.routeInputEditorRef();
    if (current && current.ownerId !== editor.ownerId) {
      return;
    }
    this.routeInputEditorRef.set(this.cloneRouteInputEditor(editor));
  }

  closeRouteInputEditor(ownerId?: string): void {
    const current = this.routeInputEditorRef();
    if (ownerId && current?.ownerId !== ownerId) {
      return;
    }
    this.routeInputEditorRef.set(null);
  }

  requestRouteInputEditorClose(ownerId: string, event?: Event): void {
    this.requestRouteInputEditorAction({ ownerId, kind: 'close', event });
  }

  requestRouteInputEditorSave(
    ownerId: string,
    routes: readonly string[],
    routeRowIds: readonly string[],
    event?: Event
  ): void {
    this.requestRouteInputEditorAction({
      ownerId,
      kind: 'save',
      routes: [...routes],
      routeRowIds: [...routeRowIds],
      event
    });
  }

  async ensureRouteInputEditorLoaded(): Promise<void> {
    if (this.routeInputEditorComponentRef()) {
      return;
    }
    const module = await import('./route-input-popup/route-input-popup.component');
    this.routeInputEditorComponentRef.set(module.RouteInputPopupComponent);
  }

  openGoogleMapsSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed || typeof window === 'undefined') {
      return;
    }
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  openGoogleMapsDirections(normalized: readonly string[]): void {
    if (normalized.length === 0 || typeof window === 'undefined') {
      return;
    }
    if (normalized.length === 1) {
      this.openGoogleMapsSearch(normalized[0]);
      return;
    }
    const origin = normalized[0];
    const destination = normalized[normalized.length - 1];
    const waypoints = normalized.slice(1, -1);
    let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private requestRouteInputEditorAction(request: RouteInputEditorActionPayload): void {
    this.routeInputEditorActionSequence += 1;
    this.routeInputEditorActionRequestRef.set({
      ...request,
      requestId: this.routeInputEditorActionSequence
    });
  }

  private cloneRouteInputEditor(editor: RouteInputEditorState): RouteInputEditorState {
    return {
      ...editor,
      routes: [...editor.routes],
      routeRowIds: [...editor.routeRowIds]
    };
  }
}
