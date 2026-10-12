# MyScoutee Components

Reusable Angular controls for forms, menus, popups, SmartLists, calendars,
media and loading indicators. Applications provide their own data, services,
translations and branding.

## Install

Requires Angular 21.2, RxJS 7.8 and compatible Angular Material/CDK peers.
Development uses Node.js 24 and npm 11.

Configure `@fssrepository:registry=https://npm.pkg.github.com` in `.npmrc`,
then authenticate with a GitHub token with `read:packages` in your user-level
configuration. Keep credentials out of Git.

```sh
npm install @fssrepository/myscoutee-components@1.4.0
```

## Documentation

| Document | Link |
| --- | --- |
| Component catalogue, setup, examples, styles and release workflow | [PDF](https://github.com/fssrepository/myscoutee-components/blob/master/guides/manuals/MyScoutee_Components_Guide_EN.pdf) |
| Editable guide and PDF regeneration | [HTML](guides/manuals/components-guide-en.html) · [Instructions](guides/manuals/README.md) |
| Public API | [Exports](src/public-api.ts) |
| Changes | [Changelog](CHANGELOG.md) · [1.4.0 release notes](releases/v1.4.0.md) |
| Complete application foundation | [MyScoutee Template](https://github.com/fssrepository/myscoutee-template) |

## Development

```sh
npm ci
npm run build
npm test
```

In a consuming MyScoutee checkout, use its existing components workspace and
build workflow. Run one compiler per target; reuse a running watcher.
See [Contributing](CONTRIBUTING.md) for focused changes.

## License and credit

Original code and documentation: [CC BY 4.0](LICENSE). When sharing, credit
**MyScoutee (fssrepository)**, link to the source and license, retain notices
and indicate changes. Copyright © 2026, fssrepository.
Use your own product name and logo; MyScoutee artwork follows [BRANDING.md](BRANDING.md).
