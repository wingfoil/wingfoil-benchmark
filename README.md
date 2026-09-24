# WingFoil Benchmark

Benchmark suite that measures **where WingFoil makes a difference** in AI-assisted software
development: the same scenarios are executed by AI agents with and without WingFoil (and with
competing tools), and compared on quality, cost and determinism.

> **Status:** inception and specification complete (see [`docs/01_vision/`](docs/01_vision/) and
> [`docs/02_specification/`](docs/02_specification/)); release v0.1 is in development
> ([`docs/memory/release/rel-v0-1.md`](docs/memory/release/rel-v0-1.md)). The scenario and campaign
> formats exist, and `bench campaign run` executes a scenario in a container, one fresh agent session
> per step, recording what each session cost and what it said. Claude Code can now be the agent; a
> campaign that names it refuses to start without an explicit opt-in to spend.

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

## Commands

`npm run build` compiles the `bench` command; then:

```bash
npx bench campaign validate campaigns/<name>.yaml
```

```bash
BENCH_FAKE_SCRIPT=<script.json> npx bench campaign run campaigns/<name>.yaml
```

```bash
BENCH_AGENT_TOKEN_FILE=<token-file> npx bench campaign run campaigns/<name>.yaml --allow-spending
```

`validate` checks the campaign file (`docs/02_specification/requirements.md` REQ-FMT-01): every harness pinned
to a released version or a commit, the baseline arm present, every scenario it names present under
`scenarios/<id>/<version>/`. It prints the campaign's identity, the digest that names its results.
`run` executes every scenario × arm × repetition: one Docker image per campaign, one container per
run, whose only mount is that run's fresh workspace (a copy of the scenario seed, made a git
repository). Workspaces land in `runs/<campaign-id>/<n>/`, the execution in
`results/<campaign-id>/<n>/`, which holds `run.json` per run and `steps/<NN>/{usage.json,
transcript.jsonl, diff.patch}` per step. Transcripts are git-ignored.

Each step is a **fresh agent session**: nothing but the repository carries state from one step to the
next, and after each step the workspace is committed as `step <NN>`.

Which agent runs is the campaign's `agent.name`. The **scripted fake agent** costs nothing and reads
its script from `BENCH_FAKE_SCRIPT`; a script may name a recorded session for the fake to replay, so
the whole pipeline can be exercised without an agent. **Claude Code** reads its long-lived token from
the file named by `BENCH_AGENT_TOKEN_FILE` — created with `claude setup-token` — which reaches the
container as an environment variable and is scrubbed out of every stored transcript. Because it
spends real money, a campaign naming it refuses to start unless `--allow-spending` is passed.

Exit codes: `0` success, `1` failure (one line per problem, or a run that failed), `2` usage error.

```bash
npm run test:bin     # the built command line
npm run test:docker  # one scenario in a real container (needs Docker)
```

## License

MIT — see [LICENSE](LICENSE).
