# WingFoil Benchmark

Benchmark suite that measures **where WingFoil makes a difference** in AI-assisted software
development: the same scenarios are executed by AI agents with and without WingFoil (and with
competing tools), and compared on quality, cost and determinism.

> **Status:** inception and specification complete (see [`docs/01_vision/`](docs/01_vision/) and
> [`docs/02_specification/`](docs/02_specification/)); delivery of release v0.1 is next. No scenario
> or runner exists yet.

## Tooling

This repository is itself managed with WingFoil. The WingFoil version that manages this repository
is pinned in `vendor/` (built from a fixed WingFoil commit) and is **independent** of the WingFoil
version under test, which each benchmark campaign selects on its own.

```bash
npm install
npx wingfoil --help
```

Private oracles and hold-out scenarios live in a separate, private repository.

## License

MIT — see [LICENSE](LICENSE).
