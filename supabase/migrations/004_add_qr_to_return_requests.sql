-- ─────────────────────────────────────────────────────────────────────────────
--  Migration: 004_add_qr_to_return_requests
--
--  Adds QR-verification columns to the existing return_requests table.
--  All columns use ADD COLUMN IF NOT EXISTS so re-running is safe.
--
--  New columns:
--    product_unit_id  → links the return to a specific physical unit in
--                       product_units (created in 003_qr_product_verification)
--    approved_by      → admin mock ID who approved / rejected the request
--    approved_at      → timestamp when the decision was recorded
--
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Run AFTER: 003_qr_product_verification.sql
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Add new columns ──────────────────────────────────────────────────────────

-- Links the return claim to the exact physical unit being returned.
-- NULL is allowed for legacy rows that existed before QR tracking.
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS product_unit_id UUID
    REFERENCES product_units (id) ON DELETE SET NULL;

-- Admin who acted on the request (mock ID, e.g. "USR-001").
-- May already exist on some installs; IF NOT EXISTS guards against that.
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Timestamp of approval / rejection decision.
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;


-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Fast lookup: "which return requests reference this product unit?"
CREATE INDEX IF NOT EXISTS idx_return_requests_product_unit_id
  ON return_requests (product_unit_id);

-- Enforce: at most one approved return per physical unit.
-- A partial unique index is used because EXCLUDE USING btree requires
-- the btree_gist extension which is not available on the Supabase free tier.
-- NULL product_unit_id rows are excluded from the constraint automatically
-- (PostgreSQL unique indexes ignore NULL values).
CREATE UNIQUE INDEX IF NOT EXISTS uq_return_requests_one_approval
  ON return_requests (product_unit_id)
  WHERE (status = 'approved');
