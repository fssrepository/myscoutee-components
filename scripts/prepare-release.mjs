import { readFile, writeFile, cp, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
for (const name of ['contextual-colors', 'form-controls', 'material', 'media-badge', 'motion',
  'popup', 'popup-close-button', 'rate-card.shared', 'smart-list-shell']) {
  pkg.exports[`./styles/${name}`] = { sass: `./styles/_${name}.scss` };
}
pkg.files = ['fesm2022/*.mjs', 'types/**/*.d.ts', 'styles/**/*.scss',
  'README.md', 'LICENSE', 'BRANDING.md', 'CONTRIBUTING.md', 'CHANGELOG.md'];
for (const file of [pkg.main, pkg.types, './styles/index.scss']) await access(path.join(output, file));
for (const file of ['README.md', 'LICENSE', 'BRANDING.md', 'CONTRIBUTING.md', 'CHANGELOG.md']) {
  await cp(path.join(root, file), path.join(output, file));
}
await writeFile(path.join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
console.log(`Prepared ${pkg.name}@${pkg.version} for ${pkg.publishConfig.registry}`);
