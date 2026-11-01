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
command (`cat README.md && wingfoil workflow status`) counts under its first `wingfoil` sub-command.

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
| gpt-5.6-terra | wingfoil workflow next | 11.8 | 1878 |
| gpt-5.6-terra | wingfoil memory search | 10.1 | 6462 |
| gpt-5.6-terra | wingfoil workflow finalize | 6.0 | 1739 |
| gpt-5.6-terra | wingfoil workflow status | 4.3 | 1867 |
| gpt-5.6-terra | wingfoil memory add | 2.3 | 3003 |
| gpt-5.6-terra | wingfoil memory submit | 1.3 | 2078 |
| gpt-5.6-terra | wingfoil directives list | 0.9 | 4001 |
| gpt-5.6-terra | wingfoil workflow start | 0.8 | 2468 |
| gpt-5.6-terra | wingfoil directives show | 0.7 | 3250 |
| gpt-6-luna | wingfoil workflow next | 17.2 | 1258 |
| gpt-6-luna | wingfoil memory search | 7.9 | 3959 |
| gpt-6-luna | wingfoil workflow finalize | 5.0 | 2237 |
| gpt-6-luna | wingfoil memory add | 4.6 | 2683 |
| gpt-6-luna | wingfoil workflow status | 4.2 | 2385 |
| gpt-6-luna | wingfoil memory submit | 3.1 | 1816 |
| gpt-6-luna | wingfoil memory approve | 0.5 | 677 |

**Shares of the wingfoil arm's extra tokens processed over its docs control (all scenarios, %)**

| Model | Extra per run (thousands) | Base | In resumed sessions | WingFoil outputs | Documents | Agent messages | directives list | memory search | workflow status | workflow start |
|---|---|---|---|---|---|---|---|---|---|---|
| claude-haiku-5-5 | 2421 | 46 | 36 | 29 | 20 | 19 | 11 | 1 | 4 | 2 |
| claude-sonnet-5-5 | 919 | 65 | 41 | 36 | 3 | 8 | 7 | 4 | 7 | 11 |
| gpt-5.6-terra | 2936 | 84 | 81 | 13 | 9 | 2 | 1 | 6 | 1 | 0 |
| gpt-6-luna | 3230 | 83 | 72 | 10 | 8 | 2 | 0 | 3 | 2 | 0 |

**claude-haiku-5-5: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil directives show | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3596 | 1346 | 1486 | 36 | 144 | 45 | 86 | 2 | 231 | 62 | 442 | 57 | 702 | -295 | -230 | 799 |
| S2 | 1731 | 675 | 833 | 13 | 135 | 26 | 34 | 8 | 29 | 29 | 126 | 0 | 268 | 82 | -136 | 279 |
| S3 | 3186 | 1047 | 1469 | 32 | 97 | 44 | 76 | 10 | 127 | 38 | 413 | 0 | 677 | -189 | -157 | 554 |
| S8 | 2362 | 881 | 1097 | 57 | 63 | 35 | 50 | 14 | 62 | 29 | 257 | 13 | 390 | -12 | -113 | 416 |
| S10 | 1229 | 445 | 668 | 65 | 82 | 26 | 20 | 64 | 46 | 115 | 101 | 13 | 372 | -263 | -278 | 207 |

**claude-sonnet-5-5: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil directives list | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 1226 | 492 | 788 | 43 | 78 | 15 | 117 | 65 | 28 | 30 | 28 | -102 | -8 | 134 | 1 |
| S2 | 597 | 273 | 375 | 22 | 73 | 9 | 83 | 5 | 19 | 78 | 18 | -43 | -83 | 34 | 1 |
| S3 | 1199 | 478 | 808 | 30 | 67 | 16 | 155 | 57 | 32 | 28 | 19 | -60 | -40 | 82 | -3 |
| S8 | 989 | 392 | 632 | 14 | 45 | 10 | 126 | 0 | 14 | 85 | 61 | -52 | -31 | 76 | 2 |
| S10 | 581 | 246 | 403 | 42 | 48 | 8 | 33 | 45 | 18 | 92 | 15 | -76 | -94 | 58 | -16 |

