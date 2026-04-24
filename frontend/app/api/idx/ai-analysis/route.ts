import { NextRequest, NextResponse } from "next/server";

// AI-powered stock analysis for Indonesian stocks
// Calculates technical indicators from Yahoo Finance historical data
// and generates buy/sell/hold recommendations

interface OhlcvPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
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
}

interface AIRecommendation {
  symbol: string;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  score: number; // -100 to 100
  summary: string;
  signals: Array<{
    indicator: string;
    signal: "bullish" | "bearish" | "neutral";
    detail: string;
    weight: number;
  }>;
  indicators: TechnicalIndicators;
  priceTarget: {
    support: number | null;
    resistance: number | null;
    targetPrice: number | null;
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  timeHorizon: string;
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "";
  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    // Fetch 1 year of daily data for comprehensive analysis
    const yahooSymbol = symbol.endsWith(".JK") ? symbol : `${symbol}.JK`;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d&includePrePost=false`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) throw new Error(`Yahoo chart failed: ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0] || {};
    const meta = result.meta || {};

    const history: OhlcvPoint[] = timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        open: ohlcv.open?.[i] ?? 0,
        high: ohlcv.high?.[i] ?? 0,
        low: ohlcv.low?.[i] ?? 0,
        close: ohlcv.close?.[i] ?? 0,
        volume: ohlcv.volume?.[i] ?? 0,
      }))
      .filter((item: OhlcvPoint) => item.close > 0);

    if (history.length < 30) {
      return NextResponse.json(
        { error: "Insufficient data for analysis (need at least 30 days)" },
        { status: 400 }
      );
    }

    // Calculate technical indicators
    const indicators = calculateIndicators(history);

    // Generate AI recommendation
    const recommendation = generateRecommendation(
      yahooSymbol,
      meta.regularMarketPrice || history[history.length - 1].close,
      indicators,
      history
    );

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}

