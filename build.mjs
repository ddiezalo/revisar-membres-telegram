import {readdir, copyFile, rm, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');

// Copy static extension assets without fs.cp(), which may call chmod()
// and fail with EPERM on Windows/OneDrive directories.
async function copyTree(source, destination) {
  await mkdir(destination, {recursive: true});
  for (const entry of await readdir(source, {withFileTypes: true})) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to);
    } else if (entry.isFile()) {
      await copyFile(from, to);
    } else {
      throw new Error(`Tipus de fitxer no admès: ${from}`);
    }
  }
}

await rm(out, {recursive: true, force: true});
await copyTree(path.join(root, 'extension'), out);
await copyFile(path.join(root, 'LICENSE'), path.join(out, 'LICENSE'));
await copyFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(out, 'THIRD_PARTY_NOTICES.md'));

execFileSync(
  process.execPath,
  [path.join(root, 'node_modules/webpack/bin/webpack.js'), '--config', path.join(root, 'webpack.config.cjs')],
  {cwd: root, stdio: 'inherit'}
);
// Retain license/NOTICE texts of runtime npm dependencies in the published bundle.
execFileSync(process.execPath, [path.join(root, 'scripts/collect-licenses.mjs')],
  {cwd: root, stdio: 'inherit'});
console.log('Extensió preparada a ./dist');
