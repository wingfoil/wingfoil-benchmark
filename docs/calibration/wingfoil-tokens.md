# Where the wingfoil arm's extra tokens go

**Version:** 1.0
**Date:** 2026-11-01
**Status:** Draft
**Traces to:** [task-122](../memory/task/task-122-where-the-wingfoil-arm-s-extra-tokens-go-read-from-the-transcripts-and-what-wingfoil-could-cut-dl-032-item-6.md); [dl-032](../memory/decision-log/dl-032-a-weak-model-with-wingfoil-against-a-strong-model-without-it-cost-and-time-at-equal-quality-and-a-local-model-s-estimate.md) item 6

---

## 1. What was read

The stored transcripts of campaign-008 (`33b54dd89e8b/1`, Claude Code 2.1.300, Sonnet 5.5 and Haiku 5.5, S1, S2, S3,
S8 and S10 × 3) and campaign-007 (`697e79b75e41/1`, Codex 0.162.1, gpt-5.6-terra and gpt-6-luna), by
`scripts/token-breakdown.mjs`, at no cost. Every table below is the script's output
(`node scripts/token-breakdown.mjs --markdown <results> 33b54dd89e8b/1 697e79b75e41/1`), on a checkout that holds the
transcripts (they are git-ignored, published as release assets).