function calculateIndicators(history: OhlcvPoint[]): TechnicalIndicators {
  const closes = history.map((h) => h.close);
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);
  const volumes = history.map((h) => h.volume);

  // RSI (14 period)
  const rsi14 = calcRSI(closes, 14);

  // Moving Averages
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);

  // EMA
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  // MACD
  const macd = calcMACD(closes);

  // Bollinger Bands (20 period, 2 std dev)
  const bollingerBands = calcBollingerBands(closes, 20, 2);

  // ATR (14 period)
  const atr14 = calcATR(highs, lows, closes, 14);

  // Stochastic Oscillator (14, 3)
  const stochastic = calcStochastic(highs, lows, closes, 14, 3);

  // Volume average (20 days)
  const volumeAvg20 = calcSMA(volumes, 20);

  // Volume trend
  const recentVolAvg = calcSMA(volumes.slice(-5), 5);
  const prevVolAvg = calcSMA(volumes.slice(-20, -5), 15);
  let volumeTrend = "normal";
  if (recentVolAvg && prevVolAvg) {
    if (recentVolAvg > prevVolAvg * 1.5) volumeTrend = "high";
    else if (recentVolAvg < prevVolAvg * 0.6) volumeTrend = "low";
  }

  // Price changes
  const currentPrice = closes[closes.length - 1];
  const priceChange5d =
    closes.length >= 6
      ? ((currentPrice - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
      : null;
  const priceChange20d =
    closes.length >= 21
      ? ((currentPrice - closes[closes.length - 21]) / closes[closes.length - 21]) * 100
      : null;

  // Support and Resistance
  const recent = history.slice(-60);
  const recentLows = recent.map((h) => h.low).sort((a, b) => a - b);
  const recentHighs = recent.map((h) => h.high).sort((a, b) => b - a);
  const supportLevel = recentLows.length > 5 ? recentLows[Math.floor(recentLows.length * 0.1)] : null;
  const resistanceLevel = recentHighs.length > 5 ? recentHighs[Math.floor(recentHighs.length * 0.1)] : null;

  return {
    rsi14,
    macd,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    bollingerBands,
    atr14,
    stochastic,
    volumeAvg20,
    volumeTrend,
    priceChange5d,
    priceChange20d,
    supportLevel,
    resistanceLevel,
  };
}

function generateRecommendation(
  symbol: string,
  currentPrice: number,
  indicators: TechnicalIndicators,
  history: OhlcvPoint[]
): AIRecommendation {
  const signals: AIRecommendation["signals"] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // 1. RSI Analysis (weight: 15)
  if (indicators.rsi14 !== null) {
    const weight = 15;
    totalWeight += weight;
    if (indicators.rsi14 < 30) {
      signals.push({
        indicator: "RSI (14)",
        signal: "bullish",
        detail: `RSI di ${indicators.rsi14.toFixed(1)} — Oversold, potensi rebound naik`,
        weight,
      });
      totalScore += weight * (1 - indicators.rsi14 / 30);
    } else if (indicators.rsi14 > 70) {
      signals.push({
        indicator: "RSI (14)",
        signal: "bearish",
        detail: `RSI di ${indicators.rsi14.toFixed(1)} — Overbought, potensi koreksi turun`,
        weight,
      });
      totalScore -= weight * ((indicators.rsi14 - 70) / 30);
    } else if (indicators.rsi14 < 45) {
      signals.push({
        indicator: "RSI (14)",
        signal: "bullish",
        detail: `RSI di ${indicators.rsi14.toFixed(1)} — Mendekati area oversold`,
        weight,
      });
      totalScore += weight * 0.3;
    } else if (indicators.rsi14 > 55) {
      signals.push({
        indicator: "RSI (14)",
        signal: "bearish",
        detail: `RSI di ${indicators.rsi14.toFixed(1)} — Mendekati area overbought`,
        weight,
      });
      totalScore -= weight * 0.2;
    } else {
      signals.push({
        indicator: "RSI (14)",
        signal: "neutral",
        detail: `RSI di ${indicators.rsi14.toFixed(1)} — Area netral`,
        weight,
      });
    }
  }

  // 2. MACD Analysis (weight: 15)
  if (indicators.macd) {
    const weight = 15;
    totalWeight += weight;
    if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
      signals.push({
        indicator: "MACD",
        signal: "bullish",
        detail: `MACD histogram positif (${indicators.macd.histogram.toFixed(2)}) — Momentum bullish`,
        weight,
      });
      totalScore += weight * Math.min(1, Math.abs(indicators.macd.histogram) / 50);
    } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
      signals.push({
        indicator: "MACD",
        signal: "bearish",
        detail: `MACD histogram negatif (${indicators.macd.histogram.toFixed(2)}) — Momentum bearish`,
        weight,
      });
      totalScore -= weight * Math.min(1, Math.abs(indicators.macd.histogram) / 50);
    } else {
      signals.push({
        indicator: "MACD",
        signal: "neutral",
        detail: "MACD menunjukkan transisi — Perhatikan crossover",
        weight,
      });
    }
  }

  // 3. Moving Average Cross (weight: 20)
  if (indicators.sma20 !== null && indicators.sma50 !== null) {
    const weight = 20;
    totalWeight += weight;
    if (indicators.sma20 > indicators.sma50) {
      const spread = ((indicators.sma20 - indicators.sma50) / indicators.sma50) * 100;
      signals.push({
        indicator: "MA Cross (SMA20/50)",
        signal: "bullish",
        detail: `Golden Cross — SMA20 (${indicators.sma20.toFixed(0)}) > SMA50 (${indicators.sma50.toFixed(0)})`,
        weight,
      });
      totalScore += weight * Math.min(1, spread / 5);
    } else {
      const spread = ((indicators.sma50 - indicators.sma20) / indicators.sma50) * 100;
      signals.push({
        indicator: "MA Cross (SMA20/50)",
        signal: "bearish",
        detail: `Death Cross — SMA20 (${indicators.sma20.toFixed(0)}) < SMA50 (${indicators.sma50.toFixed(0)})`,
        weight,
      });
      totalScore -= weight * Math.min(1, spread / 5);
    }
  }

  // 4. Price vs SMA200 (Long-term trend, weight: 10)
  if (indicators.sma200 !== null) {
    const weight = 10;
    totalWeight += weight;
    if (currentPrice > indicators.sma200) {
      signals.push({
        indicator: "Tren Jangka Panjang (SMA200)",
        signal: "bullish",
        detail: `Harga (${currentPrice.toFixed(0)}) di atas SMA200 (${indicators.sma200.toFixed(0)}) — Uptrend`,
        weight,
      });
      totalScore += weight * 0.7;
    } else {
      signals.push({
        indicator: "Tren Jangka Panjang (SMA200)",
        signal: "bearish",
        detail: `Harga (${currentPrice.toFixed(0)}) di bawah SMA200 (${indicators.sma200.toFixed(0)}) — Downtrend`,
        weight,
      });
      totalScore -= weight * 0.7;
    }
  }

  // 5. Bollinger Bands (weight: 10)
  if (indicators.bollingerBands) {
    const weight = 10;
    totalWeight += weight;
    const bb = indicators.bollingerBands;
    if (currentPrice <= bb.lower) {
      signals.push({
        indicator: "Bollinger Bands",
        signal: "bullish",
        detail: `Harga menyentuh lower band (${bb.lower.toFixed(0)}) — Potensi bounce`,
        weight,
      });
      totalScore += weight * 0.8;
    } else if (currentPrice >= bb.upper) {
      signals.push({
        indicator: "Bollinger Bands",
        signal: "bearish",
        detail: `Harga menyentuh upper band (${bb.upper.toFixed(0)}) — Potensi pullback`,
        weight,
      });
      totalScore -= weight * 0.6;
    } else {
      const position = (currentPrice - bb.lower) / (bb.upper - bb.lower);
      signals.push({
        indicator: "Bollinger Bands",
        signal: position < 0.4 ? "bullish" : position > 0.6 ? "bearish" : "neutral",
        detail: `Harga di ${(position * 100).toFixed(0)}% range Bollinger — ${position < 0.4 ? "Area bawah" : position > 0.6 ? "Area atas" : "Area tengah"}`,
        weight,
      });
      if (position < 0.4) totalScore += weight * 0.3;
      else if (position > 0.6) totalScore -= weight * 0.3;
    }
  }

  // 6. Stochastic (weight: 10)
  if (indicators.stochastic) {
    const weight = 10;
    totalWeight += weight;
    const { k, d } = indicators.stochastic;
    if (k < 20 && d < 20) {
      signals.push({
        indicator: "Stochastic (14,3)",
        signal: "bullish",
        detail: `%K=${k.toFixed(1)}, %D=${d.toFixed(1)} — Oversold zone`,
        weight,
      });
      totalScore += weight * 0.7;
    } else if (k > 80 && d > 80) {
      signals.push({
        indicator: "Stochastic (14,3)",
        signal: "bearish",
        detail: `%K=${k.toFixed(1)}, %D=${d.toFixed(1)} — Overbought zone`,
        weight,
      });
      totalScore -= weight * 0.7;
    } else if (k > d) {
      signals.push({
        indicator: "Stochastic (14,3)",
        signal: "bullish",
        detail: `%K (${k.toFixed(1)}) > %D (${d.toFixed(1)}) — Bullish crossover`,
        weight,
      });
      totalScore += weight * 0.3;
    } else {
      signals.push({
        indicator: "Stochastic (14,3)",
        signal: "bearish",
        detail: `%K (${k.toFixed(1)}) < %D (${d.toFixed(1)}) — Bearish crossover`,
        weight,
      });
      totalScore -= weight * 0.3;
    }
  }

  // 7. Volume Analysis (weight: 10)
  {
    const weight = 10;
    totalWeight += weight;
    const lastClose = history[history.length - 1];
    const prevClose = history.length > 1 ? history[history.length - 2] : null;
    const priceUp = prevClose ? lastClose.close > prevClose.close : false;

    if (indicators.volumeTrend === "high" && priceUp) {
      signals.push({
        indicator: "Volume Analysis",
        signal: "bullish",
        detail: "Volume tinggi dengan harga naik — Konfirmasi bullish kuat",
        weight,
      });
      totalScore += weight * 0.8;
    } else if (indicators.volumeTrend === "high" && !priceUp) {
      signals.push({
        indicator: "Volume Analysis",
        signal: "bearish",
        detail: "Volume tinggi dengan harga turun — Tekanan jual kuat",
        weight,
      });
      totalScore -= weight * 0.8;
    } else if (indicators.volumeTrend === "low") {
      signals.push({
        indicator: "Volume Analysis",
        signal: "neutral",
        detail: "Volume rendah — Kurang partisipasi pasar",
        weight,
      });
    } else {
      signals.push({
        indicator: "Volume Analysis",
        signal: "neutral",
        detail: "Volume normal — Tidak ada sinyal khusus",
        weight,
      });
    }
  }

  // 8. Price Momentum (weight: 10)
  if (indicators.priceChange5d !== null && indicators.priceChange20d !== null) {
    const weight = 10;
    totalWeight += weight;
    if (indicators.priceChange5d > 0 && indicators.priceChange20d > 0) {
      signals.push({
        indicator: "Price Momentum",
        signal: "bullish",
        detail: `+${indicators.priceChange5d.toFixed(2)}% (5D), +${indicators.priceChange20d.toFixed(2)}% (20D) — Momentum positif`,
        weight,
      });
      totalScore += weight * 0.6;
    } else if (indicators.priceChange5d < 0 && indicators.priceChange20d < 0) {
      signals.push({
        indicator: "Price Momentum",
        signal: "bearish",
        detail: `${indicators.priceChange5d.toFixed(2)}% (5D), ${indicators.priceChange20d.toFixed(2)}% (20D) — Momentum negatif`,
        weight,
      });
      totalScore -= weight * 0.6;
    } else {
      signals.push({
        indicator: "Price Momentum",
        signal: "neutral",
        detail: `${indicators.priceChange5d > 0 ? "+" : ""}${indicators.priceChange5d.toFixed(2)}% (5D), ${indicators.priceChange20d > 0 ? "+" : ""}${indicators.priceChange20d.toFixed(2)}% (20D) — Momentum mixed`,
        weight,
      });
    }
  }

  // Normalize score to -100 to 100
  const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  const clampedScore = Math.max(-100, Math.min(100, normalizedScore));

  // Determine recommendation
  let recommendation: AIRecommendation["recommendation"];
  if (clampedScore >= 50) recommendation = "STRONG_BUY";
  else if (clampedScore >= 20) recommendation = "BUY";
  else if (clampedScore >= -20) recommendation = "HOLD";
  else if (clampedScore >= -50) recommendation = "SELL";
  else recommendation = "STRONG_SELL";

  // Confidence based on signal agreement
  const bullishCount = signals.filter((s) => s.signal === "bullish").length;
  const bearishCount = signals.filter((s) => s.signal === "bearish").length;
  const totalSignals = signals.length;
  const maxDirection = Math.max(bullishCount, bearishCount);
  const confidence = totalSignals > 0 ? (maxDirection / totalSignals) * 100 : 50;

  // Risk level
  const atrPercent = indicators.atr14 && currentPrice > 0 ? (indicators.atr14 / currentPrice) * 100 : 0;
  let riskLevel: AIRecommendation["riskLevel"] = "MEDIUM";
  if (atrPercent > 4 || (indicators.rsi14 && (indicators.rsi14 > 80 || indicators.rsi14 < 20))) {
    riskLevel = "HIGH";
  } else if (atrPercent < 1.5) {
    riskLevel = "LOW";
  }

  // Price targets
  const targetPrice =
    indicators.supportLevel && indicators.resistanceLevel
      ? clampedScore > 0
        ? indicators.resistanceLevel
        : indicators.supportLevel
      : null;

  // Summary
  const summaryParts: string[] = [];
  if (recommendation === "STRONG_BUY" || recommendation === "BUY") {
    summaryParts.push(
      `Saham ${symbol.replace(".JK", "")} menunjukkan sinyal ${recommendation === "STRONG_BUY" ? "sangat positif" : "positif"} berdasarkan analisis ${totalSignals} indikator teknikal.`
    );
    if (indicators.rsi14 !== null && indicators.rsi14 < 35) {
      summaryParts.push("RSI mengindikasikan kondisi oversold dengan potensi rebound.");
    }
    if (indicators.sma20 !== null && indicators.sma50 !== null && indicators.sma20 > indicators.sma50) {
      summaryParts.push("Golden Cross SMA20/50 menunjukkan tren naik.");
    }
    summaryParts.push("Pertimbangkan untuk melakukan pembelian dengan risk management yang baik.");
  } else if (recommendation === "STRONG_SELL" || recommendation === "SELL") {
    summaryParts.push(
      `Saham ${symbol.replace(".JK", "")} menunjukkan sinyal ${recommendation === "STRONG_SELL" ? "sangat negatif" : "negatif"} berdasarkan analisis ${totalSignals} indikator teknikal.`
    );
    if (indicators.rsi14 !== null && indicators.rsi14 > 65) {
      summaryParts.push("RSI mengindikasikan kondisi overbought dengan potensi koreksi.");
    }
    if (indicators.sma20 !== null && indicators.sma50 !== null && indicators.sma20 < indicators.sma50) {
      summaryParts.push("Death Cross SMA20/50 menunjukkan tren turun.");
    }
    summaryParts.push("Pertimbangkan untuk mengurangi posisi atau memasang stop loss.");
  } else {
    summaryParts.push(
      `Saham ${symbol.replace(".JK", "")} dalam kondisi netral berdasarkan analisis ${totalSignals} indikator teknikal.`
    );
    summaryParts.push("Sinyal mixed — sebaiknya tunggu konfirmasi arah tren lebih jelas sebelum mengambil posisi.");
  }

  return {
    symbol,
    recommendation,
    confidence: Math.round(confidence),
    score: Math.round(clampedScore),
    summary: summaryParts.join(" "),
    signals,
    indicators,
    priceTarget: {
      support: indicators.supportLevel,
      resistance: indicators.resistanceLevel,
      targetPrice,
    },
    riskLevel,
    timeHorizon: "1-4 minggu (swing trading)",
  };
}

