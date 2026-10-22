# Changelog

## 1.4.6 — MSC-127

Publish secondary entry points for foundation, core, cards, date and forms while
retaining root exports. Keep menu-trigger styling independent of panel styles and
skip redundant observation of already loaded retained images. Consolidate shared
menu, popup, card, route and indicator implementations; rating frame bindings use
the existing article element without adding DOM nodes. Associate native form and
upload controls with accessible labels, preserve index-aware list predicates and
correct counter typography overwritten by a font shorthand. Add focused LCOV
reporting and source-owned Sonar configuration. Applications consume this release
as an exact npm dependency instead of building a source submodule.

## 1.4.5 — MSC-126

Use semantic keys for shared date/accordion captions, preserve content identities,
correct landing wordmark/heading accessibility and prioritize the selected image
through the existing image loader. Consumer application catalogs provide the keys.

## 1.4.1 — 2026-10-17

Keep FormFlow labels and actions aligned with field navigation, preserve shared
rate labels, constrain image-editor widths and reposition avatar edit/completion
controls so the profile image remains visible. Existing focused regressions cover
form navigation and rate-label fallback.

## 1.4.0 — 2026-10-12

Retain the qualified deployment-brand font styling and configurable header text
spacing used by the applications. Move the complete component catalogue to the
branded PDF guide and shorten the README. No public API changes.

## 0.1.1 — 2026-10-10

Fix built-in route controls missing from FormFlow when a consumer registers its
own controls. Preserve consumer overrides and route value propagation.

## 0.1.0 — 2026-10-10

First extracted Angular UI release. Includes configurable menus, forms and inputs,
list/card/calendar views, media components, overlays, guide and translation contracts,
shared helpers and Sass modules. Distributed through GitHub Packages and a versioned
Git submodule. See [release notes](https://github.com/fssrepository/myscoutee-components/releases/tag/v0.1.0) for artifacts and verification.
