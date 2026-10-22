# Contributing to MyScoutee Components

Contributions are welcome: documentation, bug reports, reproducible examples
and focused improvements to reusable UI components.

This repository owns the shared Angular implementation. Use `npm ci` and
`npm run build` and `npm test` here. Generic specs live beside their owner
and run with this repository’s Angular test runner. MyScoutee keeps only its
application integration tests in the consumer runner.
Keep business services and models in the consuming application.

## Issues

Search [existing issues](https://github.com/fssrepository/myscoutee-components/issues)
before opening a new one. For a bug, include reproduction steps, expected and
actual behavior, and relevant version or environment details. For UI issues,
include a screenshot if it helps explain the problem. For a larger change,
explain the concrete problem in an issue before investing in a pull request.
Do not include credentials or private data.

## Pull requests

1. Fork the repository and create a branch for one focused change.
2. Reuse existing components and conventions where available.
3. Update affected documentation. For code changes, include relevant tests or
   explain how you verified the behavior using the project's existing tooling.
4. Check relative links and image paths for documentation changes.
5. Open a pull request describing the problem, the change and verification.
   State any checks you could not run.

Documentation-only contributions do not need an application build. Commit a
component change, build the library, then use `npm run prepare:release` and publish
the prepared distribution. Consumers update their exact npm dependency and lockfile
after publication. Separate checkouts do not share uncommitted edits.

## License and branding

Submit only work you have the right to contribute. Unless explicitly identified
as separately licensed material, contributions to code and documentation are
provided under the repository's [CC BY 4.0 License](LICENSE). Follow its
Section 3(a) attribution conditions. Preserve third-party license notices and identify any separately licensed material.

MyScoutee logos and brand artwork follow [BRANDING.md](BRANDING.md), rather than
the software license. Keep demonstration branding distinct from the identity
of projects built with the components.
