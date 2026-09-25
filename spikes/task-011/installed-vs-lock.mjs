// Every installed package (by its node_modules path) against the lockfile entry at the same path.
// Usage: node installed-vs-lock.mjs <install root holding node_modules> <package-lock.json>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [root, lockFile] = process.argv.slice(2);
const lock = JSON.parse(readFileSync(lockFile, 'utf8')).packages;
const found = [];
const scan = (rel) => {
  const dir = join(root, rel, 'node_modules');
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const names = name.startsWith('@') ? readdirSync(join(dir, name)).map((n) => `${name}/${n}`) : [name];
    for (const n of names) {
      const path = `${rel ? `${rel}/` : ''}node_modules/${n}`;
      const pj = join(root, path, 'package.json');
      if (existsSync(pj)) { found.push([path, JSON.parse(readFileSync(pj, 'utf8')).version]); scan(path); }
    }
  }
};
scan('');
let differ = 0, absent = 0;
for (const [path, version] of found) {
  // An install of the tarball nests everything under node_modules/wingfoil/; strip it for the lookup.
  const key = path.replace(/^node_modules\/wingfoil\//, '');
  const want = lock[key]?.version;
  if (want === undefined) { if (!path.startsWith('node_modules/wingfoil') || key !== path) absent++; }
  else if (want !== version) { differ++; if (differ <= 5) console.log(`  ${key}: installed ${version}, lock ${want}`); }
}
const runtime = Object.entries(lock).filter(([k, v]) => k.startsWith('node_modules/') && !v.dev).length;
console.log(`  ${found.length} installed, ${differ} at another version than the lock, ${absent} not in the lock at that path; lock has ${runtime} runtime entries`);
