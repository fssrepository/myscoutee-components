# Changelog

## 1.5.0 — 2026-10-24

Keep the tour highlight's base glow continuously visible and pulse only an
additional glow layer. Preserve its 1.8-second rhythm, target geometry and
reduced motion without animating box-shadow. Three uninterrupted cycles retain
the base glow and animation timeline, with no jump at the cycle boundary or
ongoing paint events in the compiled-CSS browser fixture.

Share menu palette styles between full menus and detached triggers, preserving
their selector specificity and keeping the styles available while either
renderer remains mounted. Remove overwritten declarations, merge identical
mobile panel rules and exclude panel-only styles from detached triggers.
Release preparation checks that the packaged startup graph includes the palette
stylesheet once when both renderers are used.

Hide InfoCard and ImageCard image loaders outside the loading state so their
invisible spinners stop animating after success or failure. This is an explicitly
requested reissue of 1.5.0; consumers refresh their locked artifact integrity.

Package the existing Roboto 300/400/500 and filled Material Icons WOFF/WOFF2
assets with their original license notices. Expose an optional
`styles/fonts.css` entry so applications can serve the fonts locally as separate
media files without embedding their bytes in JavaScript or CSS bundles.

Unify confirmation, tour and explanation under the configured DialogComponent.
Keep tracking and section rendering generic, with lazy tour/explanation renderers.
Prepare confirmation text in DialogStore; applications own translation, content
loading, preferences, persistence and editor DTOs. Replace the package's guide
service with the minimal optional popup/list context binding. Preserve target
tracking, popup continuation and navigation through focused component tests.

Declare foundation runtime exports explicitly in the root and core entry points
so standalone esbuild consumers initialize the same public values as native ESM
consumers. Release preparation now checks both packaged entry points with the
standalone bundler before publication. Angular 22.2 peers remain required.

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
