import {readFile, readdir, copyFile, mkdir, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
const output = join(root,'dist','third-party-licenses');
await mkdir(output,{recursive:true});
const entries = [];
for (const [key, pkg] of Object.entries(lock.packages)) {
  if (!key.startsWith('node_modules/') || pkg.dev) continue;
  const relative = key.slice('node_modules/'.length);
  const packageDir = join(root, 'node_modules', relative);
  const files = await readdir(packageDir).catch(() => []);
  const candidates = files.filter(x => /^(LICENSE|LICENCE|COPYING|NOTICE)([.-].*)?$/i.test(x));
  const info = {name:relative, version:pkg.version || null, license:pkg.license || null, files:[]};
  for (const file of candidates) {
    const outputFile = join(output,relative,file);
    await mkdir(dirname(outputFile),{recursive:true});
    await copyFile(join(packageDir,file),outputFile);
    info.files.push(`${relative}/${file}`);
  }
  entries.push(info);
  if (!candidates.length) console.warn(`Cap text LICENSE/NOTICE a l’arrel npm: ${relative}`);
}
await writeFile(join(output,'INDEX.json'), JSON.stringify(entries,null,2)+'\n');
console.log(`Recollits els avisos originals de ${entries.length} paquets npm d’execució.`);
