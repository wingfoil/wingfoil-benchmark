# Which tools are eligible, and why

A harness gets an arm in this benchmark only when it meets five published criteria. They are applied **before** an
arm is built, and to **every** tool, WingFoil included: a tool is admitted by the rule, never by choice.

## The five criteria

1. **agent-and-model** — it runs with the campaign's agent and model id: the agent the benchmark meters, on the model
   every arm shares. A tool that brings its own agent, or forces another model, would compare something else.
2. **pinnable** — its version can be pinned and installed reproducibly: a release or a commit, installed the same way
   every time, so that a result names the tool it measured.
3. **headless-container** — it runs headless in a container: no terminal, browser or person in the loop beyond the
   approver's answers, which every arm receives from the same neutral approver.
4. **workflow-harness** — it is a workflow harness, not only a standards or prompt pack: it gives the agent a process
   to follow, which is what the benchmark measures.
5. **no-own-llm** — it calls no LLM of its own: every model call is the agent's, so that every arm's cost and tokens
   are metered the same way.

## How a tool is assessed

- One assessment per tool **and version**, dated, each criterion `pass` or `fail` with its evidence and its source.
  An assessment made from a tool's documentation says so, and is redone when a spike or the arm's own task runs it.
- The verdict follows the criteria: **admitted** when all five pass, **excluded** when one fails, with the reason.
- A campaign may pin only a version the register admits. A new release is assessed before a campaign pins it.
- Admitted does not mean measured: which admitted tools get an arm in a release is that release's scope.
- Telemetry is not a criterion: every arm's tool runs with its telemetry off, a deviation published with its setup.

## The register

This is the register as it stands when this site was built, so that every execution's site shows the current
assessments. Each campaign was checked, when it ran, against the register of that day; an assessment's date is kept in
[`eligibility/register.yaml`](https://github.com/wingfoil/wingfoil-benchmark/blob/main/eligibility/register.yaml).

<!-- register -->
