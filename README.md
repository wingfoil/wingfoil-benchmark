# WingFoil Benchmark

Benchmark suite that measures **where WingFoil makes a difference** in AI-assisted software
development: the same scenarios are executed by AI agents with and without WingFoil (and with
competing tools), and compared on quality, cost and determinism.

> **Status:** inception and specification complete (see [`docs/01_vision/`](docs/01_vision/) and
> [`docs/02_specification/`](docs/02_specification/)); release v0.1 is in development
> ([`docs/memory/release/rel-v0-1.md`](docs/memory/release/rel-v0-1.md)). The scenario format exists;
> the runner does not yet.

## Tooling

This repository is itself managed with WingFoil. The WingFoil version that manages this repository
is pinned in `vendor/` (built from a fixed WingFoil commit) and is **independent** of the WingFoil
version under test, which each benchmark campaign selects on its own.

```bash
npm install
npx wingfoil --help
```

Private oracles and hold-out scenarios live in a separate, private repository.

## Development

One TypeScript package (Node.js ≥ 22.12), organized as modules under `src/` that depend only downwards
(`docs/02_specification/requirements.md` REQ-ARC-01/02; the lint enforces the rule).

```bash
npm test          # unit and acceptance tests, coverage at or above 80%
npm run lint      # ESLint and Prettier
npm run typecheck
npm run build     # compiles src/ into dist/
```

Acceptance tests live in `test/acceptance/`, one per Gherkin scenario of
`docs/02_specification/acceptance/`, named `@<feature> <scenario title>`. A traceability test fails
when a scenario of a started task has no test.

Scenarios live in `scenarios/<id>/<version>/scenario.yaml`. The trivial scenario used by the runner's
own tests is `test/fixtures/scenarios/T0/1.0/`.

## License

MIT — see [LICENSE](LICENSE).