**How a run's tokens are attributed.** A model call reads its whole context: the base (the agent's system prompt and
tools, the arm's manual, the request) and every item the step added before it (the agent's messages and tool calls,
each tool's output, the approver's replies); a resumed session re-reads the history it resumes. An item costs its
size once for every later call of the step; the base is what the measured tokens leave once the items are
attributed. Claude Code records each call's usage, so an item's size is measured: the next call's new tokens, shared
by the items added since by their characters. Codex records a turn's usage only, so an item's size is an estimate
(characters ÷ 4) and the turn's calls are counted as one per completed item: Codex's split is the rougher. A chained
command (`cat README.md && wingfoil workflow status`, or Codex's `/bin/bash -lc 'wingfoil …'`) counts under its first
`wingfoil` sub-command. Limits of the reading: an approver's reply is not in Claude Code's transcripts, so the
resumed call's new tokens go almost all to the agent's last message (under 1 % of the extra); thinking that a
transcript does not show counts in the output tokens but not in their split; a Codex turn that failed records no
usage and is left out (2 turns in 54 runs).

## 2. The breakdown

**Calls, base and tokens processed per run (means over the scenarios)**

| Model | Arm | Calls | Base per call (thousands) | Processed (thousands) | In resumed sessions (thousands) |
|---|---|---|---|---|---|
| claude-haiku-5-5 | baseline | 36.6 | 17.1 | 1069 | 38 |
| claude-haiku-5-5 | baseline-docs | 54.4 | 17.1 | 2047 | 115 |
| claude-haiku-5-5 | wingfoil | 104.8 | 19.5 | 4468 | 993 |
| claude-sonnet-5-5 | baseline | 21.3 | 16.3 | 443 | 30 |
| claude-sonnet-5-5 | baseline-docs | 25.1 | 16.4 | 604 | 60 |
| claude-sonnet-5-5 | wingfoil | 54.1 | 18.7 | 1523 | 437 |
| gpt-5.6-terra | baseline | 54.5 | 11.8 | 898 | 0 |
| gpt-5.6-terra | baseline-docs | 66.5 | 11.0 | 1189 | 0 |
| gpt-5.6-terra | wingfoil | 106.0 | 30.5 | 4125 | 2375 |
| gpt-6-luna | baseline | 33.3 | 11.0 | 445 | 0 |
| gpt-6-luna | baseline-docs | 51.8 | 11.2 | 833 | 0 |
| gpt-6-luna | wingfoil | 114.8 | 28.3 | 4063 | 2321 |

**The wingfoil arm's tokens processed over the other model's baseline, per scenario (×)**

| wingfoil on | baseline on | Scenario | Ratio |
|---|---|---|---|
| claude-haiku-5-5 | claude-sonnet-5-5 | S1 | 14.7 |
| claude-haiku-5-5 | claude-sonnet-5-5 | S2 | 6.5 |
| claude-haiku-5-5 | claude-sonnet-5-5 | S3 | 12.9 |
| claude-haiku-5-5 | claude-sonnet-5-5 | S8 | 11.4 |
| claude-haiku-5-5 | claude-sonnet-5-5 | S10 | 6.4 |
| claude-sonnet-5-5 | claude-haiku-5-5 | S1 | 1.5 |
| claude-sonnet-5-5 | claude-haiku-5-5 | S2 | 1.3 |
| claude-sonnet-5-5 | claude-haiku-5-5 | S3 | 1.7 |
| claude-sonnet-5-5 | claude-haiku-5-5 | S8 | 1.8 |
| claude-sonnet-5-5 | claude-haiku-5-5 | S10 | 1.0 |
| gpt-5.6-terra | gpt-6-luna | S1 | 10.6 |
| gpt-5.6-terra | gpt-6-luna | S2 | 7.4 |
| gpt-5.6-terra | gpt-6-luna | S3 | 10.3 |
| gpt-5.6-terra | gpt-6-luna | S8 | 8.9 |
| gpt-6-luna | gpt-5.6-terra | S1 | 3.4 |
| gpt-6-luna | gpt-5.6-terra | S2 | 4.5 |
| gpt-6-luna | gpt-5.6-terra | S3 | 5.3 |
| gpt-6-luna | gpt-5.6-terra | S8 | 5.7 |

**The wingfoil arm's WingFoil commands per run (means over the scenarios)**

| Model | Command | Calls a run | Mean output (characters) |
|---|---|---|---|
| claude-haiku-5-5 | wingfoil workflow finalize | 11.5 | 986 |
| claude-haiku-5-5 | wingfoil directives list | 6.1 | 4379 |
| claude-haiku-5-5 | wingfoil workflow next | 5.7 | 1202 |
| claude-haiku-5-5 | wingfoil workflow status | 5.0 | 2024 |
| claude-haiku-5-5 | wingfoil memory add | 4.7 | 1047 |
| claude-haiku-5-5 | wingfoil memory submit | 4.3 | 955 |
| claude-haiku-5-5 | wingfoil memory approve | 3.4 | 605 |
| claude-haiku-5-5 | wingfoil workflow start | 2.9 | 1476 |
| claude-haiku-5-5 | wingfoil memory search | 2.0 | 2312 |
| claude-sonnet-5-5 | wingfoil workflow finalize | 7.6 | 884 |
| claude-sonnet-5-5 | wingfoil workflow status | 4.3 | 2893 |
| claude-sonnet-5-5 | wingfoil memory add | 4.3 | 973 |
| claude-sonnet-5-5 | wingfoil workflow next | 4.3 | 1871 |
| claude-sonnet-5-5 | wingfoil memory submit | 4.0 | 464 |
| claude-sonnet-5-5 | wingfoil memory approve | 3.4 | 485 |
| claude-sonnet-5-5 | wingfoil workflow start | 2.9 | 7581 |
| claude-sonnet-5-5 | wingfoil memory search | 2.1 | 4097 |
| claude-sonnet-5-5 | wingfoil directives list | 1.8 | 8252 |
| gpt-5.6-terra | wingfoil directives list | 10.3 | 6424 |
| gpt-5.6-terra | wingfoil workflow finalize | 7.3 | 1572 |
| gpt-5.6-terra | wingfoil workflow status | 5.2 | 2178 |
| gpt-5.6-terra | wingfoil memory submit | 4.8 | 4276 |
| gpt-5.6-terra | wingfoil memory approve | 3.6 | 1938 |
| gpt-5.6-terra | wingfoil workflow start | 3.3 | 1631 |
| gpt-5.6-terra | wingfoil workflow next | 2.8 | 2744 |
| gpt-5.6-terra | wingfoil memory add | 2.5 | 2923 |
| gpt-5.6-terra | wingfoil other | 0.8 | 3473 |
| gpt-5.6-terra | wingfoil memory search | 0.8 | 4525 |
| gpt-5.6-terra | wingfoil directives show | 0.6 | 3448 |
| gpt-6-luna | wingfoil workflow finalize | 10.5 | 1292 |
| gpt-6-luna | wingfoil directives list | 8.9 | 4370 |
| gpt-6-luna | wingfoil workflow next | 7.2 | 2344 |
| gpt-6-luna | wingfoil memory add | 6.7 | 2088 |
| gpt-6-luna | wingfoil memory submit | 4.8 | 1445 |
| gpt-6-luna | wingfoil workflow status | 4.3 | 2185 |
| gpt-6-luna | wingfoil memory approve | 4.3 | 517 |
| gpt-6-luna | wingfoil other | 3.5 | 4055 |
| gpt-6-luna | wingfoil workflow start | 3.0 | 1418 |
| gpt-6-luna | wingfoil memory search | 0.8 | 2425 |

**Shares of the wingfoil arm's extra tokens processed over its docs control (all scenarios, %)**

| Model | Extra per run (thousands) | Extra interventions per run | Extra per intervention (thousands) | Base | In resumed sessions | WingFoil outputs | Documents | Agent messages | directives list | memory search | workflow status | workflow start |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claude-haiku-5-5 | 2421 | 3.9 | 614 | 46 | 36 | 29 | 21 | 19 | 11 | 1 | 4 | 2 |
| claude-sonnet-5-5 | 919 | 3.4 | 270 | 65 | 41 | 37 | 3 | 8 | 7 | 4 | 7 | 11 |
| gpt-5.6-terra | 2936 | 4.3 | 691 | 84 | 81 | 15 | 10 | 2 | 7 | 0 | 2 | 1 |
| gpt-6-luna | 3230 | 4.2 | 774 | 83 | 72 | 13 | 7 | 2 | 4 | 0 | 2 | 1 |

**claude-haiku-5-5: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil directives show | wingfoil other | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3596 | 1346 | 1486 | 36 | 144 | 45 | 86 | 2 | 231 | 62 | 442 | 57 | 30 | 721 | -297 | -256 | 799 |
| S2 | 1731 | 675 | 833 | 13 | 135 | 26 | 34 | 8 | 29 | 29 | 126 | 0 | 0 | 268 | 82 | -136 | 279 |
| S3 | 3186 | 1047 | 1469 | 32 | 97 | 44 | 76 | 10 | 127 | 38 | 413 | 0 | 0 | 686 | -189 | -166 | 554 |
| S8 | 2362 | 881 | 1097 | 57 | 63 | 35 | 50 | 14 | 62 | 29 | 257 | 13 | 0 | 461 | -83 | -113 | 416 |
| S10 | 1229 | 445 | 668 | 65 | 82 | 26 | 20 | 64 | 46 | 115 | 101 | 13 | 25 | 372 | -288 | -278 | 207 |

**claude-sonnet-5-5: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil directives list | wingfoil other | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 1226 | 492 | 788 | 43 | 78 | 15 | 117 | 65 | 28 | 30 | 0 | 33 | -102 | -13 | 134 | 1 |
| S2 | 597 | 273 | 375 | 22 | 73 | 9 | 83 | 5 | 19 | 78 | 11 | 7 | -43 | -83 | 34 | 1 |
| S3 | 1199 | 478 | 808 | 30 | 67 | 16 | 155 | 57 | 32 | 28 | 0 | 39 | -60 | -60 | 82 | -3 |
| S8 | 989 | 392 | 632 | 14 | 45 | 10 | 126 | 0 | 14 | 85 | 0 | 61 | -52 | -31 | 76 | 2 |
| S10 | 581 | 246 | 403 | 42 | 48 | 8 | 33 | 45 | 18 | 92 | 0 | 15 | -76 | -94 | 58 | -16 |

**gpt-5.6-terra: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow status | wingfoil workflow start | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil other | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3380 | 2816 | 2950 | 49 | 37 | 38 | 20 | 243 | 64 | 204 | -286 | -47 | 60 | -36 |
| S2 | 2627 | 2145 | 2096 | 90 | 16 | 27 | 118 | 174 | 0 | 342 | -109 | -189 | 43 | 0 |
| S3 | 3120 | 2488 | 2631 | 40 | 33 | 51 | 25 | 138 | 5 | 352 | -111 | -142 | 50 | 0 |
| S8 | 2617 | 2051 | 2215 | 24 | 29 | 13 | 97 | 243 | 0 | 229 | -197 | -108 | 45 | 0 |

**gpt-6-luna: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil other | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3716 | 2559 | 3142 | 51 | 51 | 55 | 47 | 152 | 63 | 203 | -79 | -104 | 79 |
| S2 | 2558 | 1887 | 2047 | 18 | 81 | 48 | 47 | 89 | 23 | 220 | -3 | -105 | 58 |
| S3 | 3920 | 2696 | 3237 | 65 | 60 | 97 | 10 | 157 | 40 | 233 | -15 | -99 | 86 |
| S8 | 2724 | 2144 | 2268 | 62 | 35 | 62 | 20 | 116 | 101 | 255 | -164 | -127 | 54 |

**claude-haiku-5-5: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil directives show | wingfoil other | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 5353 | 1346 | 2030 | 36 | 144 | 45 | 86 | 2 | 231 | 62 | 442 | 57 | 30 | 721 | 21 | -27 | 1465 |
| S2 | 2075 | 675 | 921 | 13 | 135 | 26 | 34 | 8 | 29 | 29 | 126 | 0 | 0 | 268 | 213 | -43 | 312 |
| S3 | 4090 | 1053 | 1749 | 32 | 97 | 44 | 76 | 10 | 127 | 38 | 413 | 0 | 0 | 686 | 19 | 8 | 783 |
| S8 | 3205 | 881 | 1407 | 57 | 63 | 35 | 50 | 14 | 62 | 29 | 257 | 13 | 0 | 461 | 211 | -26 | 566 |
| S10 | 2273 | 822 | 975 | 65 | 82 | 26 | 20 | 64 | 46 | 115 | 101 | 13 | 25 | 372 | -62 | -32 | 473 |

**claude-sonnet-5-5: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil directives list | wingfoil other | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 1433 | 492 | 877 | 43 | 78 | 15 | 117 | 65 | 28 | 30 | 0 | 33 | -23 | -1 | 161 | 1 |
| S2 | 724 | 280 | 420 | 22 | 73 | 9 | 83 | 5 | 19 | 78 | 11 | 7 | 27 | -33 | 37 | -41 |
| S3 | 1441 | 478 | 918 | 30 | 67 | 16 | 155 | 57 | 32 | 28 | 0 | 39 | -17 | -3 | 108 | 1 |
| S8 | 1024 | 392 | 627 | 14 | 45 | 10 | 126 | 0 | 14 | 85 | 0 | 61 | -42 | -3 | 78 | 2 |
| S10 | 775 | 389 | 476 | 42 | 48 | 8 | 33 | 45 | 18 | 92 | 0 | 15 | -72 | -17 | 80 | 1 |

**gpt-5.6-terra: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow status | wingfoil workflow start | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil other | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3605 | 2816 | 2912 | 49 | 37 | 38 | 20 | 243 | 64 | 204 | -107 | 15 | 53 |
| S2 | 2943 | 2145 | 2263 | 90 | 16 | 27 | 118 | 174 | 0 | 342 | 16 | -169 | 48 |
| S3 | 3427 | 2488 | 2690 | 40 | 33 | 51 | 25 | 138 | 5 | 352 | 5 | -16 | 55 |
| S8 | 2934 | 2051 | 2312 | 24 | 29 | 13 | 97 | 243 | 0 | 229 | -60 | -31 | 51 |

**gpt-6-luna: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil other | documents | code and tests | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 4039 | 2559 | 3315 | 51 | 51 | 55 | 47 | 152 | 63 | 203 | -39 | 84 |
| S2 | 2811 | 1887 | 2153 | 18 | 81 | 48 | 47 | 89 | 23 | 220 | 62 | 62 |
| S3 | 4326 | 2696 | 3487 | 65 | 60 | 97 | 10 | 157 | 40 | 233 | 29 | 92 |
| S8 | 3296 | 2144 | 2573 | 62 | 35 | 62 | 20 | 116 | 101 | 255 | -21 | 69 |

Negative values: the docs control or the baseline spent more there (the wingfoil arm reads less code and fewer
project files).

## 3. What the breakdown shows

1. **Most of the extra is the base re-read by more calls.** The wingfoil arm makes about twice the calls of its docs
   control (Sonnet 54 against 25 a run, Haiku 105 against 54, Terra 106 against 67, Luna 115 against 52), and every
   call re-reads the base, 16–20 thousand tokens on Claude Code. The base is 46 % of the extra on Haiku, 65 % on
   Sonnet and over 80 % on Codex. Each step's workflow adds calls: `workflow next` and `status` before acting,
   `finalize` after (7–12 a run), `memory add`, `submit`, and on these scenarios `memory approve` after the
   approver's reply.
2. **The gate's round trip is a large part of it.** 36–41 % of the extra on Claude Code and 72–81 % on Codex is
   processed in resumed sessions, after the approver's reply: the resume re-reads the whole history of the step. Per
   intervention the wingfoil arm has over its docs control (3.4–4.3 a run), the extra is 270 thousand tokens on
   Sonnet, 614 on Haiku, 691 on Terra and 774 on Luna.
3. **WingFoil's own outputs are about a third of the extra on Claude Code** (29 % on Haiku, 37 % on Sonnet) and 13–15 %
   on Codex. The largest is `directives list` (11 % on Haiku, 7 % on Sonnet and Terra, 4 % on Luna): 4–8 thousand
   characters an output, called 6–10 times a run on Haiku, Terra and Luna (about twice on Sonnet). Then `workflow
   start` on Sonnet (11 %, 7.6 thousand characters) and `workflow status` (2–3 thousand characters, 4–5 calls a run).
   `memory search` is small (at most 4 %).
4. **The weaker models re-read the documents**: reading Memory elements and directives' files (`cat` of
   `docs/memory/` and `.wingfoil/`) is 21 % of Haiku's extra and 7–10 % on Codex, against 3 % on Sonnet; Haiku's own
   messages are 19 % (8 % on Sonnet).
