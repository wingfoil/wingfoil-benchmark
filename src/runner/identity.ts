/**
 * The identity the agent commits with, the same in every arm (adr-003 decisions 6, 7): in the
 * wingfoil arm it is the declared member with the `approver` role (REQ-RUN-17); elsewhere it only
 * lets the agent commit, as it can in the wingfoil arm.
 */
export const AGENT_IDENTITY = { name: 'Benchmark Approver', email: 'approver@benchmark.localhost' };

/**
 * The host's user and group, for a one-off container that writes into a directory of the host: what
 * it writes stays the host's to read and remove, whatever its ids are.
 */
export function hostUser(): string {
  return `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
}
