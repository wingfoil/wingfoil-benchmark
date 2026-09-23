// `tsc` writes plain files, so the compiled bin would not run (`npx bench` → Permission denied).
// This is the build's last step; `npm run test:bin` checks the result.
import { chmodSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../dist/cli/main.js', import.meta.url));
if (!existsSync(bin)) {
  console.error(`${bin} does not exist: run tsc first (npm run build does both)`);
  process.exit(1);
}
chmodSync(bin, 0o755);
