// ============================================================
// StockPulse — Type Definitions
// ============================================================

export interface StockSearchResult {
  symbol: string;
  name: string;
  type?: string;
  region?: string;
  currency?: string;
  match_score?: string;
}

export interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  latest_trading_day?: string;
}

export interface OhlcvData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MacdResult {
  macd_line: number;
  signal_line: number;
  histogram: number;
}

export interface IndicatorResult {
  symbol: string;
  rsi?: number;
  macd?: MacdResult;
  ma20?: number;
  ma50?: number;
  volume_avg?: number;
  volume_trend?: string;
}

export interface SignalReason {
  indicator: string;
  signal: string;
  description: string;
}

export interface SignalResult {
  symbol: string;
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasons: SignalReason[];
}

export interface AiPrediction {
  symbol: string;
  prediction: "bullish" | "bearish";
  probability: number;
  features_used: string[];
}

export interface SentimentHeadline {
  title: string;
  sentiment: string;
  score: number;
  source?: string;
  url?: string;
}

export interface SentimentResult {
  symbol: string;
  overall_sentiment: string;
  compound_score: number;
  positive_ratio: number;
  negative_ratio: number;
  neutral_ratio: number;
  articles_analyzed: number;
  headlines: SentimentHeadline[];
}

export interface Notification {
  id: number;
  symbol: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  added_at?: string;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// API Key management types — platform is auto-detected from the key
export interface UserApiKey {
  id: string;
  provider: string;
  is_valid: boolean;
  /** Optional model override for chat (e.g. "glm-5.2"). */
  model?: string | null;
  verified_at: string | null;
  created_at: string;
  /** Why verification succeeded/failed (only present on save/verify responses). */
  verify_detail?: string;
}

export interface SaveApiKeyRequest {
  api_key: string;
  /** Optional model override for chat (e.g. "glm-5.2"). */
  model?: string;
}

export interface VerifyApiKeyResponse {
  provider: string;
  is_valid: boolean;
  verified_at: string | null;
  detail?: string;
}
