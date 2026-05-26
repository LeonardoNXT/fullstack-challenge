# Workflow - Implement Feature

1. Read relevant files in `.ai/context`.
2. Read the matching `.ai/specs` document.
3. Identify service boundary and public contracts.
4. Add or update domain tests first when the feature contains business rules.
5. Implement domain/application logic.
6. Implement infrastructure/persistence/messaging.
7. Implement presentation layer.
8. Update frontend only after backend contract is stable.
9. Run targeted tests.
10. Update `.ai/outputs/reports.md` with what changed and what remains.

## Commit Style

Use a small commit per behavior, for example:

- `feat(wallets): add ledger debit rules`
- `feat(games): add round lifecycle`
- `test: cover crash settlement`
