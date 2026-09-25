/**
 * The fixed approximation of a text's size in tokens (REQ-RUN-12; approver, task-014 design): its
 * UTF-8 bytes divided by four, rounded up. It is not the model's count and does not pretend to be:
 * what it measures — the operating manuals of the arms against each other, a confound (experiment
 * design §2) — needs a size that is the same on every machine and never drifts between campaigns.
 */
export const TOKEN_METHOD = { name: 'bytes-div-4', version: 1 } as const;

/** The size of `text` in tokens, by {@link TOKEN_METHOD}. */
export function approximateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}
