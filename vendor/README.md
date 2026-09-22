# vendor/

`wingfoil-<label>-<sha>.tgz` — the WingFoil CLI that manages this repository, packed with `npm pack`
from a clean `git archive` of the WingFoil repository at commit `<sha>`. Bump it deliberately, in its own
commit; it is not the WingFoil version under test.

The `<label>` names the WingFoil release line the build belongs to (for example `0.2-pre` for a
pre-release of v0.2). It is needed because WingFoil's own `package.json` version is not always bumped,
so `npx wingfoil --version` does not identify the build. The `<sha>` does.

Current: `wingfoil-0.2-pre-3df305e.tgz` (WingFoil v0.2 pre-release, commit `3df305e`).
