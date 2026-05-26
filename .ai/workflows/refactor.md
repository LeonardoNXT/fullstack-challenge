# Workflow - Refactor

1. State the behavior that must remain unchanged.
2. Run or identify current tests.
3. Refactor in small steps.
4. Avoid changing API payloads during pure refactors.
5. Run tests after the refactor.
6. Update docs only if structure or conventions changed.

## Good Refactor Targets

- Duplicated DTO mapping.
- Repeated money parsing.
- Messaging boilerplate.
- Frontend component extraction after behavior is stable.
