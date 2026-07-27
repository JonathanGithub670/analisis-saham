// ============================================================
// StockPulse — API Service
// ============================================================

// In dev: relative URL → Next.js rewrites proxy to backend (no CORS issues)
// In prod: NEXT_PUBLIC_API_URL points to absolute backend URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(endpoint: string, auth = false): Promise<T> {
  const headers: Record<string, string> = auth ? getAuthHeaders() : {};
  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: "no-store",
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

async function postApi<T>(endpoint: string, body: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth ? getAuthHeaders() : {}),
  };
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

async function deleteApi<T>(endpoint: string, auth = false): Promise<T> {
  const headers: Record<string, string> = auth ? getAuthHeaders() : {};
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

import type {
  StockSearchResult,
  StockQuote,
  OhlcvData,
  IndicatorResult,
  SignalResult,
  AiPrediction,
  SentimentResult,
  Notification,
  WatchlistItem,
  LoginRequest,
  RegisterRequest,
  AuthUser,
  TokenResponse,
  UserApiKey,
  SaveApiKeyRequest,
  VerifyApiKeyResponse,
} from "@/types";

export const api = {
  // Auth
  register: (data: RegisterRequest) =>
    postApi<{ message: string; user: AuthUser }>("/api/auth/register", data),

  login: (data: LoginRequest) =>
    postApi<{ message: string; data: TokenResponse }>("/api/auth/login", data),

  refreshToken: (refresh_token: string) =>
    postApi<{ message: string; data: TokenResponse }>("/api/auth/refresh", { refresh_token }),

  logout: (refresh_token: string) =>
    postApi<{ message: string }>("/api/auth/logout", { refresh_token }),

  getMe: () =>
    fetchApi<{ user: AuthUser }>("/api/auth/me", true),

  // Stock
  searchStocks: (q: string) =>
    fetchApi<StockSearchResult[]>(`/api/stocks/search?q=${encodeURIComponent(q)}`),

  getStock: (symbol: string) =>
    fetchApi<StockQuote>(`/api/stocks/${symbol}`),

  getHistory: (symbol: string, interval: string = "1d") =>
    fetchApi<OhlcvData[]>(`/api/stocks/${symbol}/history?interval=${interval}`),

  // Indicators
  getIndicators: (symbol: string) =>
    fetchApi<IndicatorResult>(`/api/stocks/${symbol}/indicators`),

  // Signals
  getSignal: (symbol: string) =>
    fetchApi<SignalResult>(`/api/stocks/${symbol}/signal`),

  // AI
  getAiPrediction: (symbol: string) =>
    fetchApi<AiPrediction>(`/api/stocks/${symbol}/ai`),

  getSentiment: (symbol: string) =>
    fetchApi<SentimentResult>(`/api/stocks/${symbol}/sentiment`),

  // Notifications
  getNotifications: (limit: number = 50) =>
    fetchApi<Notification[]>(`/api/notifications?limit=${limit}`, true),

  createPriceAlert: (symbol: string, targetPrice: number, direction: string) =>
    postApi<Notification>("/api/notifications/alerts", {
      symbol,
      target_price: targetPrice,
      direction,
    }, true),

  // Watchlist
  getWatchlist: () => fetchApi<WatchlistItem[]>("/api/watchlist", true),

  addToWatchlist: (symbol: string, name?: string) =>
    postApi("/api/watchlist", { symbol, name }, true),

  removeFromWatchlist: (symbol: string) =>
    deleteApi(`/api/watchlist/${symbol}`, true),

  // API Keys (user AI provider keys)
  listApiKeys: () =>
    fetchApi<{ data: UserApiKey[] }>("/api/auth/api-keys", true),

  saveApiKey: (data: SaveApiKeyRequest) =>
    postApi<{ message: string; data: UserApiKey }>("/api/auth/api-keys", data, true),

  verifyApiKey: (keyId: string) =>
    postApi<VerifyApiKeyResponse>("/api/auth/api-keys/verify", { id: keyId }, true),

  deleteApiKey: (keyId: string) =>
    deleteApi<{ message: string }>(`/api/auth/api-keys/${keyId}`, true),
};
