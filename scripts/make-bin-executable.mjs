// `tsc` writes plain files, so the compiled bin would not run (`npx bench` → Permission denied).
// This is the build's last step; `npm run test:bin` checks the result.
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

chmodSync(fileURLToPath(new URL('../dist/cli/main.js', import.meta.url)), 0o755);
