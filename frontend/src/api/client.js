import axios from "axios";

const isElectron = typeof window !== "undefined" && (window.location.protocol === "file:" || Boolean(window.electronAPI));

const BASE = isElectron
  ? (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000") + "/api"
  : import.meta.env.PROD 
    ? "/api"
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000") + "/api";

const client = axios.create({ baseURL: BASE, timeout: 180000 });
client.interceptors.response.use(
  res => res,
  err => {
    const detail = err.response?.data?.detail || err.message || "Unknown error";
    return Promise.reject({ code: err.response?.status, message: detail });
  }
);
export default client;
