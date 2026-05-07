-- ─────────────────────────────────────────────────────────────────────────────
--  Migration: 005_generate_product_unit_qrs
--
--  Stored functions that create product_units rows (one per physical unit)
--  when an admin approves a payment.
--
--  Scenario: customer buys 1 × Moisturizer + 2 × Serum
--  Result:   3 rows inserted into product_units, each with a unique qr_token
--
--  Functions:
--    fn_build_qr_token(order_id, product_name, unit_index)
--      → pure token builder, returns TEXT
--
--    generate_product_unit_qrs(order_id, generated_by, items JSONB)
--      → idempotent; inserts product_units and returns every new row
--
--  View:
--    v_order_qr_status
--      → per-order summary: total units, how many are generated / pending
--
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Requires: 003_qr_product_verification.sql to have been run first
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_build_qr_token(TEXT, TEXT, INT)         CASCADE;
DROP FUNCTION IF EXISTS generate_product_unit_qrs(TEXT, TEXT, JSONB) CASCADE;
DROP VIEW     IF EXISTS v_order_qr_status                           CASCADE;


-- ═════════════════════════════════════════════════════════════════════════════
--  1.  fn_build_qr_token
--
--  Builds a human-readable, globally-unique QR token.
--
--  Format:  UNIT-{ORDER6}-{PROD4}-U{n}-{RAND7}
--  Example: UNIT-ORD011-MOIS-U2-A3F9C2B
--
--  ORDER6  last 6 alphanumeric chars of the order ID, uppercased
--  PROD4   first 4 non-space chars of the product name, uppercased
--  n       1-based unit index within the line item (e.g. 1 or 2 for qty=2)
--  RAND7   7 uppercase hex chars from gen_random_bytes — ~268 billion
--          combinations; collision chance across 1 M tokens ≈ 0.0002 %
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_build_qr_token(
  p_order_id     TEXT,
  p_product_name TEXT,
  p_unit_index   INT
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT
    'UNIT-'
    -- order code: strip non-alphanumeric, take last 6 chars
    || upper(right(regexp_replace(p_order_id, '[^A-Za-z0-9]', '', 'g'), 6))
    || '-'
    -- product code: strip spaces/special chars, take first 4 chars
    || upper(left(regexp_replace(p_product_name, '[^A-Za-z0-9]', '', 'g'), 4))
    || '-U'
    || p_unit_index::TEXT
    || '-'
    -- 7-char random suffix (uppercase hex from 4 random bytes)
    || upper(left(encode(gen_random_bytes(4), 'hex'), 7));
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  2.  generate_product_unit_qrs
--
--  Accepts the order ID, admin ID, and the order's line items as JSONB,
--  then inserts one product_units row per physical unit.
--
--  Parameters
--  ──────────
--  p_order_id     TEXT   — mock order ID, e.g. "ORD-011"
--  p_generated_by TEXT   — admin mock user ID, e.g. "USR-001"
--  p_items        JSONB  — array of line-item objects:
--    [{
--      "name":       "Vitamin C Serum",   -- product display name
--      "product_id": "PROD-003",          -- product mock ID (optional, defaults to "PROD-{i}")
--      "qty":        2                    -- units purchased for this line
--    }, ...]
--
--  Behaviour
--  ─────────
--  • Idempotent: if product_units already exist for p_order_id, the function
--    returns the existing rows without inserting anything new.
--  • Token collision retry: if a generated token already exists (extremely
--    unlikely), the function retries up to 5 times before raising an error.
--  • Returns every row that belongs to this order after the call.
--
--  Example call
--  ────────────
--  SELECT * FROM generate_product_unit_qrs(
--    'ORD-011',
--    'USR-001',
--    '[
--      {"name": "Moisturizing Cream", "product_id": "PROD-001", "qty": 1},
--      {"name": "Vitamin C Serum",    "product_id": "PROD-003", "qty": 2}
--    ]'::jsonb
--  );
--  -- Returns 3 rows: 1 for Moisturizer (U1), 2 for Serum (U1, U2)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_product_unit_qrs(
  p_order_id     TEXT,
  p_generated_by TEXT,
  p_items        JSONB
)
RETURNS SETOF product_units
LANGUAGE plpgsql
AS $$
DECLARE
  v_item         JSONB;
  v_item_index   INT;
  v_unit_index   INT;
  v_qty          INT;
  v_product_id   TEXT;
  v_product_name TEXT;
  v_order_item_id TEXT;
  v_token        TEXT;
  v_retry        INT;
  v_new_row      product_units;
