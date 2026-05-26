# Spec - Audios

## Priority

Bonus only. Do not implement before eliminatory gameplay, tests, and Docker flow are working.

## Goal

Add lightweight audio feedback for important game moments.

## Sounds

- Bet accepted.
- Cashout success.
- Crash.
- Round start.

## Rules

- Audio must be user-toggleable.
- Default to muted or respect browser autoplay restrictions.
- Do not block gameplay if audio fails to load.

## Acceptance Criteria

- User can disable all sounds.
- Sounds do not play before user interaction when browser blocks autoplay.
