import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL as string;

export const api = axios.create({
  baseURL: API_URL,
});

let accessToken: string | null = localStorage.getItem("accessToken");
let refreshToken: string | null = localStorage.getItem("refreshToken");

export function setTokens(nextAccess: string | null, nextRefresh?: string | null) {
  accessToken = nextAccess;
  if (nextAccess) localStorage.setItem("accessToken", nextAccess);
  else localStorage.removeItem("accessToken");

  if (typeof nextRefresh !== "undefined") {
    refreshToken = nextRefresh;
    if (nextRefresh) localStorage.setItem("refreshToken", nextRefresh);
    else localStorage.removeItem("refreshToken");
  }
}

export function getRefreshToken() {
  return refreshToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
