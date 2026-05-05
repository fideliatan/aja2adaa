-- ─────────────────────────────────────────────────────────
--  Migration: 002_fix_addresses
--
--  Recreates the addresses table so it works with the app's
--  mock-auth system (user IDs like "USR-001", not Supabase UUIDs).
--
--  Changes from 001:
--    • user_id  → TEXT  (was UUID FK to auth.users)
--    • RLS      → disabled  (isolation done in app via .eq("user_id"))
--
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────

-- Drop old table (safe — no production data yet)
DROP TABLE IF EXISTS addresses;

-- Recreate with TEXT user_id (stores mock IDs like "USR-002")
CREATE TABLE addresses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  label         TEXT        NOT NULL,
  receiver_name TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  address       TEXT        NOT NULL,
  is_primary    BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses (user_id);

-- RLS off — the app always filters with .eq("user_id", userId)
ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;
