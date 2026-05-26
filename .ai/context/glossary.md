# Glossary

- Bet: A player's wager for one round.
- Betting phase: Time window before the multiplier starts where bets can be placed.
- Cashout: Player action that settles an active bet before the crash.
- Crash point: Predetermined multiplier where the round ends.
- Games Service: Service that owns rounds, bets, WebSocket, and provably fair logic.
- House edge: Percentage advantage included in crash point calculation.
- Idempotency: Ability to process duplicate requests/messages without duplicate side effects.
- Inbox: Table that records already processed incoming messages.
- Ledger: Append-only financial transaction history.
- Multiplier: Current payout factor for an active round.
- Outbox: Table that records messages to publish after a database transaction.
- PlayerId: Keycloak JWT `sub`.
- Provably fair: Algorithm that lets players verify that crash results were predetermined.
- Round: One complete cycle of betting, running, crash, and settlement.
- Wallets Service: Service that owns wallet balance and financial ledger.
