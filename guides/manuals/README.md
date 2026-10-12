# Components guide

Edit `components-guide-en.html`; `MyScoutee_Components_Guide_EN.pdf` is its
stable downloadable output. Update document metadata and `manuals.json` together.

Reuse the MyScoutee Template manual renderer from a sibling checkout, with its
frontend Playwright dependency and Chrome/Chromium installed:

```sh
node ../myscoutee-template/guides/manuals/build-manuals.mjs \
  --catalog guides/manuals/manuals.json MSC-COMP-001
pdfinfo guides/manuals/MyScoutee_Components_Guide_EN.pdf
```

This generates documentation only. It does not build or start the application.
Inspect the generated pages before committing the HTML and PDF together.
