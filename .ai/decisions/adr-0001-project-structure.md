# ADR-0001 - Project Structure And Implementation Memory

## Status

Accepted

## Context

The repository starts as a minimal monorepo scaffold for a full-stack Crash Game challenge. The implementation spans backend services, frontend, infrastructure, messaging, authentication, and tests. The work can drift easily without a persistent project memory.

## Decision

Create a `.ai` folder with:

- `context/` for stable project context.
- `specs/` for feature behavior and acceptance criteria.
- `skills/` for technology-specific project patterns.
- `workflows/` for repeatable implementation and review flows.
- `decisions/` for ADRs.
- `outputs/` for implementation reports.

The `.ai` folder is documentation only. It does not replace tests, README, or code comments.

## Consequences

- Future implementation sessions should start by reading `.ai/README.md`.
- Specs should be updated when behavior changes.
- Major architecture changes should add or update ADRs.
- Reports should track what was implemented and what remains.
