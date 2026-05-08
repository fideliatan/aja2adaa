import api from "./api.js";

export async function getAddresses(userId) {
  const { data } = await api.get("/api/store/addresses/", { params: { userId } });
  return data.addresses ?? [];
}

export async function addAddress(userId, fields) {
  const { data } = await api.post("/api/store/addresses/", {
    userId,
    label:         fields.label,
    receiver_name: fields.receiver_name,
    phone:         fields.phone,
    address:       fields.address,
  });
  return data.address;
}

export async function updateAddress(userId, id, fields) {
  const patch = { userId };
  if (fields.label   != null) patch.label         = fields.label;
  if (fields.name    != null) patch.receiver_name  = fields.name;
  if (fields.phone   != null) patch.phone          = fields.phone;
  if (fields.address != null) patch.address        = fields.address;

  const { data } = await api.patch(`/api/store/addresses/${id}/`, patch);
  return data.address;
}

export async function deleteAddress(userId, id) {
  await api.delete(`/api/store/addresses/${id}/`, { params: { userId } });
}

export async function setPrimaryAddress(userId, id) {
  const { data } = await api.patch(`/api/store/addresses/${id}/set-primary/`, { userId });
  return data.address;
}
