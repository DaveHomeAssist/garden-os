# Metrics and Launch Gates

This document defines minimal success metrics and hard launch gates for each mode.

## Cross-Mode Metrics

### Reliability
- Deterministic replay pass rate: 100%
- Save/load integrity pass rate: 100%
- Console error rate in smoke suite: 0

### UX
- Tutorial completion rate target: >= 70%
- First-session meaningful action target (place, decide, draft): >= 80%
- Median time to first successful loop completion: <= 10 minutes

### Retention (local-first proxy)
- Return session within 7 days: >= 35%
- Multi-run users (2+ completed loops): >= 40%

## Mode-Specific Metrics

### Plant Strategy Simulator
- Mission completion rate (starter missions): >= 65%
- Re-run rate after first debrief: >= 50%
- Limiting-factor fix adoption rate: >= 40%

### Rescue Mission
- Scenario completion rate: >= 70%
- Corrective replay rate after failure: >= 45%
- Average decisions per scenario: >= 3

### Garden League Draft
- Full season completion rate: >= 60%
- Weekly lineup submission compliance: >= 75%
- Tie-break dispute rate: < 5%

## Launch Gates

## Gate A: Internal Alpha
- [ ] Core loop complete for target mode
- [ ] Deterministic tests in place
- [ ] Save/load pass for mode state
- [ ] Basic content pack loaded

## Gate B: Closed Beta
- [ ] Mobile and desktop smoke pass
- [ ] Keyboard flow pass for primary actions
- [ ] No P0/P1 defects open
- [ ] Telemetry proxy collection working (local analytics snapshots)

## Gate C: Public Launch
- [ ] Launch checklist complete
- [ ] Documentation published
- [ ] Rollback strategy documented
- [ ] Known issues list published
- [ ] Post-launch triage owner assigned

## Defect Severity Policy
- P0: data loss, score corruption, game flow dead-end
- P1: major UX break, deterministic mismatch, repeated crashes
- P2: non-blocking flow issues, visual defects, copy clarity issues
- P3: polish and enhancement items

## Rollback Triggers
- Determinism failures in production scenarios
- Corrupt local save migration reports
- Crash loop rate above threshold in first 24 hours

## Post-Launch Review Cadence
- Day 1: hotfix triage
- Day 3: behavior and completion review
- Day 7: retention review and sprint reprioritization
