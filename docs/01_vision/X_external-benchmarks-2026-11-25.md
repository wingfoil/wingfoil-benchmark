# External benchmarks — 2026-11-25

**Status:** context for v0.4's delivery ([plan-006](../plans/plan-006-release-v0.4.md)), not an approved document.
External figures are context and sources of hypotheses, written before runs like H1–H11; they are never mixed with
the benchmark's results. Its proposals for v0.4 go to the approver as a triage against plan-006's waves and are not
recorded here.

**How it was made:** a cloud research session read the sources through web fetches on 2026-11-25, with no install and
no run. Fetch summaries paraphrase the pages: a figure marked **[S]** comes from a fetched page's model-made summary,
not verbatim text, and a figure marked **[2nd]** is second-hand. Every such figure is re-read at the primary source
before a task, a finding, a hypothesis or the method page cites it (*(re-check)*); the open checks are listed at the
end. A citation always names the source and states its reliability grade next to it.

**Why it matters.** Most external harness benchmarks swap one harness for another with the model fixed (Claude Code,
Codex, Pi, …), on single-session tasks scored by pass rate. This benchmark measures a process-and-memory harness on
top of an agent, across sessions, against docs controls. No external work found measures that: file-based process
and memory on Claude Code against a control. "From Prompt to Process" (source 17) names the absence of whole-process
benchmarks as a risk. The external work is still useful for metrics, control arms, hypotheses and cost diagnostics.

## Source register

Grades: **A** primary, independent, method stated · **B** primary, preprint or single run or small n ·
**C** secondary write-up, or primary with commercial interest · **D** vendor-run claims about its own product.

| # | Source | Kind | Date | Grade | URL |
|---|---|---|---|---|---|
| 1 | Harness Leaderboard (Joël Niklaus) | 9 harnesses, model fixed | 2026 (v0.1.2) | **C** as read (only a secondary write-up was read; the board itself not fetched) | board: https://joelniklaus-harness-leaderboard.hf.space/ · write-up: https://www.remio.ai/post/niklaus-harness-leaderboard-tests-kimi-code-hermes-pi-claude-code-and-codex-beyo |
| 2 | imec aistack, "Does your harness matter more than your model?" | 3 harnesses × 2 open models | 2026-09 | **B** (research institute, one run per cell) | https://aistack.imec-int.com/blog/harness-cost |
| 3 | AWS Strands Harness benchmarks | harness vs Claude Code, Codex, others | 2026-09-21 | **D** (vendor; paper not out) | https://lilting.ch/en/articles/aws-strands-harness-open-source-agent · https://www.theregister.com/a/5297915 |
| 4 | tokenecon, "Every Agent Run Should Come With a Receipt" | cost method | 2026-10-13 | **C** (individual author, author of the tool) | https://builder.aws.com/content/3KexbQmMtjr4M9sB12oke2knKeL/every-agent-run-should-come-with-a-receipt |
| 5 | AIMultiple AIM-Code Bench | 13 model+agent configs, one project, handover | 2026-10-09 (upd. 11-18) | **C** (consultancy; one selected trajectory per config) | https://aimultiple.com/agentic-llm · hub: https://aimultiple.com/ai-coding |
| 6 | Winder.ai, harness comparison + harness engineering | qualitative | 2026-08-20, 2026-10-11 | **C** (no own measurements; sells consulting and Helix, disclosed) | https://winder.ai/ai-agent-harness-comparison/ · https://winder.ai/harness-engineering/ |
| 7 | BenchGen docs | method advice | n.d. | **C** (commercial platform; no blog found, benchgen.ai/blog empty) | https://benchgen.com/docs/guides/benchgen-ai-agent/fixing-a-benchmark.md |
| 8 | Evaluating AGENTS.md (ETH Zurich, LogicStar) | context files, incl. Claude Code + Sonnet 4.5 | v3 2026-09-29 | **B** | https://arxiv.org/abs/2602.11988 |
| 9 | OctoBench (Fudan, MiniMax, PKU) | instruction following in scaffolds, incl. Claude Code | 2026-01 | **B** | https://arxiv.org/abs/2601.10343 |
| 10 | DreamBench-SWE (single independent author) | multi-session memory traps | 2026-08-21 | **B** (code public) | https://arxiv.org/abs/2608.20664 |
| 11 | VibeMemBench (CAS, Alibaba) | memory systems on repo tasks | 2026-09-20 | **B** (code public) | https://arxiv.org/abs/2609.23570 |
| 12 | MemoryArena (Stanford et al.) | multi-session memory, not coding | v2 2026-09-17 | **B** (ICML 2026 per arXiv comment, unverified) | https://arxiv.org/abs/2602.16313 |
| 13 | MemTrace (SJTU et al.) | state-consistent memory | 2026-10 | **B−** (authors evaluate their own system) | https://arxiv.org/abs/2610.04838 |
| 14 | SWE-CI (Sun Yat-sen, Alibaba) | codebase maintenance via CI loop | v4 2026-04-01 | **B** (data public) | https://arxiv.org/abs/2603.03823 |
| 15 | A Gated Spec-Driven Workflow (IF Brasília) | audit-trail study, Claude Code + Opus 5 | 2026-11-03 | **C** (observational, no control, authors designed the workflow) | https://arxiv.org/abs/2611.05094 |
| 16 | Spec Kit Agents | hooks around Spec Kit | 2026-04-07 | **B−** (one generator model, LLM judge) | https://arxiv.org/abs/2604.05278 |
| 17 | From Prompt to Process (IFG) | taxonomy of 6 SDD frameworks | 2026-06 | **C** (no experiments, single rater, author of Reversa, disclosed) | https://arxiv.org/abs/2606.04967 |

