CREATE TABLE IF NOT EXISTS "wallets" (
  "player_id" TEXT PRIMARY KEY,
  "balance_cents" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "wallets"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "wallets"
SET "updated_at" = COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP)
WHERE "updated_at" IS NULL;

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "operation_id" TEXT PRIMARY KEY,
  "player_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "balance_after_cents" INTEGER NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "ledger_entries_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "wallets"("player_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "processed_wallet_commands" (
  "event_id" TEXT PRIMARY KEY,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "result_event" JSONB NOT NULL,
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

CREATE INDEX IF NOT EXISTS "ledger_entries_player_id_occurred_at_idx"
  ON "ledger_entries"("player_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "outbox_messages_published_at_created_at_idx"
  ON "outbox_messages"("published_at", "created_at");

INSERT INTO "wallets" ("player_id", "balance_cents", "created_at", "updated_at")
VALUES (
  '11111111-1111-4111-8111-111111111111',
  100000,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("player_id") DO NOTHING;
