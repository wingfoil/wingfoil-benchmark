/** What a waiting session asks for (REQ-RUN-06): an approval, or an answer to a question. */
export type InterventionKind = 'approval' | 'question';

/**
 * The neutral approver's policy (experiment design §3.5, F2.4). A version denotes, together, the
 * classifier, the replies and the cap: changing any of them is a new version (dl-004), so that a
 * campaign's interventions can always be reconstructed from the version it pinned.
 */
export interface ApproverPolicy {
  readonly version: string;
  /** Whether a session's final assistant message is waiting for input, and for what. */
  readonly classify: (message: string) => InterventionKind | undefined;
  readonly replies: Readonly<Record<InterventionKind, string>>;
  /** Interventions allowed in one step; a session still waiting after them gets no reply. */
  readonly maxInterventions: number;
}

/**
 * dl-004 rule 1, v1: the approval patterns, matched **anywhere** in the message. A real approval
 * request need not end with a question (the spike's did not), so these are read for what they ask.
 * Frozen with v1: a pattern added or changed is v2, and the test that lists them says so.
 */
const ANYWHERE: readonly RegExp[] = [
  /\bare\s+you\s+sure\b/i,
  /\b(?:please|can\s+you|could\s+you)\s+confirm\b/i,
  /\bpermission\s+to\b/i,
  /\b(?:may|shall)\s+I\b/i,
  /\b(?:do\s+you\s+want|would\s+you\s+like)\s+me\s+to\b/i,
  /\b(?:awaiting|waiting\s+for)\s+your\b/i,
];

/** dl-004 rule 1's two patterns whose words must fall within one sentence: the first, then the second. */
const WITHIN_SENTENCE: readonly (readonly [RegExp, RegExp])[] = [
  [/\b(?:needs?|requires?)\b/i, /\bapproval\b/i],
  [/\blet\s+me\s+know\b/i, /\b(?:proceed|continue|approve)/i],
];

/** Classifier v1's patterns, exported so that a test can pin them: changing one is v2 (dl-004). */
export const CLASSIFIER_V1 = { anywhere: ANYWHERE, withinSentence: WITHIN_SENTENCE } as const;

/**
 * Where a sentence ends: `.`, `!` or `?` followed by a space or the end — so that `config.yaml` or
 * `v1.2` do not end one — or a blank line. A single line break only wraps a sentence.
 */
const SENTENCE_END = /[.!?](?=\s|$)|\n[^\S\n]*\n/;

/** An opening or closing code fence: three or more backticks or tildes, after optional indentation. */
const FENCE = /^[^\S\n]*(`{3,}|~{3,})/;

/**
 * dl-004's preparation: fenced code blocks and inline code spans are removed, so that a diff, a test
 * fixture or a file the agent quotes cannot trigger a rule. A fence closes only on a line holding a
 * run of the same character at least as long and nothing else (CommonMark); one never closed runs to
 * the end. Line by line, so that no input can make it backtrack. The message itself is never changed.
 */
function withoutCode(message: string): string {
  const kept: string[] = [];
  let open: string | undefined;
  for (const line of message.split('\n')) {
    const run = FENCE.exec(line)?.[1];
    if (open === undefined) {
      if (run === undefined) kept.push(line);
      else open = run;
    } else if (run !== undefined && run[0] === open[0] && run.length >= open.length && line.trim() === run) {
      open = undefined;
    }
  }
  return kept.join('\n').replaceAll(/`[^`\n]*`/g, '');
}

/** Whether the first pattern matches in a sentence and the second after it, in the same sentence. */
function inOneSentence(sentences: readonly string[], [first, then]: readonly [RegExp, RegExp]): boolean {
  return sentences.some((sentence) => {
    const found = first.exec(sentence);
    return found !== null && then.test(sentence.slice(found.index + found[0].length));
  });
}

/** Rule 2's reading of the last non-empty line, with trailing whitespace and Markdown emphasis removed. */
function lastLine(text: string): string {
  const line = text.split('\n').findLast((candidate) => candidate.trim() !== '') ?? '';
  // A loop rather than a regex anchored at the end, which backtracks on a long run of `*` or `_`.
  let end = line.length;
  while (end > 0 && /[\s*_]/.test(line.charAt(end - 1))) end -= 1;
  return line.slice(0, end);
}

/**
 * The waiting-for-input classifier v1 (REQ-RUN-06, dl-004), over a session's final assistant message:
 * an approval pattern anywhere in it first, then a question at its end, otherwise not waiting.
 */
export function classify(message: string): InterventionKind | undefined {
  const text = withoutCode(message);
  const sentences = text.split(SENTENCE_END);
  if (
    ANYWHERE.some((pattern) => pattern.test(text)) ||
    WITHIN_SENTENCE.some((pair) => inOneSentence(sentences, pair))
  ) {
    return 'approval';
  }
  if (lastLine(text).endsWith('?')) return 'question';
  return undefined;
}

/** Policy v1 (experiment-design decision 2), frozen when the first campaign is published. */
const V1: ApproverPolicy = {
  version: 'v1',
  classify,
  replies: {
    approval: 'Approved. Proceed.',
    question: 'No further input is available. Make the most reasonable choice, record it, and proceed.',
  },
  maxInterventions: 3,
};

/** Every policy this runner implements, by the version a campaign pins. */
const POLICIES: ReadonlyMap<string, ApproverPolicy> = new Map([[V1.version, V1]]);

/** The policy a campaign pins, or nothing when this runner does not implement that version. */
export function approverPolicy(version: string): ApproverPolicy | undefined {
  return POLICIES.get(version);
}

/** The versions this runner implements, for a message that has to name them. */
export function approverPolicyVersions(): readonly string[] {
  return [...POLICIES.keys()];
}