BEGIN

  -- ── Idempotency guard ────────────────────────────────────────────────────
  -- If QR units already exist for this order, return them as-is.
  IF EXISTS (SELECT 1 FROM product_units WHERE order_id = p_order_id) THEN
    RETURN QUERY
      SELECT * FROM product_units
      WHERE  order_id = p_order_id
      ORDER  BY order_item_id, created_at;
    RETURN;
  END IF;

  -- ── Insert one row per physical unit ────────────────────────────────────
  v_item_index := 0;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_item_index   := v_item_index + 1;
    v_qty          := COALESCE((v_item->>'qty')::INT, 1);
    v_product_name := COALESCE(v_item->>'name', 'Product ' || v_item_index);
    v_product_id   := COALESCE(
                        v_item->>'product_id',
                        'PROD-' || lpad(v_item_index::TEXT, 3, '0')
                      );
    -- Derive order_item_id from order + line position (items have no own ID)
    v_order_item_id := p_order_id || '-ITEM' || lpad(v_item_index::TEXT, 2, '0');

    FOR v_unit_index IN 1..v_qty
    LOOP
      -- Token collision retry loop (up to 5 attempts; collision is ~negligible)
      v_retry := 0;
      LOOP
        v_token := fn_build_qr_token(p_order_id, v_product_name, v_unit_index);

        BEGIN
          INSERT INTO product_units (
            order_id,
            order_item_id,
            product_id,
            qr_token,
            qr_status,
            generated_at,
            generated_by,
            is_returned,
            verification_count
          )
          VALUES (
            p_order_id,
            v_order_item_id,
            v_product_id,
            v_token,
            'active',
            NOW(),
            p_generated_by,
            false,
            0
          )
          RETURNING * INTO v_new_row;

          RETURN NEXT v_new_row;
          EXIT; -- token was unique; move on

        EXCEPTION WHEN unique_violation THEN
          v_retry := v_retry + 1;
          IF v_retry >= 5 THEN
            RAISE EXCEPTION
              'generate_product_unit_qrs: could not generate unique qr_token '
              'for order % item % unit % after 5 attempts',
              p_order_id, v_item_index, v_unit_index;
          END IF;
          -- else loop and regenerate
        END;
      END LOOP; -- retry
    END LOOP; -- unit_index
  END LOOP; -- items

  RETURN;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  3.  v_order_qr_status
--
--  Per-order summary used by the admin "Pesanan" view to show how many
--  QR codes have been generated vs. still pending.
--
--  Columns
--  ───────
--  order_id          TEXT
--  total_units       INT   — total product_units rows for this order
--  generated_count   INT   — rows where qr_status != 'pending' (should = total)
--  active_count      INT   — rows with qr_status = 'active'
--  shipped_count     INT   — rows with qr_status = 'shipped'
--  returned_count    INT   — rows with qr_status = 'returned'
--  invalid_count     INT   — rows with qr_status = 'invalid'
--  all_generated     BOOL  — true when every unit has a token (safe to ship)
--  first_generated_at TIMESTAMPTZ
--  last_generated_at  TIMESTAMPTZ
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_order_qr_status AS
SELECT
  order_id,
  COUNT(*)                                              AS total_units,
  COUNT(*) FILTER (WHERE qr_token IS NOT NULL)          AS generated_count,
  COUNT(*) FILTER (WHERE qr_status = 'active')          AS active_count,
  COUNT(*) FILTER (WHERE qr_status = 'shipped')         AS shipped_count,
  COUNT(*) FILTER (WHERE qr_status = 'returned')        AS returned_count,
  COUNT(*) FILTER (WHERE qr_status = 'invalid')         AS invalid_count,
  BOOL_AND(qr_token IS NOT NULL)                        AS all_generated,
  MIN(generated_at)                                     AS first_generated_at,
  MAX(generated_at)                                     AS last_generated_at
FROM  product_units
GROUP BY order_id;


-- ─────────────────────────────────────────────────────────────────────────────
--  Quick smoke-test (runs in a transaction that is rolled back immediately,
--  so no real data is written).  Remove the ROLLBACK to persist the test rows.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

  -- Scenario: customer buys 1 × Moisturizing Cream + 2 × Vitamin C Serum
  SELECT
    pu.order_item_id,
    pu.product_id,
    pu.qr_token,
    pu.qr_status,
    pu.generated_at,
    pu.generated_by
  FROM generate_product_unit_qrs(
    'ORD-011',
    'USR-001',
    '[
      {"name": "Moisturizing Cream",  "product_id": "PROD-001", "qty": 1},
      {"name": "Vitamin C Serum",     "product_id": "PROD-003", "qty": 2}
    ]'::jsonb
  ) AS pu;

  -- Expected: 3 rows
  --   ORD-011-ITEM01 | PROD-001 | UNIT-ORD011-MOIS-U1-...  | active
  --   ORD-011-ITEM02 | PROD-003 | UNIT-ORD011-VITA-U1-...  | active
  --   ORD-011-ITEM02 | PROD-003 | UNIT-ORD011-VITA-U2-...  | active

ROLLBACK;
