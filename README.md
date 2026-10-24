# MyScoutee Components

Reusable Angular controls for forms, menus, popups, SmartLists, calendars,
media and loading indicators. Applications provide their own data, services,
translations and branding.

## Install

Requires Angular 22.2, RxJS 7.8 and compatible Angular Material/CDK peers. Use the Node version in `.nvmrc`.
Development uses Node.js 24 and npm 11.

Configure `@fssrepository:registry=https://npm.pkg.github.com` in `.npmrc`,
then authenticate with a GitHub token with `read:packages` in your user-level
configuration. Keep credentials out of Git.

```sh
npm install @fssrepository/myscoutee-components@1.5.0
```

## Self-hosted fonts

To use the optional Roboto 300/400/500 and filled Material Icons fonts, add
`node_modules/@fssrepository/myscoutee-components/styles/fonts.css` to the
application's `angular.json` global `styles` array. Replace existing Roboto and
Material Icons stylesheet entries rather than loading both copies.

The package includes the original WOFF/WOFF2 files, character subsets and license
notices. Angular emits the fonts as separate local media files referenced by CSS;
the browser loads them from the application's own server without a font CDN.
Importing Angular components alone does not load these optional font styles.

## Documentation

| Document | Link |
| --- | --- |
| Component catalogue, setup, examples, styles and release workflow | [PDF](https://github.com/fssrepository/myscoutee-components/blob/master/guides/manuals/MyScoutee_Components_Guide_EN.pdf) |
| Editable guide and PDF regeneration | [HTML](guides/manuals/components-guide-en.html) · [Instructions](guides/manuals/README.md) |
| Public API | [Exports](src/public-api.ts) |
| Changes | [Changelog](CHANGELOG.md) · [1.4.6 release notes](releases/v1.4.6.md) |
| Complete application foundation | [MyScoutee Template](https://github.com/fssrepository/myscoutee-template) |

## Dialog modes

`DialogComponent` renders three configurations through its `dialog` input:

| `mode` | Input and behavior |
| --- | --- |
| `confirmation` (default) | Ready text and actions from `DialogStore`, or `DialogLocalConfig` with `useStore="false"`. |
| `tour` | `TourDialogConfig`: ready steps, sections and labels, surface/field resolution options, and navigation callbacks. Follows moving targets and popup transitions. |
| `explanation` | `ExplanationDialogConfig`: ready popup text and sections with HTML, icons and layout metadata, plus a close action. |

The tour and explanation renderers load when their mode is first requested.
The application owns content loading, translation, preferences and persistence.
Editor, version and audit DTOs stay in the application; the package exposes only
display contracts. `GUIDE_CONTEXT` optionally connects popup context registration
and SmartList coordination to the host's state, with an inert default.

Confirmation text is prepared by `DialogStore` through `DIALOG_TEXT` (identity
by default). An application can provide its existing translator there; signal
reads in that callback keep the prepared text current. The dialog renderers
receive ready text and do not invoke a translation service.

The PDF catalogue describes the earlier 1.4.0 API. The mode configuration above
and the current public exports describe the 1.5.0 dialog API; application-owned
`ExplanationGuideService` and editor DTOs are no longer package exports.

## Development

```sh
npm ci
npm run build
npm test
```

Consumers install an exact published version and run their own Angular build.
They do not need a components Git submodule, npm workspace or library compiler.
Run component development and focused library tests in this repository. Run one
compiler per target; reuse a running watcher.
Use `npm run test:coverage -- --include=src/path/to/owner.spec.ts` for a focused
LCOV report in `coverage/components/lcov.info`. The library owns its Sonar settings;
run the shared Sonar tool against this repository, not an application dependency.
Every test run also writes `test-results/sonar.xml` through the reporter configured
in `angular.json`. Sonar imports test counts, durations and failures from that report;
coverage is imported separately from LCOV. Both generated report directories are ignored.
Generate reports for the full suite before a complete Sonar analysis:

```sh
npm run test:coverage
../myscoutee-sonarqube/run.sh . scan components
```

See [Contributing](CONTRIBUTING.md) for focused changes.

## License and credit

Original code and documentation: [CC BY 4.0](LICENSE). When sharing, credit
**MyScoutee (fssrepository)**, link to the source and license, retain notices
and indicate changes. Copyright © 2026, fssrepository.
Use your own product name and logo; MyScoutee artwork follows [BRANDING.md](BRANDING.md).
