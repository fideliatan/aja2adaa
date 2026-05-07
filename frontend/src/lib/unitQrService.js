// ─── Status enums ─────────────────────────────────────────────────────────────

export const QR_STATUS = /** @type {const} */ ({
  PENDING:  "pending",   // slot created, token not yet generated
  ACTIVE:   "active",    // token generated, QR is valid
  RETURNED: "returned",  // QR scanned for a completed return
  INVALID:  "invalid",   // manually invalidated / suspected fraud
});

export const RETURN_STATUS = /** @type {const} */ ({
  NONE:     null,        // no return request against this unit
  PENDING:  "pending",   // return requested, awaiting review
  APPROVED: "approved",  // return approved
  REJECTED: "rejected",  // return rejected
});

// ─── Factories ────────────────────────────────────────────────────────────────

/**
 * Create a single return-history entry (one scan / verification event).
 * @param {{ actorId: string, actorRole?: string, action?: string, note?: string }} fields
 */
export function createReturnHistoryEntry({
  actorId,
  actorRole = "admin",
  action    = "verify",
  note      = null,
} = {}) {
  return {
    id:         `VRF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    timestamp:  new Date().toISOString(),
    actorId,
    actorRole,
    action,    // "verify" | "return_request" | "return_approve" | "return_reject" | "invalidate"
    note,
  };
}

/**
 * Create a canonical unit-QR record.
 *
 * Required fields:
 *   orderId, productId, productName, unitIndex
 *
 * Optional fields (supply when already known):
 *   qrToken, generatedAt, generatedBy, qrStatus, returnStatus,
 *   verificationCount, returnHistory, isReturned, itemIndex
 */
export function createUnitQrRecord({
  // identity
  orderId,
  productId,
  productName,
  unitIndex,
  itemIndex = 0,

  // token
  qrToken       = null,
  qrImageUrl    = null,         // base64 data-URL set after backend generation
  generatedAt   = null,
  generatedBy   = null,         // userId of admin who generated it

  // status
  qrStatus      = QR_STATUS.PENDING,
  returnStatus  = RETURN_STATUS.NONE,

  // tracking
  verificationCount = 0,
  returnHistory     = [],       // ReturnHistoryEntry[]
  isReturned        = false,
} = {}) {
  if (!orderId)      throw new Error("unitQrService: orderId is required");
  if (!productId)    throw new Error("unitQrService: productId is required");
  if (!productName)  throw new Error("unitQrService: productName is required");
  if (unitIndex == null) throw new Error("unitQrService: unitIndex is required");

  const orderCode = orderId.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-6);
  const itemCode  = String(itemIndex).padStart(2, "0");

  return {
    // stable identity
    unitId:   `${orderId}-ITEM${itemCode}-U${unitIndex}`,
    orderId,
    productId,
    productName,
    unitIndex,
    itemIndex,

    // QR payload
    qrToken,
    qrImageUrl,   // base64 data-URL from backend ("data:image/png;base64,…")
    generatedAt,
    generatedBy,

    // status
    qrStatus,
    returnStatus,

    // tracking
    verificationCount,
    returnHistory: returnHistory.map(e => ({ ...e })),
    isReturned,

    // derived (read-only helper)
    get isGenerated() { return this.qrToken !== null && this.qrStatus !== QR_STATUS.PENDING; },
    get isUsable()    { return this.qrStatus === QR_STATUS.ACTIVE && !this.isReturned; },
  };
}

// ─── State-transition helpers ─────────────────────────────────────────────────

/**
 * Attach a generated token to a pending record.
 * Returns a new record (immutable update).
 */
export function activateQr(record, { qrToken, qrImageUrl = null, generatedBy, generatedAt }) {
  if (!qrToken) throw new Error("activateQr: qrToken is required");
  return {
    ...record,
    qrToken,
    qrImageUrl,
    generatedAt: generatedAt ?? new Date().toISOString(),
    generatedBy: generatedBy ?? null,
    qrStatus:   QR_STATUS.ACTIVE,
  };
}

/**
 * Record a verification scan (does NOT change qrStatus).
 * Returns a new record.
 */
export function recordVerification(record, { actorId, actorRole, note } = {}) {
  const entry = createReturnHistoryEntry({ actorId, actorRole, action: "verify", note });
  return {
    ...record,
    verificationCount: record.verificationCount + 1,
    returnHistory:     [...record.returnHistory, entry],
  };
}

/**
 * Mark the QR as returned (status → "returned", isReturned → true).
 * Returns a new record.
 */
export function markReturned(record, { actorId, actorRole, note } = {}) {
  const entry = createReturnHistoryEntry({ actorId, actorRole, action: "return_approve", note });
  return {
    ...record,
    qrStatus:     QR_STATUS.RETURNED,
    returnStatus: RETURN_STATUS.APPROVED,
    isReturned:   true,
    returnHistory: [...record.returnHistory, entry],
  };
}

/**
 * Invalidate a QR (suspected fraud / admin action).
 * Returns a new record.
 */
export function invalidateQr(record, { actorId, actorRole, note } = {}) {
  const entry = createReturnHistoryEntry({ actorId, actorRole, action: "invalidate", note });
  return {
    ...record,
    qrStatus:     QR_STATUS.INVALID,
    returnHistory: [...record.returnHistory, entry],
  };
}

/**
 * Open a return request against this unit.
 * Returns a new record.
 */
export function requestReturn(record, { actorId, actorRole, note } = {}) {
  const entry = createReturnHistoryEntry({ actorId, actorRole, action: "return_request", note });
  return {
    ...record,
    returnStatus:  RETURN_STATUS.PENDING,
    returnHistory: [...record.returnHistory, entry],
  };
}

/**
 * Reject a pending return request.
 * Returns a new record.
 */
export function rejectReturn(record, { actorId, actorRole, note } = {}) {
  const entry = createReturnHistoryEntry({ actorId, actorRole, action: "return_reject", note });
  return {
    ...record,
    returnStatus:  RETURN_STATUS.REJECTED,
    returnHistory: [...record.returnHistory, entry],
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** True when the QR can be scanned for a valid return. */
export function isQrUsable(record) {
  return record.qrStatus === QR_STATUS.ACTIVE && !record.isReturned;
}

/**
 * Build the initial slot list for an order's items.
 * Pass `order.items` (each with `{ id, name, qty }`).
 */
export function buildOrderQrSlots(order) {
  const slots = [];
  (order.items ?? []).forEach((item, itemIdx) => {
    const qty = item.qty ?? 1;
    for (let u = 1; u <= qty; u++) {
      slots.push(
        createUnitQrRecord({
          orderId:     order.id,
          productId:   item.id   ?? `PROD-${itemIdx}`,
          productName: item.name ?? `Produk ${itemIdx + 1}`,
          unitIndex:   u,
          itemIndex:   itemIdx,
        })
      );
    }
  });
  return slots;
}
