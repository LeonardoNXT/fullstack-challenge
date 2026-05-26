# Spec - Provably Fair

## Goal

Let players verify that every crash point was predetermined before bets were placed.

## Round Data

Before betting:

- Publish `serverSeedHash`.
- Store `serverSeed` privately.
- Store `clientSeed` or deterministic public seed.
- Store round nonce/index.

After crash:

- Reveal `serverSeed`.
- Return all verification inputs.
- Return crash point produced by the algorithm.

## Algorithm Requirements

- Deterministic.
- Uses cryptographic hash/HMAC.
- Includes a house edge.
- Produces a crash multiplier in basis points or another integer-safe representation.
- Does not use floating point for authoritative payout math.

## Verify Endpoint

`GET /rounds/:roundId/verify` returns:

- `roundId`
- `serverSeed`
- `serverSeedHash`
- `clientSeed`
- `nonce`
- `houseEdgeBps`
- `crashPointBps`
- algorithm name/version

## Acceptance Criteria

- Same inputs always produce same crash point.
- Hash of revealed seed matches the pre-round hash.
- Unit tests cover deterministic examples.