// ============================================================
// Technical Indicator Calculations
// ============================================================

function calcSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calcRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { value: number; signal: number; histogram: number } | null {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  if (ema12 === null || ema26 === null) return null;

  // Calculate full MACD line for signal line
  const multiplier12 = 2 / 13;
  const multiplier26 = 2 / 27;

  let ema12Running = closes.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  let ema26Running = closes.slice(0, 26).reduce((a, b) => a + b, 0) / 26;

  const macdLine: number[] = [];

  for (let i = 26; i < closes.length; i++) {
    if (i >= 12) {
      ema12Running = (closes[i] - ema12Running) * multiplier12 + ema12Running;
    }
    ema26Running = (closes[i] - ema26Running) * multiplier26 + ema26Running;
    macdLine.push(ema12Running - ema26Running);
  }

  if (macdLine.length < 9) return null;

  // Signal line (9-period EMA of MACD)
  const signalMultiplier = 2 / 10;
  let signal = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  for (let i = 9; i < macdLine.length; i++) {
    signal = (macdLine[i] - signal) * signalMultiplier + signal;
  }

  const value = macdLine[macdLine.length - 1];
  return { value, signal, histogram: value - signal };
}

function calcBollingerBands(
  closes: number[],
  period: number,
  stdMultiplier: number
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + stdMultiplier * std,
    middle: sma,
    lower: sma - stdMultiplier * std,
  };
}

function calcATR(highs: number[], lows: number[], closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

function calcStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number,
  dPeriod: number
): { k: number; d: number } | null {
  if (closes.length < kPeriod + dPeriod) return null;

  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...periodHighs);
    const lowest = Math.min(...periodLows);
    const range = highest - lowest;
    kValues.push(range > 0 ? ((closes[i] - lowest) / range) * 100 : 50);
  }

  const k = kValues[kValues.length - 1];
  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((a, b) => a + b, 0) / dSlice.length;

  return { k, d };
}
