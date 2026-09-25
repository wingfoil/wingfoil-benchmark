import { z } from 'zod';

/** REQ-FMT-08: `scenarios/leak-scan.yaml`, the leak scan's declarations. Unknown keys are rejected. */
export const leakScanSchema = z.strictObject({
  /** The harnesses and tools a step prompt must not name, matched case-insensitively on word boundaries. */
  harness_names: z.array(z.string().trim().min(1)).min(1, 'must name at least one harness'),
  /** The shortest quoted string of an oracle file the scan looks for in the seed and the prompts. */
  oracle_literal_min_length: z.number().int().min(1, 'must be at least 1'),
});

/** The leak scan's declarations, as parsed. */
export type LeakScanDeclarations = z.infer<typeof leakScanSchema>;