Seen but not read in depth: SWE-EVO https://arxiv.org/abs/2512.18470 · SWE-Bench-CL https://arxiv.org/abs/2507.00014 ·
ProjDevBench https://arxiv.org/abs/2602.01655 · AMA-Bench https://arxiv.org/abs/2602.22769 ·
dev.to "Harness leaderboards are the new model leaderboards" https://dev.to/max_quimby/harness-leaderboards-are-the-new-model-leaderboards-2omm (C, author's company sells harness content).

## Findings per source

### 1. Harness Leaderboard — grade C as read
- Method: 9 harnesses (Kimi Code, Hermes Agent, Pi, Claude Code, Codex, OpenCode, mini-swe-agent, Qwen Code,
  OpenClaw); model, provider and reasoning effort fixed; Terminal-Bench 2.1 and DeepSWE; 3 attempts per task;
  28,849 trials; accuracy–cost Pareto plot. **[2nd]**
- mini-swe-agent 51.4% mean solve rate, OpenClaw 27.3%; four harnesses statistically tied with the leader. **[2nd]**
- Repeatability (mini-swe-agent): 51.4% per attempt, 68.6% at least once in 3, **33.0% on every attempt**. **[2nd]**
- The model-specific leader changes per model. **[2nd]**

### 2. imec — grade B
- 64 tasks from SWE-Bench Pro; Claude Code, Codex, Pi at default settings; Qwen3.8-27B and GLM-5.3-Flash; one run
  per cell.
- Resolve rate 44–53% in every cell (about 2–3 tasks apart).
- Cost differs: on GLM, Claude Code and Pi cost about $45 per sweep against Codex's $22.8, for a similar resolve
  rate. Input tokens GLM: Claude Code 480.2M, Codex 192.1M, Pi 366.4M.
- An unpatched Claude Code build (v2.1.233) showed a **29.84% prefix-cache hit rate** against ~97% patched
  (anthropics/claude-code issue 87227 cited).
- Pi doom-loops excluded. Authors' conclusion: harness matters less than expected for resolution; cost differs by
  wall time, tokens and stability.

### 3. Strands Harness — grade D
- AWS ran it with Harbor on EC2: six suites (ALFWorld, ContextBench, GAIA, WebShop, τ³-bench, Terminal-Bench 2.1)
  vs Claude Code, Codex, oh-my-pi, OpenCode, DeepSeek Harness.
- Six-suite table, accuracy / $ per task (transcribed by lilting.ch from AWS chart HTML): e.g. Sonnet 5, Claude Code
  71.55% / $0.974 vs Strands 75.61% / $0.311; Opus 5, 84.60% / $1.063 vs 84.55% / $0.634; GPT-5.6 Terra, Codex
  59.06% / $0.178 vs Strands 64.75% / $0.143.
- The "28%" headline: lilting says cost, The Register says tokens. **Unresolved.** lilting's "60%–33%" range
  contradicts its own table (Terra is 80%).
- Claimed cause: context management (tool results over 1,500 tokens truncated, compaction at 85% of context).
- Criticism: vendor marks its own homework; a general-purpose agent compared only with coding agents; some cells
  backfilled from another report.

### 4. tokenecon — grade C
- Recommends cost per *successful* task, a per-run receipt (tokens and cost per step), tiered routing, budgets that
  degrade instead of failing.