**gpt-5.6-terra: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory search | wingfoil memory add | wingfoil directives list | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3380 | 2816 | 2950 | 58 | 40 | 237 | 38 | 9 | 252 | -280 | -31 | 60 | -36 |
| S2 | 2627 | 2145 | 2096 | 17 | 81 | 174 | 27 | 0 | 246 | 10 | -186 | 43 | 90 |
| S3 | 3120 | 2488 | 2631 | 43 | 30 | 142 | 51 | 1 | 304 | -49 | -147 | 50 | 6 |
| S8 | 2617 | 2051 | 2215 | 26 | 23 | 163 | 12 | 80 | 220 | -121 | -97 | 45 | 0 |

**gpt-6-luna: wingfoil's extra tokens processed over baseline-docs, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory search | wingfoil memory add | wingfoil memory submit | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3716 | 2559 | 3142 | 57 | 51 | 119 | 54 | 41 | 217 | -42 | -76 | 79 | 32 |
| S2 | 2558 | 1887 | 2047 | 25 | 80 | 69 | 41 | 48 | 236 | -3 | -106 | 58 | 35 |
| S3 | 3920 | 2696 | 3237 | 73 | 60 | 130 | 90 | 7 | 265 | 5 | -94 | 86 | 25 |
| S8 | 2724 | 2144 | 2268 | 47 | 35 | 130 | 38 | 14 | 340 | -145 | -100 | 54 | 15 |

**claude-haiku-5-5: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil memory submit | wingfoil directives list | wingfoil directives show | documents | code and tests | project files | agent messages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 5353 | 1346 | 2030 | 36 | 144 | 45 | 86 | 2 | 231 | 62 | 442 | 57 | 702 | 23 | -1 | 1465 |
| S2 | 2075 | 675 | 921 | 13 | 135 | 26 | 34 | 8 | 29 | 29 | 126 | 0 | 268 | 213 | -43 | 312 |
| S3 | 4090 | 1053 | 1749 | 32 | 97 | 44 | 76 | 10 | 127 | 38 | 413 | 0 | 677 | 19 | 17 | 783 |
| S8 | 3205 | 881 | 1407 | 57 | 63 | 35 | 50 | 14 | 62 | 29 | 257 | 13 | 390 | 281 | -26 | 566 |
| S10 | 2273 | 822 | 975 | 65 | 82 | 26 | 20 | 64 | 46 | 115 | 101 | 13 | 372 | -37 | -32 | 473 |

**claude-sonnet-5-5: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil workflow finalize | wingfoil workflow start | wingfoil memory search | wingfoil memory add | wingfoil directives list | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 1433 | 492 | 877 | 43 | 78 | 15 | 117 | 65 | 28 | 30 | 28 | -23 | 4 | 161 | 1 |
| S2 | 724 | 280 | 420 | 22 | 73 | 9 | 83 | 5 | 19 | 78 | 18 | 27 | -33 | 37 | -41 |
| S3 | 1441 | 478 | 918 | 30 | 67 | 16 | 155 | 57 | 32 | 28 | 19 | -17 | 17 | 108 | 1 |
| S8 | 1024 | 392 | 627 | 14 | 45 | 10 | 126 | 0 | 14 | 85 | 61 | -42 | -3 | 78 | 2 |
| S10 | 775 | 389 | 476 | 42 | 48 | 8 | 33 | 45 | 18 | 92 | 15 | -72 | -17 | 80 | 1 |

**gpt-5.6-terra: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory search | wingfoil memory add | wingfoil directives list | documents | code and tests | project files | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 3605 | 2816 | 2912 | 58 | 40 | 237 | 38 | 9 | 252 | -101 | 31 | 53 | -5 |
| S2 | 2943 | 2145 | 2263 | 17 | 81 | 174 | 27 | 0 | 246 | 134 | -142 | 48 | 65 |
| S3 | 3427 | 2488 | 2690 | 43 | 30 | 142 | 51 | 1 | 304 | 68 | -21 | 55 | 7 |
| S8 | 2934 | 2051 | 2312 | 26 | 23 | 163 | 12 | 80 | 220 | 15 | -20 | 51 | -0 |

