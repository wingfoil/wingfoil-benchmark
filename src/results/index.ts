export { nextExecution } from './executions.js';
export { COMPARISONS, compareExecutions, writeComparison } from './campaign-compare.js';
export type {
  AcrossGroup,
  CampaignComparison,
  ComparedGroup,
  ComparisonRow,
  NotCompared,
  NotedSide,
  OnlyIn,
  PinDiffers,
  PrimaryCategory,
} from './campaign-compare.js';
export {
  campaignSpendingEur,
  EXECUTION_FILE,
  executionResumable,
  executionSpendingEur,
  plannedRuns,
  readExecutionRecord,
  writeExecutionRecord,
} from './execution.js';
export type { ExecutionRecord, StopReason } from './execution.js';
export { recordedHashes, versionChange } from './recorded.js';
export type { RecordedHash } from './recorded.js';
export { DRY_RUNS, findDryRun, findDryRuns, harnessKey, latestDryRun } from './dry-runs.js';
export type { DryRunKey, DryRunRecord, DryRunsLookup, HarnessPin } from './dry-runs.js';
export { JUDGEMENTS_FILE, readJudgements } from './judgements.js';
export type { Judgement } from './judgements.js';
export { executionRate, executionRuns, readStepCommits, readStepUsage, readStoredRun } from './runs.js';
export type { StepUsage, StoredRun, StoredStep } from './runs.js';
export {
  AGGREGATE_FILE,
  AGGREGATE_VERSION,
  AGGREGATE_VERSIONS,
  aggregateExecution,
  breakEvenEntry,
  mK3Of,
  mRAcross,
  scoredRunsOf,
  writeAggregate,
} from './aggregate.js';
export type {
  AggregateFile,
  BreakEven,
  BreakEvenComparison,
  BreakEvenReason,
  BreakEvenRun,
  BreakEvenSide,
  MK3,
  ControlComparison,
  ControlMetric,
  ControlSide,
  CheckAggregate,
  Group,
  MRAcross,
  MRAggregate,
  MRRun,
  MRSide,
  RecordedPin,
  Similarity,
  SnapshotAggregate,
  StepAggregate,
  Tally,
  Value,
} from './aggregate.js';
export { readRunDetail, resolveRun } from './detail.js';
export type { RunDetail, ScoreView, StepDetail } from './detail.js';
export { findingNote, METRICS } from './finding.js';
export { packTranscripts, RELEASES, TRANSCRIPTS_ASSET } from './transcripts.js';
export type { KnownSecret, TranscriptPack } from './transcripts.js';
export type { FindingNote, FindingRequest, FindingShape, Metric } from './finding.js';
export { CATEGORY_MAP, certaintyOf, compare, readMetric, reported, summarize } from './compare.js';
export type {
  Better,
  Certainty,
  Comparison,
  Figures,
  MapEntry,
  MappedCategory,
  MetricId,
  Outcome,
  Reported,
  Summary,
} from './compare.js';
export { LOCAL_ASSUMPTION, LOCAL_PROFILES, paritySection } from './parity.js';
export type {
  LocalProfile,
  LocalTime,
  ParityCell,
  ParityEntry,
  ParityQuality,
  ParityRatios,
  ParityRun,
  ParitySection,
  ParitySummary,
  ParityUnmatched,
} from './parity.js';