- Framework overhead with a mock model: PydanticAI 1.05×, Google ADK 1.11×, OpenAI Agents SDK 1.14×, SmolAgents
  3.9×. Routing at ~13% of the flagship bill is a modelled assumption, not a measurement.

### 5. AIMultiple AIM-Code Bench — grade C
- One key-value cache project in 4 stages, p95 latency (median of 10 replays); 13 configurations (Claude Code with
  Fable 5.1, Opus 5, Opus 5.5, Sonnet 5; Codex; OpenCode; Grok Build; Devin CLI). Cost not measured.
- Handover (156 donor→recipient pairs, fresh sessions): **Opus 5 code improves its successors by +17.30% (12/12)**,
  Opus 5.5 +15.70%, Fable 5.1 +11.34%, **Sonnet 5 −4.81%**.
- Caveats: one project, one *selected* trajectory per config ("not first-attempt reliability").
- Hub (Oct 2026, excerpts only): full-stack web tasks, OpenCode 0.8163 at ~$1.03, Claude Code 0.789 at ~$1.83,
  Cursor 0.751 at ~$27.9 (cost basis not stated). **[S]**

### 6. Winder.ai — grade C
- Harness model from Birgitta Böckeler: **guides** (steer before acting) and **sensors** (check afterwards); a
  prompt is advisory, a hook deterministic; harness engineering = deciding how much of the loop to make
  deterministic.
- Cited, all **[2nd]** via MongoDB (April 2026): LangChain 52.8% → 66.5% on Terminal Bench by changing only the
  harness; Vercel removed 80% of tools, success 80% → 100%; CORE-Bench 42% vs 78% by scaffold.
- Own anecdotes: loading skills only when needed cut tasks from 16 turns to 6.

### 7. BenchGen docs — grade C
- Check the benchmark before blaming the model; prove a key fix by re-scoring saved answers with no model calls,
  report before/after and newly broken answers ("everything now right" is a red flag); never widen a key with the
  model's own words; earlier runs are not re-scored automatically; version benchmarks in git.

### 8. Evaluating AGENTS.md — grade B
- Claude Code + Sonnet 4.5, Codex + GPT-5.2 / GPT-5.1 mini, Qwen Code; SWE-bench Lite (300) and CTXbench (138
  instances, 12 repos with developer context files); conditions none / LLM-generated / developer-written; one
  sample each.
- No significant gain in success (CMH p 0.21–0.87, except LLM vs Dev p = 0.038); **cost up over 20% on average**
  (Sonnet on CTXbench $1.15 → $1.33 → $1.30 per instance).
- Agents do follow the files' instructions; overviews do not help; files help for non-standard practices.
- Success figures per cell are **[S]** (e.g. Sonnet CTXbench 73.2 → 65.2 → 70.3); the intro's "+7%" and the
  summary's "+2.4%" for developer files conflict.
- Measures resolution only, not rule compliance.

### 9. OctoBench — grade B
- 217 tasks, 34 environments, 7,098 binary checks; scaffolds Claude Code v2.0.69, Kilo, Droid; instructions from
  system prompt, CLAUDE.md, AGENTS.md, skills, memory, tool schemas; 8 models, 3 runs each; panel of three LLM
  judges.
- **CSR** (per-check pass rate) 79.75–85.64% vs **ISR** (instances with every check passed) 9.66–28.11%. Opus 4.5
  ISR 28.11, Sonnet 4.5 14.65.
- Scaffold matters: Sonnet 4.5 ISR 16.71 in Claude Code, 4.44 in Kilo, 7.78 in Droid **[S]**. Structured feedback
  on failed checks +7.2 to +16.8 ISR points **[S]**.
- Caveat: Sonnet 4.5 is both evaluated and a judge; checklists LLM-generated then human-reviewed.

### 10. DreamBench-SWE — grade B
- 60 three-session traps × 3 seeds (180 cells); facts injected by CSPRNG so they cannot be inferred; hidden
  executable oracles. Codex CLI + gpt-5.5 only.
- **Verbatim event memory (B5) is a strong baseline**: typed+raw memory 95/180 vs B5 89/180, p = .518 (not
  significant). No memory: 21/180. v2.1: Mem0-literal 97/180.

### 11. VibeMemBench — grade B
- 111 targets, 90 repos, 4 seeds; MiniSWEAgent; Mem0, SimpleMem, MemoryOS, A-MEM; no Claude/GPT models.
- Memory does not significantly raise resolution (every bootstrap CI crosses zero); retrieval at or below
  memory-off in 11 of 12 pairs. Transcript volume looks like the harm **[S]**.