5. **The base itself grows in the wingfoil arm**: about 2.4 thousand tokens a call on Claude Code (the manual, and the
   three MCP resource tools the WingFoil server adds, which serves resources and no tools); on Codex 17–20 thousand by
   this estimate, which mixes what the server adds with the estimate's error on the items, and cannot be separated
   from Codex's transcripts.
6. **Against the other model's baseline** (task-121's comparison across models): Haiku with wingfoil processes
   6.4–14.7 times the tokens of Sonnet's baseline, in line with task-121's cached-token ratio (6.8–16×, which counts
   cache reads only); Luna with wingfoil processes 3.4–5.7 times Terra's baseline by this script, where task-121's
   cached ratio is 2.0–3.3× (Codex's turn input counts every token, its cached share apart).

**What WingFoil could cut:** shorter listings (`directives list` and `memory search` print each record in full by
default: the inbox's F-046), and the role's context delivered when a session starts, so that an agent does not list
or read every directive to learn its rules: that is F-032 (captured by WingFoil as dl-192), which this reading
measures again on 0.3.1 and on both agents. Every token saved is saved once for every later call; on a local model
without a prefix cache at full price (task-121's estimate).

**What the benchmark could cut, not WingFoil's:** the stop at each gate and the resume are the scenarios' approver
protocol, the same for every arm. The wingfoil arm's manual asks the agent to run `wingfoil workflow next` again after
each step, though `workflow finalize` already prints the next step as `next` does: the agents ran `finalize` 7–12
times a run and `next` 3–7 times, part of it repeating what `finalize` had printed. A change to the manual is an
arm change (a new digest), for the approver to decide. Some agents also tried `wingfoil directives show`, which 0.3.1
does not have (its own category in the tables: the attempts and their error).
