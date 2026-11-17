---
id: dl-035-publishing-mirrors-on-hugging-face-and-provider-arms-through-an-openai-compatible-endpoint-as-inputs-to-v0.4-s-planning
type: decision-log
title: "Publishing mirrors on Hugging Face and provider arms through an OpenAI-compatible endpoint, as inputs to v0.4's planning"
status: draft
tags: ["v0.4","publishing","providers"]
---

## Context

The approver asked on 2026-11-17 which external tools would help the WingFoil projects be used and verified. Each
integration is to land at the earliest slot its project's roadmap allows, low effort and high usability first. The
request reached this repository through the WingFoil coordination session the same day, as an input to v0.4's
release-planning, beside the methodology adoption already placed there (task-127, bug-046). It changes nothing in
v0.3's remaining work. No external destination replaces the repository as the record, and no paid provider run
happens without the approver's spending consent.

Four items, with the coordination session's estimates (effort and usability, 1–100):

1. **A Hugging Face Dataset mirror** of each published campaign's results (`results/<id>/`), written by the campaign
   cycle's publish step once the approver approves publishing. It is versioned and citable, with a dataset card
   naming the campaign, the scenario versions and the pinned harness versions. Effort ~25, usability ~65.
2. **A Hugging Face Space** with a leaderboard read from that dataset. Effort ~30, usability ~55.
3. **A Hugging Face Collection** or organisation page grouping the dataset and the Space. Effort ~5, usability ~25.
4. **Provider arms:** model access through an OpenAI-compatible endpoint as a campaign variable (Hugging Face
   Inference Providers, OpenRouter, a local profile on Ollama or vLLM), with the provider and model recorded per run.

What the Benchmark already holds that bears on them:

- **Results:** results are published on the project's GitHub Pages site, with transcripts as release assets
  (REQ-RES-06).
- **Claims:** every claim follows the Benchmark's rules: no claim of significance, estimates marked, preliminary
  results said so (dl-012, dl-023). Most groups have n = 1.
- **Local models:** plan-005 places local models in v0.4 "later (an adapter and an eligibility assessment)".
- **Eligibility:** every tool is assessed against the published criteria (REQ-FMT-11). A model or a provider is not
  assessed today; the agents are (Claude Code against Anthropic's API, Codex against OpenAI's).

## Options

- **A. All four in v0.4.** Rejected as proposed: a leaderboard ranks arms, which the Benchmark's results do not yet
  support (preliminary, mostly n = 1).
- **B. The mirror, the collection and the provider profile in v0.4; the Space deferred.**
- **C. The mirror and the collection only; providers deferred to v0.5.**
- **D. None in v0.4.** Rejected: the mirror is cheap and makes the results citable where model users look.

## Proposal

**B**, to be confirmed at v0.4's release-planning.

- **The mirror (item 1) and the collection (item 3):** a step of `campaign-cycle`'s publish phase, after the
  approver's publish gate. It writes a copy of `results/<id>/<n>/` (transcripts excluded, as on the site) to a
  Dataset, with a card generated from the campaign file and `aggregate.json`. The repository stays the record, and
  the copy is never the only one. Creating the Hugging Face organisation and its token is the approver's.
- **The provider profile (item 4):** an agent profile whose model is reached through an OpenAI-compatible endpoint.
  It records the provider, the endpoint's model id and its pricing source per run. It is assessed for eligibility
  like any tool, and a local profile (Ollama or vLLM) comes first, as plan-005 already places local models in v0.4.
  Which agent drives such a model is part of the assessment.
- **The Space (item 2) is deferred** until a campaign's groups are read beyond the preliminary level (dl-023's
  repetitions). A leaderboard before then would show a ranking the method does not claim. A results page that does
  not rank stays possible within item 1's card.

## Consequences

- **At v0.4's planning:** items 1, 3 and 4 enter as candidates, each to be filed as its own task.
- **Item 2:** re-opened when non-preliminary results exist.
- **Spending:** none until a provider campaign, which needs the approver's spending consent like any other.
