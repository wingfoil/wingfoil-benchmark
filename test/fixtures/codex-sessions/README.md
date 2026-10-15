# Codex `--json` streams (task-094)

Written by hand in the shape Codex 0.162.1's source gives (`codex-rs/exec/src/exec_events.rs` and
`event_processor_with_jsonl_output.rs` at `rust-v0.162.1`), **not recorded**: no real Codex session had run when they
were written. task-094's P0 adds the first recorded stream beside them.

- `turn.completed`'s `usage` is the thread's running total; `input_tokens` includes the cached and the cache-write
  tokens; `reasoning_output_tokens` is inside `output_tokens`.
- `completed.jsonl` then `resumed.jsonl`: one thread, a step and its resume.
- `usage-limit.jsonl`, `rate-limited.jsonl`: the texts of `codex-rs/protocol/src/error.rs`, documented, not observed.
