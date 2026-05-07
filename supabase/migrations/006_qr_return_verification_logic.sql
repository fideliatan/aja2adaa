-- ─────────────────────────────────────────────────────────────────────────────
--  Migration: 006_qr_return_verification_logic
--
--  Backend validation logic for QR-based return verification in the fraud
--  mitigation system.
--
--  Schema fixes in this file:
--    • qr_verifications.product_unit_id  → made nullable (needed to log
--      scans where the token doesn't exist in the database)
--    • qr_verifications.raw_qr_token     → new column (stores the literal
--      scanned string; essential for not_found / forensic cases)
--    • fn_build_qr_token                 → recreated as VOLATILE (was
--      incorrectly STABLE despite calling gen_random_bytes())
--
--  New objects:
--    fraud_flags              table  — one row per detected fraud event
--    fn_detect_suspicious_scans       — reads scan history, returns one row
--                                       of boolean/count flags
--    verify_qr_for_return             — main validation function; logs every
--                                       scan and raises fraud flags
--    fn_approve_qr_return             — admin approval; updates product_units
--                                       and return_requests atomically
--    v_fraud_summary          view   — all flags joined with unit / order info
--    v_active_fraud_flags     view   — unresolved flags only (admin queue)
--
--  Validation flow
--  ───────────────
--  1  Token lookup        → not_found if missing
--  2  Status check        → already_returned / invalid if status is wrong
--  3  Cross-check         → invalid + critical flag if order/product mismatch
--  4  Duplicate detection → duplicate if same scanner within 5 min
--  5  Excessive scans     → duplicate + flag if > 10 total scans
--  6  Cross-user scan     → flag raised but return still allowed
--  7  All clear           → log 'valid', allow return request
--
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Requires: 003, 004, 005 to have been run first
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
--  0.  Schema fixes and cleanup
-- ═════════════════════════════════════════════════════════════════════════════

-- 0a. Fix fn_build_qr_token: was declared STABLE but calls gen_random_bytes()
--     which is VOLATILE.  A STABLE function that calls VOLATILE functions will
--     still execute, but the planner may cache results incorrectly in some
--     query shapes.  Recreate as VOLATILE.
DROP FUNCTION IF EXISTS fn_build_qr_token(TEXT, TEXT, INT) CASCADE;

CREATE OR REPLACE FUNCTION fn_build_qr_token(
  p_order_id     TEXT,
  p_product_name TEXT,
  p_unit_index   INT
)
RETURNS TEXT
LANGUAGE sql
VOLATILE  -- must be VOLATILE: gen_random_bytes() produces a new value each call
AS $$
  SELECT
    'UNIT-'
    || upper(right(regexp_replace(p_order_id,     '[^A-Za-z0-9]', '', 'g'), 6))
    || '-'
    || upper(left( regexp_replace(p_product_name, '[^A-Za-z0-9]', '', 'g'), 4))
    || '-U'
    || p_unit_index::TEXT
    || '-'
    || upper(left(encode(gen_random_bytes(4), 'hex'), 7));
$$;


-- 0b. qr_verifications schema fixes
--     Make product_unit_id nullable so we can log scans for unknown tokens.
--     Add raw_qr_token to store the literal scanned string.

ALTER TABLE qr_verifications
  ALTER COLUMN product_unit_id DROP NOT NULL;

ALTER TABLE qr_verifications
  ADD COLUMN IF NOT EXISTS raw_qr_token TEXT;

-- Index for forensic lookups by raw token ("did anyone ever scan this string?")
CREATE INDEX IF NOT EXISTS idx_qr_verifications_raw_qr_token
  ON qr_verifications (raw_qr_token);


-- 0c. Drop objects this migration (re)creates, in reverse-dependency order
DROP VIEW     IF EXISTS v_active_fraud_flags                                  CASCADE;
DROP VIEW     IF EXISTS v_fraud_summary                                        CASCADE;
DROP FUNCTION IF EXISTS fn_approve_qr_return(UUID, TEXT, TEXT, UUID)          CASCADE;
DROP FUNCTION IF EXISTS verify_qr_for_return(TEXT, TEXT, TEXT, TEXT)          CASCADE;
DROP FUNCTION IF EXISTS fn_detect_suspicious_scans(UUID, TEXT)                CASCADE;
DROP TABLE    IF EXISTS fraud_flags                                             CASCADE;


-- ═════════════════════════════════════════════════════════════════════════════
--  1.  fraud_flags
--      One row per detected fraud / suspicious event.
--      Raised automatically by verify_qr_for_return; resolvable by admins.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE fraud_flags (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- nullable: not_found scans have no unit to reference
  product_unit_id UUID        REFERENCES product_units (id) ON DELETE SET NULL,

  -- raw token stored separately so the flag survives unit deletion
  qr_token        TEXT,

  -- what kind of suspicious event occurred
  --   unknown_token_scan      token not in product_units at all
  --   scan_already_returned   token exists but unit is already returned
  --   scan_invalidated_qr     token exists but qr_status = 'invalid'
  --   order_mismatch          token's order_id ≠ claimed order_id
  --   product_mismatch        token's product_id ≠ claimed product_id
  --   excessive_scan_count    >10 total scans on one token
  --   cross_user_scan         2+ different users scanned same token within 1 h
  --   scanner_high_velocity   one user scanned >5 different tokens within 10 min
  flag_type       TEXT        NOT NULL
                  CHECK (flag_type IN (
                    'unknown_token_scan',
                    'scan_already_returned',
                    'scan_invalidated_qr',
                    'order_mismatch',
                    'product_mismatch',
                    'excessive_scan_count',
                    'cross_user_scan',
                    'scanner_high_velocity'
                  )),

  -- low      → informational, no immediate action needed
  -- medium   → review when convenient
  -- high     → review soon; may indicate fraud attempt
  -- critical → immediate review required
  severity        TEXT        NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  scanned_by      TEXT,           -- mock user ID who triggered the flag
  details         JSONB,          -- structured context for the admin UI

  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- resolution
  is_resolved     BOOLEAN     NOT NULL DEFAULT false,
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,           -- admin mock ID
  resolution_note TEXT
);

CREATE INDEX idx_fraud_flags_product_unit_id ON fraud_flags (product_unit_id);
CREATE INDEX idx_fraud_flags_flagged_at      ON fraud_flags (flagged_at DESC);
CREATE INDEX idx_fraud_flags_flag_type       ON fraud_flags (flag_type);
CREATE INDEX idx_fraud_flags_severity        ON fraud_flags (severity);
-- Fast admin queue: unresolved flags
CREATE INDEX idx_fraud_flags_unresolved      ON fraud_flags (flagged_at DESC)
  WHERE NOT is_resolved;

ALTER TABLE fraud_flags DISABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════════════════════════
--  2.  fn_detect_suspicious_scans
--      Reads the scan history for one product unit BEFORE the current scan
--      is recorded.  Returns a single row of boolean / count flags.
--
--  Thresholds (all configurable by changing the INTERVAL / INT literals):
--    self-duplicate window   5 min   — same scanner, same token
--    cross-user window      60 min   — different scanners, same token
--    recent-burst window    10 min   — any scans within this window
--    max total scans        10       — all-time cap before flagging
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_detect_suspicious_scans(
  p_unit_id    UUID,
  p_scanned_by TEXT
)
RETURNS TABLE (
  is_self_duplicate  BOOLEAN,     -- same scanner scanned this token within 5 min
  is_cross_user      BOOLEAN,     -- a DIFFERENT user scanned this token within 1 h
  total_scan_count   BIGINT,      -- all-time scans for this unit (before this one)
  recent_scan_count  BIGINT,      -- scans in the last 10 min (any user)
  unique_scanners_1h BIGINT,      -- distinct scanners in the last 1 h
  last_scan_at       TIMESTAMPTZ, -- timestamp of the most recent previous scan
  last_scan_by       TEXT         -- scanner of the most recent previous scan
)
LANGUAGE plpgsql
STABLE  -- reads tables but has no side effects; safe for planner caching within tx
AS $$
BEGIN
  RETURN QUERY
  WITH scan_stats AS (
    SELECT
      -- self-duplicate: same scanner within 5 min
      BOOL_OR(
        scanned_by = p_scanned_by
        AND scanned_at > NOW() - INTERVAL '5 minutes'
      )                                                               AS self_dup,

      -- cross-user: a DIFFERENT scanner within 60 min
      BOOL_OR(
        scanned_by <> p_scanned_by
        AND scanned_at > NOW() - INTERVAL '60 minutes'
      )                                                               AS cross_user,

      COUNT(*)                                                        AS total_count,

      COUNT(*) FILTER (
        WHERE scanned_at > NOW() - INTERVAL '10 minutes'
      )                                                               AS recent_count,

      COUNT(DISTINCT scanned_by) FILTER (
        WHERE scanned_at > NOW() - INTERVAL '1 hour'
      )                                                               AS unique_1h,

      MAX(scanned_at)                                                 AS last_at,
      -- most-recent scanner: first element of desc-sorted array
      (ARRAY_AGG(scanned_by ORDER BY scanned_at DESC))[1]            AS last_by

    FROM qr_verifications
    WHERE product_unit_id = p_unit_id
  )
  SELECT
    COALESCE(s.self_dup,    false),
    COALESCE(s.cross_user,  false),
    COALESCE(s.total_count, 0),
    COALESCE(s.recent_count, 0),
    COALESCE(s.unique_1h,   0),
    s.last_at,
    s.last_by
  FROM scan_stats s;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  3.  verify_qr_for_return
--      Main validation function.  Call this every time a QR is scanned for
--      a return request.  Always writes to qr_verifications and may write
--      to fraud_flags.  Returns result columns via OUT parameters.
--
--  Parameters
--  ──────────
--  p_qr_token           TEXT  — the literal token scanned from the QR image
--  p_scanned_by         TEXT  — mock user ID of the scanner (customer or admin)
--  p_claimed_order_id   TEXT  — optional: order the customer claims this is from
--  p_claimed_prod_id    TEXT  — optional: product the customer claims this is
--
--  Returns (OUT columns)
--  ─────────────────────
--  is_valid         BOOLEAN  — true only when the return is safe to proceed
--  result_code      TEXT     — machine-readable outcome key
--  message          TEXT     — user-facing Indonesian message
--  out_unit_id      UUID     — product_units.id  (null when not_found)
--  out_order_id     TEXT     — product_units.order_id
--  out_product_id   TEXT     — product_units.product_id
--  verification_id  UUID     — the qr_verifications row just inserted
--  fraud_flag_id    UUID     — fraud_flags row if one was raised, else null
--
--  Example
--  ───────
--  SELECT is_valid, result_code, message, out_unit_id
--  FROM   verify_qr_for_return(
--           'UNIT-ORD011-MOIS-U1-A3F9C2B',  -- scanned token
--           'USR-002',                        -- customer scanning
--           'ORD-011',                        -- claimed order
--           'PROD-001'                        -- claimed product
--         );
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_qr_for_return(
  p_qr_token           TEXT,
  p_scanned_by         TEXT,
  p_claimed_order_id   TEXT    DEFAULT NULL,
  p_claimed_prod_id    TEXT    DEFAULT NULL,
  -- ── OUT parameters (the returned "row") ─────────────────────────────────
  OUT is_valid         BOOLEAN,
  OUT result_code      TEXT,
  OUT message          TEXT,
  OUT out_unit_id      UUID,
  OUT out_order_id     TEXT,
  OUT out_product_id   TEXT,
  OUT verification_id  UUID,
  OUT fraud_flag_id    UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit   product_units%ROWTYPE;
  v_scan   RECORD;
BEGIN
  -- initialise nullable OUTs
  out_unit_id     := NULL;
  out_order_id    := NULL;
  out_product_id  := NULL;
  verification_id := NULL;
  fraud_flag_id   := NULL;

  -- ── Step 1: token lookup ─────────────────────────────────────────────────
  SELECT * INTO v_unit
  FROM   product_units
  WHERE  qr_token = p_qr_token;

  IF NOT FOUND THEN
    -- Log the unknown-token scan (product_unit_id is NULL; raw_qr_token captures it)
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      NULL, p_qr_token, p_scanned_by,
      'not_found',
      'Token tidak ditemukan dalam sistem'
    )
    RETURNING id INTO verification_id;

    -- Raise a low-severity flag (could be typo; escalates if repeated)
    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      NULL, p_qr_token,
      'unknown_token_scan', 'low',
      p_scanned_by,
      jsonb_build_object(
        'attempted_token',  p_qr_token,
        'claimed_order_id', p_claimed_order_id,
        'claimed_prod_id',  p_claimed_prod_id
      )
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'not_found';
    message     := 'QR code tidak ditemukan. Pastikan kode QR benar dan belum rusak.';
    RETURN;
  END IF;

  -- Unit found — populate identity OUTs
  out_unit_id    := v_unit.id;
  out_order_id   := v_unit.order_id;
  out_product_id := v_unit.product_id;


  -- ── Step 2: lifecycle status checks ─────────────────────────────────────

  -- 2a: Already returned
  IF v_unit.is_returned OR v_unit.qr_status = 'returned' THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'already_returned',
      'Unit sudah dikembalikan sebelumnya — percobaan pengembalian ganda'
    )
    RETURNING id INTO verification_id;

    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'scan_already_returned', 'high',
      p_scanned_by,
      jsonb_build_object(
        'unit_id',           v_unit.id,
        'order_id',          v_unit.order_id,
        'qr_status',         v_unit.qr_status,
        'verification_count', v_unit.verification_count
      )
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'already_returned';
    message     := 'Produk ini sudah pernah dikembalikan. Pengembalian ganda tidak diizinkan.';
    RETURN;
  END IF;

  -- 2b: Manually invalidated
  IF v_unit.qr_status = 'invalid' THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'invalid',
      'QR telah dinonaktifkan oleh admin'
    )
    RETURNING id INTO verification_id;

    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'scan_invalidated_qr', 'high',
      p_scanned_by,
      jsonb_build_object('unit_id', v_unit.id, 'order_id', v_unit.order_id)
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'invalid';
    message     := 'QR code ini telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.';
    RETURN;
  END IF;


  -- ── Step 3: cross-check claimed order / product ──────────────────────────

  IF p_claimed_order_id IS NOT NULL AND v_unit.order_id <> p_claimed_order_id THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'invalid',
      'Order mismatch — real: ' || v_unit.order_id
        || ', claimed: ' || p_claimed_order_id
    )
    RETURNING id INTO verification_id;

    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'order_mismatch', 'critical',
      p_scanned_by,
      jsonb_build_object(
        'real_order_id',    v_unit.order_id,
        'claimed_order_id', p_claimed_order_id
      )
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'invalid';
    message     := 'QR tidak sesuai dengan pesanan yang diklaim. Kemungkinan penipuan terdeteksi.';
    RETURN;
  END IF;

  IF p_claimed_prod_id IS NOT NULL AND v_unit.product_id <> p_claimed_prod_id THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'invalid',
      'Product mismatch — real: ' || v_unit.product_id
        || ', claimed: ' || p_claimed_prod_id
    )
    RETURNING id INTO verification_id;

    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'product_mismatch', 'critical',
      p_scanned_by,
      jsonb_build_object(
        'real_product_id',    v_unit.product_id,
        'claimed_product_id', p_claimed_prod_id
      )
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'invalid';
    message     := 'QR tidak sesuai dengan produk yang diklaim. Kemungkinan penipuan terdeteksi.';
    RETURN;
  END IF;


  -- ── Step 4: suspicious scan pattern analysis ─────────────────────────────
  -- Read history BEFORE this scan is logged (fn_detect_suspicious_scans is STABLE)
  SELECT * INTO v_scan
  FROM fn_detect_suspicious_scans(v_unit.id, p_scanned_by);

  -- 4a: Same scanner, same QR, within 5 minutes → duplicate
  IF v_scan.is_self_duplicate THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'duplicate',
      'Scan ulang oleh scanner yang sama dalam 5 menit terakhir'
    )
    RETURNING id INTO verification_id;

    is_valid    := false;
    result_code := 'duplicate';
    message     := 'QR ini baru saja kamu scan. Tunggu beberapa menit, lalu coba lagi.';
    RETURN;
  END IF;

  -- 4b: All-time scan count exceeds threshold → block + flag
  IF v_scan.total_scan_count >= 10 THEN
    INSERT INTO qr_verifications (
      product_unit_id, raw_qr_token, scanned_by, verification_result, notes
    )
    VALUES (
      v_unit.id, p_qr_token, p_scanned_by,
      'duplicate',
      'Melebihi batas scan: ' || (v_scan.total_scan_count + 1)::TEXT || ' total'
    )
    RETURNING id INTO verification_id;

    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'excessive_scan_count', 'high',
      p_scanned_by,
      jsonb_build_object(
        'total_scan_count', v_scan.total_scan_count + 1,
        'threshold',        10
      )
    )
    RETURNING id INTO fraud_flag_id;

    is_valid    := false;
    result_code := 'duplicate';
    message     := 'QR ini terlalu sering discan dan telah ditandai untuk review admin.';
    RETURN;
  END IF;

  -- 4c: Different users scanning same token within 1 hour
  --     → raise a flag, but still ALLOW the return (admin will review)
  IF v_scan.is_cross_user THEN
    INSERT INTO fraud_flags (
      product_unit_id, qr_token, flag_type, severity, scanned_by, details
    )
    VALUES (
      v_unit.id, p_qr_token,
      'cross_user_scan', 'high',
      p_scanned_by,
      jsonb_build_object(
        'unique_scanners_1h',  v_scan.unique_scanners_1h,
        'last_scan_by',        v_scan.last_scan_by,
        'last_scan_at',        v_scan.last_scan_at
      )
    )
    RETURNING id INTO fraud_flag_id;
    -- intentional fall-through: return is still allowed, admin sees the flag
  END IF;


  -- ── Step 5: all checks passed → valid ────────────────────────────────────
  INSERT INTO qr_verifications (
    product_unit_id, raw_qr_token, scanned_by, verification_result, notes
  )
  VALUES (
    v_unit.id, p_qr_token, p_scanned_by,
    'valid',
    CASE WHEN fraud_flag_id IS NOT NULL
      THEN 'Valid — multi-scanner activity flagged: ' || fraud_flag_id::TEXT
      ELSE 'Verifikasi berhasil'
    END
  )
  RETURNING id INTO verification_id;

  is_valid    := true;
  result_code := 'valid';
  message     := CASE WHEN fraud_flag_id IS NOT NULL
    THEN 'QR valid. Catatan: aktivitas mencurigakan terdeteksi dan dilaporkan ke admin.'
    ELSE 'Verifikasi berhasil. Permintaan pengembalian dapat diproses.'
  END;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  4.  fn_approve_qr_return
