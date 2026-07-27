// ============================================================
// Technical indicator calculations (pure functions, client & server safe)
// Extracted from app/api/idx/ai-analysis/route.ts so it can be reused by
// the stock-context builder and any other consumer.
// ============================================================

export interface OhlcvPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
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

export function calcSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calcEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function calcRSI(closes: number[], period: number): number | null {
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

export function calcMACD(
  closes: number[]
): { value: number; signal: number; histogram: number } | null {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  if (ema12 === null || ema26 === null) return null;

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

  const signalMultiplier = 2 / 10;
  let signal = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  for (let i = 9; i < macdLine.length; i++) {
    signal = (macdLine[i] - signal) * signalMultiplier + signal;
  }

  const value = macdLine[macdLine.length - 1];
  return { value, signal, histogram: value - signal };
}

export function calcBollingerBands(
  closes: number[],
  period: number,
  stdMultiplier: number
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + stdMultiplier * std,
    middle: sma,
    lower: sma - stdMultiplier * std,
  };
}

export function calcATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number | null {
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

export function calcStochastic(
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

export function calculateIndicators(history: OhlcvPoint[]): TechnicalIndicators {
  const closes = history.map((h) => h.close);
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);
  const volumes = history.map((h) => h.volume);

  const rsi14 = calcRSI(closes, 14);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = calcMACD(closes);
  const bollingerBands = calcBollingerBands(closes, 20, 2);
  const atr14 = calcATR(highs, lows, closes, 14);
  const stochastic = calcStochastic(highs, lows, closes, 14, 3);
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

  // Support and Resistance (last 60 bars)
  const recent = history.slice(-60);
  const recentLows = recent.map((h) => h.low).sort((a, b) => a - b);
  const recentHighs = recent.map((h) => h.high).sort((a, b) => b - a);
  const supportLevel =
    recentLows.length > 5 ? recentLows[Math.floor(recentLows.length * 0.1)] : null;
  const resistanceLevel =
    recentHighs.length > 5 ? recentHighs[Math.floor(recentHighs.length * 0.1)] : null;

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
