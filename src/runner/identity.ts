/**
 * The identity the agent commits with, the same in every arm (adr-003 decisions 6, 7): in the
 * wingfoil arm it is the declared member with the `approver` role (REQ-RUN-17); elsewhere it only
 * lets the agent commit, as it can in the wingfoil arm.
 */
export const AGENT_IDENTITY = { name: 'Benchmark Approver', email: 'approver@benchmark.localhost' };

/**
 * The agent's identity in a scenario with a separate approver (task-118, open question 1 option (b1)): a developer,
 * never the approver; the wingfoil arm's setup declares it with the `developer` role only.
 */
export const DEVELOPER_IDENTITY = { name: 'Benchmark Developer', email: 'developer@benchmark.localhost' };

/**
 * The agent's identity for a scenario: the developer's when it has a separate approver, the Benchmark Approver's
 * otherwise. One rule for the run and for the docs generators' snapshot of the source arm (task-118 review round 1),
 * so that a docs control renders the team the arm's agent works in.
 */
export function agentIdentityFor(scenario: { readonly approver?: unknown }): { name: string; email: string } {
  return scenario.approver === undefined ? AGENT_IDENTITY : DEVELOPER_IDENTITY;
}

/**
 * The host's user and group, for a one-off container that writes into a directory of the host: what
 * it writes stays the host's to read and remove, whatever its ids are.
 */
export function hostUser(): string {
  return `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
}
