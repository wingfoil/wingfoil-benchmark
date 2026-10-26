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

/**
 * Classifier v2's patterns matched anywhere (task-106): v1's, plus requests addressed to the requester that Codex
 * writes (bug-035) and Claude Code writes too. Frozen with v2: a pattern added or changed is v3.
 */
const ANYWHERE_V2: readonly RegExp[] = [
  ...ANYWHERE,
  /\bplease\s+(?:reply|respond|approve|review)\b/i,
  // A reply asked for, not one reported: "using your reply "Approved. Proceed."" is an account.
  /(?<!\byour\s+)\b(?:reply|respond)\b[^\n]{0,40}?\bapproved\b/i,
  /\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:approve|review)\b/i,
  /\bpending\s+your\b/i,
  // Work held until an approval: "Once dl-005 is approved, the value will be checked".
  /\b(?:once|when|after|until)\s+[^.!?\n]{0,80}?\b(?:is|are|gets?|been)\s+approved\b/i,
  /\b(?:once|when|after|if)\s+you\s+approve\b/i,
  /\byour\s+go-ahead\b/i,
  // "Please provide: "Approved. Proceed."", never "please provide a sample", which is a question.
  /\bplease\s+provide\b[^\n]{0,40}?\bapproved\b/i,
];

/**
 * Classifier v2's within-one-sentence patterns: "need/require … approval" only with a requester, the reader's
 * approval or the agent's own need (bug-027), never a document's; v1's "let me know … proceed" unchanged.
 */
const WITHIN_SENTENCE_V2: readonly (readonly [RegExp, RegExp])[] = [
  [/\b(?:needs?|requires?)\b/i, /\byour\b[\s\S]*\bapproval\b/i],
  [/\bI\s+(?:need|require)\b/i, /\bapproval\b/i],
  [/\bI(?:'m|’m|\s+am)\s+asking\b/i, /\bapproval\b/i],
  [/\bapproval\b/i, /\bI\s+(?:don't|don’t|do\s+not|haven't|haven’t|have\s+not)\s+(?:have|got|received)\b/i],
  [/\blet\s+me\s+know\b/i, /\b(?:proceed|continue|approve)/i],
];

/** Classifier v2's patterns, exported so that a test can pin them: changing one is v3. */
export const CLASSIFIER_V2 = { anywhere: ANYWHERE_V2, withinSentence: WITHIN_SENTENCE_V2 } as const;

/** A `?` that ends a sentence: followed, past closing emphasis, quotes or brackets, by a space or the end. */
const QUESTION_END = /\?(?=[*_"”')\]]*(?:\s|$))/;

/**
 * The waiting-for-input classifier v2 (REQ-RUN-06 as amended in 1.38, task-106): v1's order, its approval patterns
 * those of `CLASSIFIER_V2`, and a question anywhere in the last two paragraphs, so that an example after it does not
 * hide it (bug-035).
 */
export function classifyV2(message: string): InterventionKind | undefined {
  const text = withoutCode(message);
  const sentences = text.split(SENTENCE_END);
  if (
    ANYWHERE_V2.some((pattern) => pattern.test(text)) ||
    WITHIN_SENTENCE_V2.some((pair) => inOneSentence(sentences, pair))
  ) {
    return 'approval';
  }
  const paragraphs = text.split(/\n[^\S\n]*\n/).filter((paragraph) => paragraph.trim() !== '');
  if (paragraphs.slice(-2).some((paragraph) => QUESTION_END.test(paragraph))) return 'question';
  return undefined;
}

const REPLIES: ApproverPolicy['replies'] = {
  approval: 'Approved. Proceed.',
  question: 'No further input is available. Make the most reasonable choice, record it, and proceed.',
};

/** Policy v1 (experiment-design decision 2), frozen when the first campaign is published. */
const V1: ApproverPolicy = { version: 'v1', classify, replies: REPLIES, maxInterventions: 3 };

/** Policy v2 (task-106): only the classifier differs from v1, so the two differ only in when the runner answers. */
const V2: ApproverPolicy = { version: 'v2', classify: classifyV2, replies: REPLIES, maxInterventions: 3 };

/** Every policy this runner implements, by the version a campaign pins. */
const POLICIES: ReadonlyMap<string, ApproverPolicy> = new Map([
  [V1.version, V1],
  [V2.version, V2],
]);

/** The policy a campaign pins, or nothing when this runner does not implement that version. */
export function approverPolicy(version: string): ApproverPolicy | undefined {
  return POLICIES.get(version);
}

/** The versions this runner implements, for a message that has to name them. */
export function approverPolicyVersions(): readonly string[] {
  return [...POLICIES.keys()];
}