### 12. MemoryArena — grade B
- 701 tasks, 2–16 sessions; long-context and RAG often match or beat memory systems (best average ~0.20) **[S]**.
  Not coding.

### 13. MemTrace — grade B−
- Structured memory graph; Codex CLI DeepSWE 56.6 vs native 35.4; SWE-Milestone 46.4 vs 28.6. One backbone model,
  single-session.
- Idea worth keeping: memory must know whether a record **still applies to the repository's current state**.

### 14. SWE-CI — grade B
- 100 tasks from 68 repos, ~233 days and 71 commits each; architect + programmer loop up to 20 iterations;
  **EvoScore** rewards changes that make later changes easier.
- Zero-regression rate below 0.25 for most models; regressions rise with iterations for 12 of 20 models.

### 15. A Gated Spec-Driven Workflow — grade C
- Claude Code with Opus 5 (some Opus 5.5); gates PDR → SPEC → PLAN → TASKS → EXECUTE → ARCHIVE, human approval,
  reviewer subagent, executors limited to declared files, a file-inventory "block check".
- 581 tasks planned, 288 completed; block checks flagged 11 of 247, the executor left one undeclared change (caught).
- Reviewer: blocking findings at the first review of 15 of 20 artefacts; re-reviews used 75.3% of reviewer tokens
  **[S]**.
- **Weak point: the orchestrator, which runs and judges its own checks.** No control condition.

### 16. Spec Kit Agents — grade B−
- Claude Code CLI routed to MiniMax-M2.5; 32 features, 5 repos, 128 runs; Opus 4.6 as judge.
- Discovery and validation hooks: judged quality 3.51 → 3.66 (+0.15 of 5, p < 0.05); full workflow +13.2 min per
  run; SWE-bench Lite 56.5% → 58.2%.
- **Blinded humans preferred the version without hooks** (19 vs 8, 33 ties; 6 tasks only).

### 17. From Prompt to Process — grade C
- Six dimensions (specification, context, roles, execution, validation, portability), 0–2 each: Spec Kit 8,
  OpenSpec 6, **BMAD 10**, GSD 4, Spec Kitty 9, Reversa 6 **[S]**.
- Names the absence of whole-process benchmarks as a recurring risk.

## Reading against v0.3 (`1f70fcaf2ec2/1`)

| v0.3 result | External evidence | Reading |
|---|---|---|
| Correctness near the ceiling in all 13 arms | imec (44–53% everywhere), Harness Leaderboard (ties) | Agree: among popular harnesses pass rate separates little; here also saturation |
| baseline-docs 18/20 checks at 1.27× | AGENTS.md: no success gain, +20% cost, instructions followed | Agree on cost/correctness; the benchmark adds what that study lacks: the effect on rule and memory checks |
| WingFoil step A 1.83× baseline, 1.46× its docs control; driving the engine raises cost | Spec Kit Agents (+13 min for +0.15), Gated SDD (re-reviews 75% of reviewer tokens) | Gate cost is general, not WingFoil's alone; weighs more on small steps (a stated limit) |
| S3: WingFoil 3/5 vs baseline 4/5 on Sonnet | DreamBench-SWE, VibeMemBench: structure does not beat verbatim memory | Consistent; no external reason to expect structure alone to win |
| H11 holds (Haiku 5.5; `gpt-6-luna` under Codex) | Strands (D): gains on Sonnet 5 and Terra, none on Opus; Winder/Raschka [2nd]: harness distinguishes among similar-capability models | Same direction; weak sources |
| Review loop: 21 of 31 findings after round 1 induced by a fix | Gated SDD: costly re-reviews | Agree: returns fall after round 2 |
| Configuring: helps OpenSpec, lowers Spec Kit, no change for WingFoil | LangChain/Vercel harness-tuning gains [2nd] | Apparent disagreement: the large external gains are on hard benchmarks; saturated scenarios leave no margin |
| BMAD excluded (not runnable without a person) | Taxonomy gives BMAD 10/12, highest among mainstream | The exclusion's reasoning on the eligibility page should stay explicit |

## Open verification

- Harness Leaderboard: read the board and run records directly; the figures above come from remio.ai.
- Strands: read the official post (https://strandsagents.com/blog/introducing-strands-harness/) to settle tokens vs
  cost for the "28%".
- AWS Public Sector blog on per-request cost: not readable in this session.
- LangChain 52.8% → 66.5%: read MongoDB's collection and LangChain's original.
- All **[S]** figures in §4: re-read in the paper PDFs.
- AIMultiple hub excerpts: read the linked articles for method and cost basis.
- Pasquale Pillitteri's leaderboard article returned 502; not read.
