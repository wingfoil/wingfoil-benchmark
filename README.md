# WingFoil Benchmark

Benchmark suite that measures **where WingFoil makes a difference** in AI-assisted software
development: the same scenarios are executed by AI agents with and without WingFoil (and with
competing tools), and compared on quality, cost and determinism.

> **Status:** inception. Vision, personas, scope and the experiment design are being defined;
> no scenario or runner exists yet.

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
