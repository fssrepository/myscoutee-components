export interface AppMenuBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Intersect the first enclosing layout boundary with the visible viewport. */
export function appMenuAncestorBounds(
  parent: HTMLElement | null,
  viewport: AppMenuBounds,
  isBoundary: (element: HTMLElement, style: CSSStyleDeclaration) => boolean
): AppMenuBounds {
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    if (isBoundary(parent, style)) {
      const rect = parent.getBoundingClientRect();
      return {
        left: Math.max(viewport.left, rect.left),
        top: Math.max(viewport.top, rect.top),
        right: Math.min(viewport.right, rect.right),
        bottom: Math.min(viewport.bottom, rect.bottom)
      };
    }
    parent = parent.parentElement;
  }
  return viewport;
}
