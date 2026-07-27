// ============================================================
// IDX (Indonesia Stock Exchange) — API Service via Yahoo Finance
// ============================================================

export interface IdxSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  exchDisp: string;
  type: string;
  isIDX: boolean;
}

export interface IdxStockQuote {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  marketState: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number | null;
  marketCapFmt: string | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  averageVolume: number | null;
  dividendYield: number | null;
  dividendYieldFmt: string | null;
  trailingPE: number | null;
  forwardPE: number | null;
  epsTrailingTwelveMonths: number | null;
  beta: number | null;
  priceToBook: number | null;
  enterpriseValue: number | null;
  enterpriseValueFmt: string | null;
  earningsQuarterlyGrowth: number | null;
  bookValue: number | null;
  totalRevenue: number | null;
  totalRevenueFmt: string | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  targetMeanPrice: number | null;
  recommendationKey: string | null;
  sector: string | null;
  industry: string | null;
  fullTimeEmployees: number | null;
  website: string | null;
  longBusinessSummary: string | null;
  address1: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  companyOfficers: IdxCompanyOfficer[];
}

export interface IdxCompanyOfficer {
  name: string | null;
  title: string | null;
  age: number | null;
  yearBorn: number | null;
  totalPay: number | null;
}

export interface IdxHistoryItem {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number | null;
}

export interface IdxHistoryResponse {
  symbol: string;
  currency: string;
  exchangeName: string;
  regularMarketPrice: number;
  previousClose: number;
  history: IdxHistoryItem[];
}

export interface IdxPopularStock {
  symbol: string;
  name: string;
  sector: string;
  code: string;
}

export interface IdxMarketIndex {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface IdxTopMover {
  code: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  previous: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  frequency: number;
}

export interface IdxAISignal {
  indicator: string;
  signal: "bullish" | "bearish" | "neutral";
  detail: string;
  weight: number;
}

export interface IdxAIRecommendation {
  symbol: string;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  score: number;
  summary: string;
  signals: IdxAISignal[];
  indicators: {
    rsi14: number | null;
    macd: { value: number; signal: number; histogram: number } | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
    bollingerBands: { upper: number; middle: number; lower: number } | null;
    atr14: number | null;
    stochastic: { k: number; d: number } | null;
    volumeAvg20: number | null;
    volumeTrend: string;
    priceChange5d: number | null;
    priceChange20d: number | null;
    supportLevel: number | null;
    resistanceLevel: number | null;
  };
  priceTarget: {
    support: number | null;
    resistance: number | null;
    targetPrice: number | null;
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  timeHorizon: string;
}

// AI-generated narrative for each analysis section, produced by Ollama from the
// complete stock dataset. Empty strings + `_error` indicate Ollama unavailable.
export interface IdxAIInsights {
  summary: string;
  fundamental: string;
  fairValue: string;
  recommendation: string;
  profile: string;
  _error?: string;
  _model?: string;
}

export const idxApi = {
  search: async (q: string): Promise<IdxSearchResult[]> => {
    const res = await fetch(`/api/idx/search?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  getStock: async (symbol: string): Promise<IdxStockQuote> => {
    const res = await fetch(`/api/idx/stock?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Failed to fetch stock");
    return res.json();
  },

  getHistory: async (
    symbol: string,
    range = "6mo",
    interval = "1d"
  ): Promise<IdxHistoryResponse> => {
    const res = await fetch(
      `/api/idx/history?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`
    );
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },

  getPopularStocks: async (): Promise<IdxPopularStock[]> => {
    const res = await fetch("/api/idx/summary?action=popular");
    return res.json();
  },

  getMarketIndices: async (): Promise<IdxMarketIndex[]> => {
    const res = await fetch("/api/idx/summary?action=market");
    return res.json();
  },

  getTopGainers: async (): Promise<IdxTopMover[]> => {
    const res = await fetch("/api/idx/scrape?action=top-gainers");
    if (!res.ok) return [];
    return res.json();
  },

  getTopLosers: async (): Promise<IdxTopMover[]> => {
    const res = await fetch("/api/idx/scrape?action=top-losers");
    if (!res.ok) return [];
    return res.json();
  },

  getMostActive: async (): Promise<IdxTopMover[]> => {
    const res = await fetch("/api/idx/scrape?action=most-active");
    if (!res.ok) return [];
    return res.json();
  },

  getAIAnalysis: async (symbol: string): Promise<IdxAIRecommendation> => {
    const res = await fetch(`/api/idx/ai-analysis?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error("Failed to get AI analysis");
    return res.json();
  },
};
