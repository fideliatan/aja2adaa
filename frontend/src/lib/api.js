import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  withCredentials: true,
});

export const storeApi = {
  init: () => api.get("/api/store/init/"),
  sync: (payload) => api.post("/api/store/sync/", payload),
};

export default api;
