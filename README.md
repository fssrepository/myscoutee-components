# MyScoutee Components

Reusable UI components from MyScoutee, intended for use in other projects.

[License](LICENSE) · [Logo & attribution](BRANDING.md) ·
[Contributing](CONTRIBUTING.md)

## About

This repository owns the shared Angular UI implementation. MyScoutee includes
it as the `myscoutee-components` Git submodule inside its frontend repository.
The application imports the public TypeScript API and Sass modules directly.

## Build independently

Use Node.js 24 and npm 11, then run in this repository:

```sh
npm ci
npm run build
npm test
```

The build uses only this repository and its declared dependencies. Output is
written to `dist/` (gitignored). `npm test` runs the co-located component,
store, directive and helper specs from this repository without MyScoutee. `npm run watch` rebuilds on source changes. This is a private
buildable library; registry publication is not part of the development workflow.

## Use as a submodule

The consuming frontend records the GitHub repository URL and an exact commit:

```sh
git submodule update --init --recursive
git -C myscoutee-components switch master
npm ci
npm run build:components
```

MyScoutee's existing build, serve, test and dev-stack watcher invoke this
repository's build before compiling the application. Watch mode keeps one
library watcher and one application watcher. The application consumes `dist/`
through its npm workspace dependency; it has no second copy of the implementation.

If editing another checkout of this repository, commit there first, then update
the consuming submodule with `git merge --ff-only` on `master`.
Keep both checkouts on `master`; do not check out detached commits. Uncommitted changes in separate Git
checkouts are independent. No absolute workstation path is part of integration.

## Application adapters

Import the public API from `@myscoutee/components`. Supply `UI_TRANSLATIONS`
(or `provideUiTranslations`), `EXPLANATION_GUIDE_OPTIONS`, and the features used
by the application: `UI_IMAGE_UPLOAD`, `UI_IMAGE_URLS`, `UI_IMAGE_DETAILS`,
`UI_BRANDING`, `UI_LIST_DEFAULTS`, and `FORM_FLOW_CONTROLS`.

These providers reuse the consumer's services. The library contains no
MyScoutee API calls, event/pricing/policy models, brand assets, or translation
session. FormFlow registers the actual consumer controls lazily and uses their existing
ControlValueAccessor methods. Configuration maps inputs and outputs; there are
no per-control wrapper components. Providers share a scope within one form.
General gallery metadata survives edits; application-specific association,
validation and selection remain in the consumer's image-details adapter.

Shared Sass is exposed as `@myscoutee/components/styles` and its public submodules. The consuming application retains its
existing global theme and imports these shared styles. Backend monolith and
microservice composition are unaffected by this frontend source boundary.

## Menu toggles and calendar conversion

Use `AppMenuComponent` with `kind="inline"`, `layout="row"` and a menu item
such as `{id: 'enabled', kind: 'toggle', toggleStyle: 'on-off', checked: enabled}`.
This uses the existing menu selection event and disabled handling. The on/off
presentation derives its translated state label and icon; ordinary `label`,
`icon` and `ariaLabel` configuration can override them. A form-bound menu keeps
its existing selected-value array contract; FormFlow header toggles keep their
boolean field contract. There is no separate toggle component.

`CalendarCardConverter`, `calendarCardConverter` and its input type are exported
from `@myscoutee/components`. The converter preserves caller-owned pages, query
and callbacks and defaults non-calendar view modes to month.

## License — free to reuse with required credit

The repository's original code and documentation are licensed under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE).
Anyone may copy, modify and redistribute them, including commercially.

**Attribution is a condition of the license, not an optional request.**
When sharing the material, including modified versions, follow **Section 3(a)**
of [LICENSE](LICENSE): credit **MyScoutee (fssrepository)**, retain the required
notices, link to the source and license, and indicate changes.

Place the credit somewhere readers or users can access it, as appropriate to
what you share: a README, documentation, an About/Credits page or a website
footer. The full, unmodified standard license text is in [LICENSE](LICENSE).
The attribution information for this repository is supplied in the credit
below. This requirement applies when you share the licensed material; private
use alone does not require publishing a credit.

Example credit (also describe changes if you made any):

> Uses [MyScoutee Components](https://github.com/fssrepository/myscoutee-components)
> by MyScoutee (fssrepository). Copyright © 2026, fssrepository.
> Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Provided without warranties; see [LICENSE](LICENSE), Section 5.

MyScoutee logos and brand artwork are excluded from CC BY 4.0 and follow
[BRANDING.md](BRANDING.md). Separately identified third-party material retains
its own license and notices.

## Make it your own

Use your own project name and logo. Any MyScoutee logo in template source,
examples or UI is demonstration branding: remove or replace it wherever it
identifies your product, including an adapted README header.

You may display the MyScoutee logo in a clearly labeled source-credit section
or when demonstrating the original MyScoutee project. It must not suggest that
your project is MyScoutee, an official MyScoutee service, or endorsed by its
maintainers. A text credit satisfies attribution; displaying the logo is not
required. See [BRANDING.md](BRANDING.md).

## Contributing

Bug reports, documentation improvements and focused pull requests are welcome.
Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Related project

[MyScoutee Template](https://github.com/fssrepository/myscoutee-template)
is the companion repository for reusable project infrastructure.
