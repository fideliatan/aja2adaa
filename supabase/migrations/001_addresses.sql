-- ─────────────────────────────────────────────────────────
--  Migration: 001_addresses
--  Creates the addresses table for per-user shipping addresses
--  with Row Level Security so each user only sees their own rows.
--
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS addresses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL,
  receiver_name TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  address       TEXT        NOT NULL,
  is_primary    BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses (user_id);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES

-- SELECT: users can only see their own rows
CREATE POLICY "addresses_select_own"
  ON addresses
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users can only insert rows for themselves
CREATE POLICY "addresses_insert_own"
  ON addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own rows
CREATE POLICY "addresses_update_own"
  ON addresses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "addresses_delete_own"
  ON addresses
  FOR DELETE
  USING (auth.uid() = user_id);
