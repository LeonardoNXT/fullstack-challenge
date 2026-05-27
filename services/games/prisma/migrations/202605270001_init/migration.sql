CREATE TABLE IF NOT EXISTS "rounds" (
  "round_id" TEXT PRIMARY KEY,
  "phase" TEXT NOT NULL,
  "server_seed" TEXT NOT NULL,
  "server_seed_hash" TEXT NOT NULL,
  "client_seed" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "crash_point_bps" INTEGER NOT NULL,
  "betting_opened_at" TIMESTAMP(3) NOT NULL,
  "betting_closes_at" TIMESTAMP(3) NOT NULL,
  "started_at" TIMESTAMP(3),
  "crashed_at" TIMESTAMP(3),
  "growth_bps_per_second" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bets" (
  "bet_id" TEXT PRIMARY KEY,
  "round_id" TEXT NOT NULL,
  "player_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "auto_cashout_multiplier_bps" INTEGER,
  "cashout_multiplier_bps" INTEGER,
  "payout_cents" INTEGER,
  "placed_at" TIMESTAMP(3) NOT NULL,
  "settled_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  CONSTRAINT "bets_round_id_fkey"
    FOREIGN KEY ("round_id") REFERENCES "rounds"("round_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "processed_wallet_events" (
  "event_id" TEXT PRIMARY KEY,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "outbox_messages" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "bets_round_id_player_id_key"
  ON "bets"("round_id", "player_id");

CREATE INDEX IF NOT EXISTS "rounds_phase_betting_opened_at_idx"
  ON "rounds"("phase", "betting_opened_at");

CREATE INDEX IF NOT EXISTS "bets_player_id_placed_at_idx"
  ON "bets"("player_id", "placed_at");

CREATE INDEX IF NOT EXISTS "bets_placed_at_idx"
  ON "bets"("placed_at");

CREATE INDEX IF NOT EXISTS "bets_round_id_status_idx"
  ON "bets"("round_id", "status");

CREATE INDEX IF NOT EXISTS "outbox_messages_published_at_created_at_idx"
  ON "outbox_messages"("published_at", "created_at");
