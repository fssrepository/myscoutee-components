import { appMenuAncestorBounds } from './menu-layout';

describe('shared menu ancestor bounds', () => {
  afterEach(() => document.body.replaceChildren());

  it('uses the nearest accepted ancestor and intersects it with the viewport', () => {
    const outer = document.createElement('div'), inner = document.createElement('div');
    document.body.append(outer); outer.append(inner);
    vi.spyOn(outer, 'getBoundingClientRect').mockReturnValue({ left: -10, top: 30, right: 700, bottom: 900 } as DOMRect);
    vi.spyOn(inner, 'getBoundingClientRect').mockReturnValue({ left: 50, top: -5, right: 450, bottom: 600 } as DOMRect);
    const viewport = { left: 0, top: 0, right: 400, bottom: 800 };
    expect(appMenuAncestorBounds(inner, viewport, element => element === inner))
      .toEqual({ left: 50, top: 0, right: 400, bottom: 600 });
    expect(appMenuAncestorBounds(inner, viewport, element => element === outer))
      .toEqual({ left: 0, top: 30, right: 400, bottom: 800 });
    expect(appMenuAncestorBounds(inner, viewport, () => false)).toBe(viewport);
  });
});
