import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

const client = axios.create({ baseURL: BASE, timeout: 180000 });

client.interceptors.response.use(
  res => res,
  err => {
    const detail = err.response?.data?.detail || err.message || "Unknown error";
    return Promise.reject({ code: err.response?.status, message: detail });
  }
);

export default client;
