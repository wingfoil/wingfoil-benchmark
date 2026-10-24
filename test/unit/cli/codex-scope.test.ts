import { describe, expect, it } from 'vitest';

import { CODEX_SCOPE_END, codexScopeIssues } from '../../../src/cli/codex-scope.js';

/** dl-024's scope, enforced before any Codex session: the date, and the campaign or dry run it may serve. */
describe("the Codex credential's scope (dl-024)", () => {
  const before = Date.parse('2026-11-13T23:59:59Z');
  const after = Date.parse('2026-11-14T00:00:00Z');

  it('ends on 2026-11-13', () => {
    expect(CODEX_SCOPE_END).toBe('2026-11-13');
  });

  it('accepts the Codex baseline campaign and its dry runs until the end of 2026-11-13', () => {
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: 'presets/baseline-across-agents.yaml', arms: ['baseline'] },
        before,
      ),
    ).toEqual([]);
    expect(codexScopeIssues({ agent: 'codex', dryRunArm: 'baseline' }, before)).toEqual([]);
  });

  it('refuses any Codex session after 2026-11-13', () => {
    expect(codexScopeIssues({ agent: 'codex', dryRunArm: 'baseline' }, after)).toEqual([
      { path: 'agent', message: "codex's credential is in scope until 2026-11-13 only (dl-024)" },
    ]);
  });

  it('refuses a Codex campaign that does not extend baseline-across-agents, or runs another arm', () => {
    expect(codexScopeIssues({ agent: 'codex', arms: ['baseline'] }, before)).toEqual([
      {
        path: 'extends',
        message: 'a codex campaign must extend presets/baseline-across-agents.yaml (dl-024)',
      },
    ]);
    expect(
      codexScopeIssues(
        { agent: 'codex', preset: 'presets/baseline-across-agents.yaml', arms: ['baseline', 'wingfoil'] },
        before,
      ),
    ).toEqual([{ path: 'arms', message: 'a codex campaign runs the baseline arm only (dl-024)' }]);
    expect(codexScopeIssues({ agent: 'codex', dryRunArm: 'wingfoil' }, before)).toEqual([
      { path: 'arm', message: 'a codex dry run runs the baseline arm only (dl-024)' },
    ]);
  });

  it('says nothing for another agent', () => {
    expect(codexScopeIssues({ agent: 'claude-code', arms: ['baseline', 'wingfoil'] }, after)).toEqual([]);
  });
});
