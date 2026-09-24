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

/** Text up to the end of the sentence: no `.`, `!` or `?`, and no blank line. A single line break wraps. */
const SENTENCE = String.raw`(?:(?!\n[^\S\n]*\n)[^.!?])*?`;

/**
 * dl-004 rule 1, v1: the approval patterns, matched **anywhere** in the message. A real approval
 * request need not end with a question (the spike's did not), so these are read for what they ask.
 */
const APPROVAL_PATTERNS: readonly RegExp[] = [
  /\bare\s+you\s+sure\b/i,
  /\b(?:please|can\s+you|could\s+you)\s+confirm\b/i,
  new RegExp(String.raw`\b(?:needs?|requires?)\b${SENTENCE}\bapproval\b`, 'i'),
  /\bpermission\s+to\b/i,
  /\b(?:may|shall)\s+I\b/i,
  /\b(?:do\s+you\s+want|would\s+you\s+like)\s+me\s+to\b/i,
  /\b(?:awaiting|waiting\s+for)\s+your\b/i,
  new RegExp(String.raw`\blet\s+me\s+know\b${SENTENCE}\b(?:proceed|continue|approve)`, 'i'),
];

/**
 * dl-004's preparation: fenced code blocks and inline code spans are removed, so that a diff, a test
 * fixture or a file the agent quotes cannot trigger a rule. The message itself is never changed.
 */
function withoutCode(message: string): string {
  return message
    .replaceAll(/^[^\S\n]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[^\S\n]*\1[^\n]*$|(?![\s\S]))/gm, '')
    .replaceAll(/`[^`\n]*`/g, '');
}

/** Rule 2's reading of the last line: trailing whitespace and Markdown emphasis removed. */
function lastLine(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return (lines.at(-1) ?? '').replace(/[\s*_]+$/, '');
}

/**
 * The waiting-for-input classifier v1 (REQ-RUN-06, dl-004), over a session's final assistant message:
 * an approval pattern anywhere in it first, then a question at its end, otherwise not waiting.
 */
export function classify(message: string): InterventionKind | undefined {
  const text = withoutCode(message);
  if (APPROVAL_PATTERNS.some((pattern) => pattern.test(text))) return 'approval';
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
