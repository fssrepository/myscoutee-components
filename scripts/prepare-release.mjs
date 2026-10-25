import { readFile, writeFile, cp, access, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { JavaScriptTransformer } from '@angular/build/private';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const output = path.join(root, 'dist');
const pkg = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8'));
// frontend-sync already builds the library; ng-packagr substitutes a timestamp
// version in watch mode. Prepare a separate copy of that completed output.
const watchBuild = /^0\.0\.0-watch\+\d+$/.test(pkg.version);
if (pkg.name !== source.name || (pkg.version !== source.version && !watchBuild)) {
  throw new Error('Build identity does not match the source package.');
}
pkg.version = source.version;
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`) {
  throw new Error('Git tag and package version differ.');
}
// The source workspace resolves dist/. The published package is dist itself.
delete pkg.private;
pkg.main = './fesm2022/components.mjs';
pkg.module = pkg.main;
pkg.types = './types/components.d.ts';
pkg.typings = pkg.types;
pkg.exports['.'] = { types: pkg.types, default: pkg.main };
pkg.exports['./styles'] = { sass: './styles/index.scss' };
pkg.exports['./styles/fonts.css'] = { style: './styles/fonts.css', default: './styles/fonts.css' };
for (const name of ['contextual-colors', 'form-controls', 'material', 'media-badge', 'motion',
  'popup', 'popup-close-button', 'rate-card.shared', 'smart-list-shell']) {
  pkg.exports[`./styles/${name}`] = { sass: `./styles/_${name}.scss` };
}
pkg.files = ['fesm2022/*.mjs', 'types/**/*.d.ts', 'styles/**/*.scss', 'styles/**/*.css',
  'assets/fonts/**/*',
  'README.md', 'LICENSE', 'BRANDING.md', 'CONTRIBUTING.md', 'CHANGELOG.md'];
const exportFiles = Object.values(pkg.exports).flatMap(target =>
  typeof target === 'string' ? [target] : Object.values(target));
for (const file of new Set([pkg.main, pkg.types, './styles/index.scss', ...exportFiles])) {
  await access(path.join(output, file));
}
for (const file of ['README.md', 'LICENSE', 'BRANDING.md', 'CONTRIBUTING.md', 'CHANGELOG.md']) {
  await cp(path.join(root, file), path.join(output, file));
}
await writeFile(path.join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// Exercise the packaged API with the standalone bundler used by seed tooling.
// Preserve ESM loading boundaries, including lazy imports, as seed tooling does.
await import('@angular/compiler');
const foundation = await import(pathToFileURL(path.join(output, 'fesm2022/components-foundation.mjs')));
const names = Object.keys(foundation);
const fixture = await mkdtemp(path.join(tmpdir(), 'components-release-api-'));
try {
  const installed = path.join(fixture, 'node_modules', pkg.name);
  await mkdir(path.dirname(installed), { recursive: true });
  await cp(output, installed, { recursive: true });
  for (const entry of ['', '/core']) {
    const bundleDirectory = path.join(fixture, entry ? 'core' : 'root');
    await build({
      stdin: {
        contents: `export { ${names.join(', ')} } from '${pkg.name}${entry}';`,
        resolveDir: fixture,
      },
      nodePaths: [path.join(root, 'node_modules')],
      inject: [fileURLToPath(import.meta.resolve('@angular/compiler'))],
      bundle: true, splitting: true, outdir: bundleDirectory,
      outExtension: { '.js': '.mjs' }, platform: 'node', format: 'esm',
    });
    const bundle = path.join(bundleDirectory, 'stdin.mjs');
    const api = await import(pathToFileURL(bundle));
    const missing = names.filter(name => api[name] === undefined);
    if (missing.length) {
      throw new Error(`Bundled ${pkg.name}${entry} exports are unavailable: ${missing.join(', ')}`);
    }
  }

  // The public root must preserve the original lazy form/date/gallery boundary.
  // Link the published Angular code with the same transformer as application builds.
  const startup = path.join(fixture, 'startup.mjs');
  await writeFile(startup, `
    import { IndicatorComponent, I18nPipe, provideUiTranslations, AppMenuComponent, AppMenuTriggerComponent } from '${pkg.name}';
    export const initial = [IndicatorComponent, I18nPipe, provideUiTranslations, AppMenuComponent, AppMenuTriggerComponent];
    export const open = () => import('./feature.mjs');
  `);
  await writeFile(path.join(fixture, 'feature.mjs'), `
    export { FormFlowComponent, ImageGalleryComponent } from '${pkg.name}';
  `);
  const transformer = new JavaScriptTransformer({ sourcemap: false, advancedOptimizations: true });
  try {
    const result = await build({
      entryPoints: [startup], outdir: path.join(fixture, 'loading'),
      bundle: true, splitting: true, format: 'esm', write: false, metafile: true,
      define: { ngDevMode: 'false', ngJitMode: 'false' },
      external: ['@angular/*', 'rxjs', 'rxjs/*'],
      plugins: [{ name: 'angular-linker', setup(builder) {
        builder.onLoad({ filter: /\/fesm2022\/.*\.mjs$/ }, async args => ({
          contents: await transformer.transformFile(args.path, false, { sideEffects: async () => false }),
          loader: 'js', resolveDir: path.dirname(args.path),
        }));
      } }],
    });
    const outputs = result.metafile.outputs;
    const initial = new Set();
    const visit = name => {
      if (initial.has(name)) return;
      initial.add(name);
      for (const imported of outputs[name]?.imports ?? []) {
        if (!imported.external && imported.kind !== 'dynamic-import') visit(imported.path);
      }
    };
    const entry = Object.entries(outputs).find(([, meta]) => meta.entryPoint === path.relative(process.cwd(), startup));
    if (!entry) throw new Error('Missing startup fixture output.');
    visit(entry[0]);
    const initialCode = result.outputFiles
      .filter(file => initial.has(path.relative(process.cwd(), file.path)))
      .map(file => file.text).join('\n');
    const allCode = result.outputFiles.map(file => file.text).join('\n');
    const paletteCopies = (initialCode.match(/\.app-menu__palette--default/g) ?? []).length;
    if (paletteCopies !== 1) {
      throw new Error(`Menu renderers must share one palette stylesheet; found ${paletteCopies}.`);
    }
    for (const selector of ['app-form-flow', 'app-date-input', 'app-image-gallery']) {
      if (initialCode.includes(selector) || !allCode.includes(selector)) {
        throw new Error(`Public root must load ${selector} only with the lazy feature.`);
      }
    }
  } finally {
    await transformer.close();
  }
} finally {
  await rm(fixture, { recursive: true, force: true });
}
console.log(`Prepared ${pkg.name}@${pkg.version} for ${pkg.publishConfig.registry}`);
