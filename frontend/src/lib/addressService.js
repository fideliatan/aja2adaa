import { supabase } from "./supabase";

// ─── helpers ──────────────────────────────────────────────────────────────────

function requireClient() {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env");
  return supabase;
}

function requireUser(userId) {
  if (!userId) throw new Error("Kamu harus login untuk mengelola alamat.");
}

// DB row  →  shape used by the UI
function normalize(row) {
  return {
    id:         row.id,
    label:      row.label,
    name:       row.receiver_name,
    phone:      row.phone,
    address:    row.address,
    isMain:     row.is_primary,
    created_at: row.created_at,
  };
}

// ─── READ ──────────────────────────────────────────────────────────────────────

export async function getAddresses(userId) {
  const db = requireClient();
  requireUser(userId);

  const { data, error } = await db
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(normalize);
}

// ─── CREATE ────────────────────────────────────────────────────────────────────

export async function addAddress(userId, fields) {
  const db = requireClient();
  requireUser(userId);

  // First address for this user becomes primary automatically
  const { count } = await db
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await db
    .from("addresses")
    .insert({
      user_id:       userId,
      label:         fields.label,
      receiver_name: fields.receiver_name,
      phone:         fields.phone,
      address:       fields.address,
      is_primary:    count === 0,
    })
    .select()
    .single();

  if (error) throw error;
  return normalize(data);
}

// ─── UPDATE ────────────────────────────────────────────────────────────────────

export async function updateAddress(userId, id, fields) {
  const db = requireClient();
  requireUser(userId);

  // Map UI field names → DB column names
  const patch = {};
  if (fields.label   != null) patch.label         = fields.label;
  if (fields.name    != null) patch.receiver_name  = fields.name;
  if (fields.phone   != null) patch.phone          = fields.phone;
  if (fields.address != null) patch.address        = fields.address;

  const { data, error } = await db
    .from("addresses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return normalize(data);
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function deleteAddress(userId, id) {
  const db = requireClient();
  requireUser(userId);

  const { error } = await db
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  // If the deleted address was primary, promote the earliest remaining one
  const { data: remaining } = await db
    .from("addresses")
    .select("id, is_primary")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (remaining?.length && !remaining.some((r) => r.is_primary)) {
    await db
      .from("addresses")
      .update({ is_primary: true })
      .eq("id", remaining[0].id)
      .eq("user_id", userId);
  }
}

// ─── SET PRIMARY ───────────────────────────────────────────────────────────────

export async function setPrimaryAddress(userId, id) {
  const db = requireClient();
  requireUser(userId);

  // Clear all primaries for this user, then set the chosen one
  const { error: clearErr } = await db
    .from("addresses")
    .update({ is_primary: false })
    .eq("user_id", userId);

  if (clearErr) throw clearErr;

  const { data, error } = await db
    .from("addresses")
    .update({ is_primary: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return normalize(data);
}
