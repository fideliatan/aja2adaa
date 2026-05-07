-- ─────────────────────────────────────────────────────────────────────────────
--  Migration: 003_qr_product_verification
--
--  Creates three tables that together track the full lifecycle of a physical
--  product unit from payment approval → QR generation → shipping → return.
--
--  Design notes:
--    • order_id / product_id / *_by columns are TEXT, not UUID FKs, because
--      the app uses mock string IDs ("ORD-001", "USR-001") rather than
--      Supabase auth UUIDs. (Same pattern as 002_fix_addresses.)
--    • RLS is disabled; the application always filters by known IDs.
--    • Enum-like columns use CHECK constraints instead of PG ENUM types so
--      adding new values only needs an ALTER TABLE, not a type migration.
--    • Tables are dropped and recreated so re-running this script is safe.
--    • "One approved return per unit" is enforced with a partial unique index
--      instead of EXCLUDE USING btree (which requires btree_gist in Supabase).
--    • A trigger keeps product_units.verification_count in sync automatically.
--
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Clean slate (reverse FK order) ──────────────────────────────────────────
-- return_requests is NOT dropped here — it already exists.
-- New QR-linkage columns are added in 004_add_qr_to_return_requests.sql.

DROP TABLE IF EXISTS qr_verifications  CASCADE;
DROP TABLE IF EXISTS product_units     CASCADE;

DROP FUNCTION IF EXISTS fn_increment_verification_count CASCADE;
DROP FUNCTION IF EXISTS fn_set_updated_at               CASCADE;


-- ═════════════════════════════════════════════════════════════════════════════
--  1. product_units
--     One row = one physical unit of a product in a specific order.
--     QR token is generated here after the admin approves payment.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE product_units (
  -- identity
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- order linkage  (mock IDs, e.g. "ORD-20240501-001")
  order_id            TEXT        NOT NULL,
  order_item_id       TEXT        NOT NULL,
  product_id          TEXT        NOT NULL,

  -- QR payload
  qr_token            TEXT        NOT NULL,
  qr_image_url        TEXT,

  -- lifecycle status
  --   active    → QR generated, not yet shipped
  --   shipped   → handed to courier
  --   returned  → return approved, physically received back
  --   invalid   → flagged by admin (fraud / duplicate)
  qr_status           TEXT        NOT NULL DEFAULT 'active'
                      CHECK (qr_status IN ('active', 'shipped', 'returned', 'invalid')),

  -- generation audit
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by        TEXT        NOT NULL,

  -- shipping audit
  shipped_at          TIMESTAMPTZ,

  -- return tracking
  is_returned         BOOLEAN     NOT NULL DEFAULT false,

  -- denormalised counter — kept in sync by trigger
  verification_count  INTEGER     NOT NULL DEFAULT 0,

  -- timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_product_units_qr_token UNIQUE (qr_token)
);

-- QR token lookup (every scan hits this index)
CREATE INDEX idx_product_units_qr_token
  ON product_units (qr_token);

-- Admin order-detail view
CREATE INDEX idx_product_units_order_id
  ON product_units (order_id);

-- Product management view
CREATE INDEX idx_product_units_product_id
  ON product_units (product_id);

ALTER TABLE product_units DISABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════════════════════════
--  2. qr_verifications
--     Immutable audit log — every scan is recorded regardless of outcome.
--     Enables detection of repeated / fraudulent scan attempts.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE qr_verifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  product_unit_id     UUID        NOT NULL
                      REFERENCES product_units (id) ON DELETE CASCADE,

  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scanned_by          TEXT        NOT NULL,

  -- outcome of this scan
  --   valid            → QR matched a live, active unit
  --   invalid          → token not found
  --   already_returned → unit already marked is_returned = true
  --   duplicate        → suspicious repeated scan pattern
  --   not_found        → product_unit row does not exist
  verification_result TEXT        NOT NULL
                      CHECK (verification_result IN (
                        'valid',
                        'invalid',
                        'already_returned',
                        'duplicate',
                        'not_found'
                      )),

  notes               TEXT
);

-- Reverse-lookup: all scans for a given unit
CREATE INDEX idx_qr_verifications_product_unit_id
  ON qr_verifications (product_unit_id);

-- Time-range queries ("scans in the last hour")
CREATE INDEX idx_qr_verifications_scanned_at
  ON qr_verifications (scanned_at DESC);

ALTER TABLE qr_verifications DISABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════════════════════════
--  4. Trigger: keep product_units.verification_count in sync
--     Fires after every INSERT into qr_verifications.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_increment_verification_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_units
  SET    verification_count = verification_count + 1,
         updated_at         = NOW()
  WHERE  id = NEW.product_unit_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_verification_count
  AFTER INSERT ON qr_verifications
  FOR EACH ROW
  EXECUTE FUNCTION fn_increment_verification_count();


-- ═════════════════════════════════════════════════════════════════════════════
--  5. Trigger: keep product_units.updated_at current
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_units_updated_at
  BEFORE UPDATE ON product_units
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
