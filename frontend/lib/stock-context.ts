// ============================================================
// Stock context builder (SERVER-ONLY).
// Gathers the COMPLETE dataset for a stock — quote, fundamentals, 1y
// history → technical indicators, and fair value — then formats it all
// into a compact "promptText" so the AI (Ollama) can analyze with full data.
//
// Reuses the existing Yahoo-backed routes via internal HTTP fetch (no logic
// duplication). `origin` is the absolute origin of the running Next.js
// server, passed from each route handler. Results cached 5 min per symbol.
// ============================================================

import type { IdxStockQuote, IdxHistoryItem } from "@/services/idxApi";
import {
  calculateIndicators,
  type OhlcvPoint,
  type TechnicalIndicators,
} from "@/lib/indicators";
import { calculateFairValue, type FairValueResult } from "@/lib/fairvalue";

export interface StockContext {
  symbol: string;
  code: string;
  quote: IdxStockQuote | null;
  history: IdxHistoryItem[];
  ohlcv: OhlcvPoint[];
  indicators: TechnicalIndicators | null;
  fairValue: FairValueResult | null;
  promptText: string;
}

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/** Normalize an IDX code (BBCA) or symbol (BBCA.JK) to a Yahoo symbol. */
export function normalizeSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  return s.includes(".") ? s : `${s}.JK`;
}

function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "n/a";
  return v.toFixed(digits);
}
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "n/a";
  return `${(v * 100).toFixed(2)}%`;
}
function fmtBig(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "n/a";
  if (v >= 1e12) return `Rp ${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(2)}M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(2)}Jt`;
  return `Rp ${v.toFixed(0)}`;
}
function fmtVol(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "n/a";
  return v.toLocaleString("id-ID");
}

async function fetchQuote(origin: string, yahooSymbol: string): Promise<IdxStockQuote | null> {
  try {
    const res = await fetch(
      `${origin}/api/idx/stock?symbol=${encodeURIComponent(yahooSymbol)}`,
      { headers: { "User-Agent": YAHOO_UA } }
    );
    if (!res.ok) return null;
    return (await res.json()) as IdxStockQuote;
  } catch {
    return null;
  }
}