--      Called by the admin after QR verification succeeds and they decide to
--      approve the return.  Atomically updates product_units and
--      return_requests.
--
--  Parameters
--  ──────────
--  p_unit_id          UUID  — product_units.id to mark returned
--  p_approved_by      TEXT  — admin mock user ID
--  p_reason           TEXT  — reason stored in return_requests (optional)
--  p_return_req_id    UUID  — existing return_requests.id (optional).
--                             If NULL the function finds or creates the row.
--
--  Returns
--  ───────
--  UUID  — the return_requests.id that was approved / created
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_approve_qr_return(
  p_unit_id         UUID,
  p_approved_by     TEXT,
  p_reason          TEXT  DEFAULT 'Pengembalian disetujui oleh admin',
  p_return_req_id   UUID  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit      product_units%ROWTYPE;
  v_req_id    UUID;
BEGIN
  -- Lock the unit row for the duration of this transaction
  SELECT * INTO v_unit
  FROM   product_units
  WHERE  id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_approve_qr_return: product_unit not found: %', p_unit_id;
  END IF;

  IF v_unit.is_returned OR v_unit.qr_status = 'returned' THEN
    RAISE EXCEPTION
      'fn_approve_qr_return: unit % has already been returned (qr_status=%)',
      p_unit_id, v_unit.qr_status;
  END IF;

  -- ── Mark unit as returned ─────────────────────────────────────────────────
  UPDATE product_units
  SET    qr_status   = 'returned',
         is_returned = true,
         updated_at  = NOW()
  WHERE  id = p_unit_id;

  -- ── Update or create return_requests row ─────────────────────────────────
  IF p_return_req_id IS NOT NULL THEN
    -- Explicit request ID supplied: update that specific row
    UPDATE return_requests
    SET    status      = 'approved',
           approved_by = p_approved_by,
           approved_at = NOW()
    WHERE  id              = p_return_req_id
      AND  product_unit_id = p_unit_id
    RETURNING id INTO v_req_id;

    IF v_req_id IS NULL THEN
      RAISE EXCEPTION
        'fn_approve_qr_return: return_request % not found or does not belong to unit %',
        p_return_req_id, p_unit_id;
    END IF;

  ELSE
    -- No explicit ID: find the pending request for this unit
    UPDATE return_requests
    SET    status      = 'approved',
           approved_by = p_approved_by,
           approved_at = NOW()
    WHERE  product_unit_id = p_unit_id
      AND  status          = 'pending'
    RETURNING id INTO v_req_id;

    -- No pending request found: create one (admin-initiated approval)
    IF v_req_id IS NULL THEN
      INSERT INTO return_requests (
        product_unit_id,
        reason,
        status,
        requested_by,
        approved_by,
        approved_at
      )
      VALUES (
        p_unit_id,
        p_reason,
        'approved',
        p_approved_by,  -- admin is both requester and approver in this path
        p_approved_by,
        NOW()
      )
      RETURNING id INTO v_req_id;
    END IF;
  END IF;

  -- ── Audit log ─────────────────────────────────────────────────────────────
  INSERT INTO qr_verifications (
    product_unit_id,
    raw_qr_token,
    scanned_by,
    verification_result,
    notes
  )
  VALUES (
    p_unit_id,
    v_unit.qr_token,
    p_approved_by,
    'valid',
    'Return approved by admin — return_request: ' || v_req_id::TEXT
  );

  RETURN v_req_id;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  5.  v_fraud_summary
--      All fraud flags joined with their product unit / order context.
--      Used by the admin fraud monitoring dashboard.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_fraud_summary AS
SELECT
  -- flag identity
  ff.id              AS flag_id,
  ff.flag_type,
  ff.severity,
  ff.is_resolved,
  ff.flagged_at,
  ff.scanned_by,
  ff.details,
  ff.resolved_at,
  ff.resolved_by,
  ff.resolution_note,

  -- unit context (null when flag is for an unknown token)
  pu.id              AS unit_id,
  pu.order_id,
  pu.order_item_id,
  pu.product_id,
  pu.qr_status,
  pu.is_returned,
  pu.verification_count,
  pu.generated_by,

  -- raw token (always present — survives unit deletion)
  COALESCE(pu.qr_token, ff.qr_token) AS qr_token

FROM  fraud_flags     ff
LEFT JOIN product_units pu ON pu.id = ff.product_unit_id
ORDER BY ff.flagged_at DESC;


-- ═════════════════════════════════════════════════════════════════════════════
--  6.  v_active_fraud_flags
--      Unresolved flags only — this is the admin action queue.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_active_fraud_flags AS
SELECT *
FROM   v_fraud_summary
WHERE  NOT is_resolved
ORDER BY
  -- surface critical / high flags first, then by age
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high'     THEN 2
    WHEN 'medium'   THEN 3
    WHEN 'low'      THEN 4
  END,
  flagged_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
--  Smoke-test (rolled back immediately — no real data written)
--  Self-contained: inserts its own test rows directly so migration 005 does
--  not need to have been run first.
--  Remove the ROLLBACK line to persist the test rows.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

  -- Seed one product_unit directly (avoids dependency on migration 005)
  INSERT INTO product_units (
    order_id, order_item_id, product_id,
    qr_token, qr_status, generated_at, generated_by
  )
  VALUES
    ('ORD-TEST-99'::TEXT, 'ORD-TEST-99-ITEM01'::TEXT, 'PROD-001'::TEXT,
     'UNIT-TEST99-MOIS-U1-AAABBB1'::TEXT, 'active'::TEXT, NOW(), 'USR-001'::TEXT),

    ('ORD-TEST-99'::TEXT, 'ORD-TEST-99-ITEM02'::TEXT, 'PROD-003'::TEXT,
     'UNIT-TEST99-VITA-U1-CCC2222'::TEXT, 'active'::TEXT, NOW(), 'USR-001'::TEXT),

    ('ORD-TEST-99'::TEXT, 'ORD-TEST-99-ITEM02'::TEXT, 'PROD-003'::TEXT,
     'UNIT-TEST99-VITA-U2-DDD3333'::TEXT, 'active'::TEXT, NOW(), 'USR-001'::TEXT);

  -- Test A: valid scan — should return is_valid=true, result_code='valid'
  SELECT is_valid, result_code, message, out_order_id, out_product_id
  FROM   verify_qr_for_return(
    'UNIT-TEST99-MOIS-U1-AAABBB1'::TEXT,
    'USR-002'::TEXT,
    'ORD-TEST-99'::TEXT,
    'PROD-001'::TEXT
  );

  -- Test B: not_found — should return is_valid=false, result_code='not_found'
  SELECT is_valid, result_code, message
  FROM   verify_qr_for_return(
    'UNIT-FAKE-TOKEN-000'::TEXT,
    'USR-002'::TEXT
  );

  -- Test C: order mismatch — should return is_valid=false, result_code='invalid'
  SELECT is_valid, result_code, message
  FROM   verify_qr_for_return(
    'UNIT-TEST99-MOIS-U1-AAABBB1'::TEXT,
    'USR-002'::TEXT,
    'ORD-WRONG-01'::TEXT,
    NULL::TEXT
  );

  -- Test D: already_returned — mark unit returned, then re-scan
  UPDATE product_units
  SET    qr_status = 'returned', is_returned = true
  WHERE  qr_token  = 'UNIT-TEST99-VITA-U2-DDD3333';

  SELECT is_valid, result_code, message
  FROM   verify_qr_for_return(
    'UNIT-TEST99-VITA-U2-DDD3333'::TEXT,
    'USR-002'::TEXT
  );

ROLLBACK;