**gpt-6-luna: wingfoil's extra tokens processed over baseline, per run (thousands)**

| Scenario | Extra | In resumed sessions | base | wingfoil workflow next | wingfoil workflow status | wingfoil memory search | wingfoil memory add | wingfoil memory submit | documents | code and tests | agent messages | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 4039 | 2559 | 3315 | 57 | 51 | 119 | 54 | 41 | 217 | -2 | 84 | 32 |
| S2 | 2811 | 1887 | 2153 | 25 | 80 | 69 | 41 | 48 | 236 | 62 | 62 | 29 |
| S3 | 4326 | 2696 | 3487 | 73 | 60 | 130 | 90 | 7 | 265 | 49 | 92 | 27 |
| S8 | 3296 | 2144 | 2573 | 47 | 35 | 130 | 38 | 14 | 340 | -2 | 69 | 18 |

Negative values: the docs control or the baseline spent more there (the wingfoil arm reads less code and fewer
project files).

## 3. What the breakdown shows

1. **Most of the extra is the base re-read by more calls.** The wingfoil arm makes about twice the calls of its docs
   control (Sonnet 54 against 25 a run, Haiku 105 against 54, Terra 106 against 67, Luna 115 against 52), and every
   call re-reads the base, 16–20 thousand tokens on Claude Code. The base is 46 % of the extra on Haiku, 65 % on
   Sonnet and over 80 % on Codex. Each step's workflow adds calls: `workflow next` and `status` before acting,
   `finalize` after (7–12 a run on Claude Code), `memory add`, `submit`, and on these scenarios `memory approve`
   after the approver's reply.
2. **The gate's round trip is a large part of it.** 36–41 % of the extra on Claude Code and 72–81 % on Codex is
   processed in resumed sessions, after the approver's reply: the resume re-reads the whole history of the step, and
   on Codex the resumed thread's turn re-reads it at every call.
3. **WingFoil's own outputs are a third of the extra on Claude Code** (29 % on Haiku, 36 % on Sonnet) and about a
   tenth on Codex. The largest: `directives list` (11 % on Haiku, 7 % on Sonnet: 4–8 thousand characters an output,
   up to 6 calls a run on Haiku), `workflow start` (11 % on Sonnet: 7.6 thousand characters), `workflow status`
   (2–3 thousand characters, 4–5 calls a run), `memory search` (6 % on Terra: 6.5 thousand characters, 10 calls a
   run).
4. **Haiku reads the documents again and again**: 20 % of its extra is reading Memory elements and directives' files
   (`cat` of `docs/memory/` and `.wingfoil/`), against 3 % on Sonnet; and its own messages are 19 % (8 % on Sonnet).
5. **The base itself grows a little in the wingfoil arm**: about 2.4 thousand tokens a call on Claude Code (the manual
   and WingFoil's MCP server's tools, which both agents start); on Codex 17–20 thousand by this estimate, which mixes
   the server's tool definitions with the estimate's error on the items, and cannot be separated from Codex's
   transcripts.

**What WingFoil could cut** (the inbox's notes F-046 and F-047, written for WingFoil to read): shorter listings
(`directives list` and `memory search` print every field of every record by default, F-046), and the step's own
directives delivered with the step rather than named by id, so that an agent does not list or read every directive to
learn what they say (F-047). Every token saved is saved once for every later call; on a local model without a prefix
cache at full price (task-121's estimate).

**What the benchmark could cut, not WingFoil's:** the stop at each gate and the resume are the scenarios' approver
protocol, the same for every arm. The wingfoil arm's manual asks the agent to run `wingfoil workflow next` again after
each step, though `workflow finalize` already prints the next step as `next` does: the agents ran `finalize` 5–12
times a run and `next` 4–17 times, part of it repeating what `finalize` had printed. A change to the manual is an
arm change (a new digest), for the approver to decide.