async function fetchHistory(
  origin: string,
  yahooSymbol: string
): Promise<IdxHistoryItem[]> {
  try {
    const res = await fetch(
      `${origin}/api/idx/history?symbol=${encodeURIComponent(yahooSymbol)}&range=1y&interval=1d`,
      { headers: { "User-Agent": YAHOO_UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.history ?? []) as IdxHistoryItem[];
  } catch {
    return [];
  }
}

/**
 * Format the dataset into a COMPACT prompt block. Kept terse (key:value) on
 * purpose: local CPU inference is slow at prompt-eval (~2.7 tok/s), so a
 * verbose prompt adds hundreds of seconds. ~300 tokens, all signal, no prose.
 */
function buildPromptText(
  yahooSymbol: string,
  quote: IdxStockQuote | null,
  indicators: TechnicalIndicators | null,
  fairValue: FairValueResult | null
): string {
  const parts: string[] = [];
  const s = (k: string, v: unknown) => parts.push(`${k}: ${v}`);

  s("SAHAM", `${yahooSymbol.replace(".JK", "")} (${yahooSymbol}) — ${quote ? quote.name : "?"} — ${quote?.sector || "?"}/${quote?.industry || "?"} — IDX/IDR`);

  if (quote) {
    s(
      "HARGA",
      `${fmtNum(quote.price, 0)} (${quote.change >= 0 ? "+" : ""}${fmtNum(quote.changePercent)}%) | O${fmtNum(quote.open, 0)} H${fmtNum(quote.high, 0)} L${fmtNum(quote.low, 0)} | PC${fmtNum(quote.previousClose, 0)}`
    );
    s(
      "VOL",
      `${fmtVol(quote.volume)} (avg ${fmtVol(quote.averageVolume)}, ${indicators?.volumeTrend || "n/a"}) | 52w ${fmtNum(quote.fiftyTwoWeekLow, 0)}-${fmtNum(quote.fiftyTwoWeekHigh, 0)} | beta ${fmtNum(quote.beta)}`
    );
    s("MCAP", quote.marketCapFmt || fmtBig(quote.marketCap));
    s(
      "VALUASI",
      `PE ${fmtNum(quote.trailingPE)} | fwdPE ${fmtNum(quote.forwardPE)} | PB ${fmtNum(quote.priceToBook)} | EPS ${fmtNum(quote.epsTrailingTwelveMonths, 0)} | BVPS ${fmtNum(quote.bookValue, 0)} | divY ${quote.dividendYieldFmt || fmtPct(quote.dividendYield)} | tgtAnalis ${fmtNum(quote.targetMeanPrice, 0)} | konsYahoo ${quote.recommendationKey || "n/a"}`
    );
    s(
      "FUNDAMENTAL",
      `rev ${quote.totalRevenueFmt || fmtBig(quote.totalRevenue)} | revGrowth ${fmtPct(quote.revenueGrowth)} | grossM ${fmtPct(quote.grossMargins)} | operM ${fmtPct(quote.operatingMargins)} | profitM ${fmtPct(quote.profitMargins)} | ROE ${fmtPct(quote.returnOnEquity)} | D/E ${fmtNum(quote.debtToEquity)} | CR ${fmtNum(quote.currentRatio)}`
    );
  } else {
    s("FUNDAMENTAL", "data quote/fundamental tidak tersedia — analisis hanya dari data teknikal");
  }

  if (indicators) {
    const gc =
      indicators.sma20 !== null && indicators.sma50 !== null
        ? indicators.sma20 > indicators.sma50
          ? "GoldenCross"
          : "DeathCross"
        : "n/a";
    const macdH = indicators.macd
      ? `${fmtNum(indicators.macd.histogram)}(${indicators.macd.histogram > 0 ? "bull" : indicators.macd.histogram < 0 ? "bear" : "neut"})`
      : "n/a";
    s(
      "TEKNIKAL",
      `RSI ${fmtNum(indicators.rsi14, 1)} | MACDhist ${macdH} | SMA20/50/200 ${fmtNum(indicators.sma20, 0)}/${fmtNum(indicators.sma50, 0)}/${fmtNum(indicators.sma200, 0)} (${gc}) | StochK ${indicators.stochastic ? fmtNum(indicators.stochastic.k, 0) : "n/a"} | ATR ${fmtNum(indicators.atr14, 0)} | chg5d ${fmtNum(indicators.priceChange5d)}% chg20d ${fmtNum(indicators.priceChange20d)}% | sup ${fmtNum(indicators.supportLevel, 0)} res ${fmtNum(indicators.resistanceLevel, 0)}`
    );
  }

  if (fairValue) {
    const methods = fairValue.methods.map((m) => `${m.name}:${fmtNum(m.value, 0)}`).join(" ");
    s(
      "FAIRVALUE",
      `konsensus ${fmtNum(fairValue.consensus, 0)} (range ${fmtNum(fairValue.lowRange, 0)}-${fmtNum(fairValue.highRange, 0)}) | upside ${fmtNum(fairValue.upsidePercent)}% → ${fairValue.verdict} | ${methods}`
    );
  }

  if (quote?.longBusinessSummary) {
    s(
      "BISNIS",
      quote.longBusinessSummary.slice(0, 280).replace(/\s+/g, " ").trim() +
        (quote.longBusinessSummary.length > 280 ? "…" : "")
    );
  }
  const officers = (quote?.companyOfficers || [])
    .slice(0, 3)
    .map((o) => `${o.name || "?"}(${o.title || "?"})`)
    .join("; ");
  if (officers) s("DIREKSI", officers);

  return parts.join("\n");
}

/**
 * Build the complete stock context. Results cached per symbol (5 min TTL) so
 * multiple per-section calls don't re-fetch Yahoo repeatedly.
 */
const CONTEXT_TTL_MS = 5 * 60 * 1000;
const ctxCache = new Map<string, { ctx: StockContext; ts: number }>();

export async function buildStockContext(
  rawSymbol: string,
  origin: string
): Promise<StockContext> {
  const yahooSymbol = normalizeSymbol(rawSymbol);
  const cached = ctxCache.get(yahooSymbol);
  if (cached && Date.now() - cached.ts < CONTEXT_TTL_MS) return cached.ctx;
  const code = yahooSymbol.replace(".JK", "");

  const [quote, history] = await Promise.all([
    fetchQuote(origin, yahooSymbol),
    fetchHistory(origin, yahooSymbol),
  ]);

  const ohlcv: OhlcvPoint[] = history
    .filter((h) => h.close !== null && h.close > 0)
    .map((h) => ({
      date: h.date,
      open: h.open ?? 0,
      high: h.high ?? 0,
      low: h.low ?? 0,
      close: h.close ?? 0,
      volume: h.volume ?? 0,
    }));

  const indicators = ohlcv.length >= 30 ? calculateIndicators(ohlcv) : null;

  const currentPrice =
    quote?.price ?? (ohlcv.length ? ohlcv[ohlcv.length - 1].close : 0);
  const fairValue =
    quote && currentPrice > 0 ? calculateFairValue(currentPrice, quote) : null;

  const promptText = buildPromptText(yahooSymbol, quote, indicators, fairValue);

  const ctx: StockContext = {
    symbol: yahooSymbol,
    code,
    quote,
    history,
    ohlcv,
    indicators,
    fairValue,
    promptText,
  };
  ctxCache.set(yahooSymbol, { ctx, ts: Date.now() });
  return ctx;
}
