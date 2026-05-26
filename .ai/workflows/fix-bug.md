# Workflow - Fix Bug

1. Reproduce the bug or identify the failing invariant.
2. Add a failing test when practical.
3. Fix the smallest responsible layer.
4. Run the failing test and nearby tests.
5. Check whether the bug affects docs/specs.
6. Update `.ai/outputs/reports.md`.

## Guardrails

- Do not change public contracts unless the bug is in the contract.
- Do not weaken domain rules to make tests pass.
- Do not bypass idempotency or money safety rules.
