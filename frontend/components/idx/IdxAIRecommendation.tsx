"use client";

import { useState, useEffect, useCallback } from "react";
import { idxApi, type IdxAIRecommendation } from "@/services/idxApi";

interface Props {
  symbol: string;
  currentPrice?: number;
}

function formatRupiah(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

const RECOMMENDATION_CONFIG = {
  STRONG_BUY: {
    label: "Strong Buy",
    labelId: "Sangat Disarankan Beli",
    color: "bg-success-500",
    textColor: "text-success-500",
    bgColor: "bg-success-50 dark:bg-success-500/10",
    borderColor: "border-success-200 dark:border-success-500/30",
    icon: "^^",
  },
  BUY: {
    label: "Buy",
    labelId: "Disarankan Beli",
    color: "bg-success-400",
    textColor: "text-success-500",
    bgColor: "bg-success-50 dark:bg-success-500/10",
    borderColor: "border-success-200 dark:border-success-500/30",
    icon: "^",
  },
  HOLD: {
    label: "Hold",
    labelId: "Tahan",
    color: "bg-warning-400",
    textColor: "text-warning-500",
    bgColor: "bg-warning-50 dark:bg-warning-500/10",
    borderColor: "border-warning-200 dark:border-warning-500/30",
    icon: "-",
  },
  SELL: {
    label: "Sell",
    labelId: "Disarankan Jual",
    color: "bg-error-400",
    textColor: "text-error-500",
    bgColor: "bg-error-50 dark:bg-error-500/10",
    borderColor: "border-error-200 dark:border-error-500/30",
    icon: "v",
  },
  STRONG_SELL: {
    label: "Strong Sell",
    labelId: "Sangat Disarankan Jual",
    color: "bg-error-500",
    textColor: "text-error-500",
    bgColor: "bg-error-50 dark:bg-error-500/10",
    borderColor: "border-error-200 dark:border-error-500/30",
    icon: "vv",
  },
};

// ============================================================
// Portfolio Position Advisor
// ============================================================

interface PortfolioAdvice {
  action: "HOLD" | "TAKE_PROFIT" | "AVERAGING_DOWN" | "CUT_LOSS" | "ADD_POSITION";
  actionLabel: string;
  summary: string;
  reasons: string[];
  profitLoss: number;
  profitLossPercent: number;
  totalValue: number;
  totalCost: number;
  suggestedStopLoss: number | null;
  suggestedTakeProfit: number | null;
}

function generatePortfolioAdvice(
  lots: number,
  avgPrice: number,
  currentPrice: number,
  analysis: IdxAIRecommendation
): PortfolioAdvice {
  const sharesPerLot = 100;
  const totalShares = lots * sharesPerLot;
  const totalCost = totalShares * avgPrice;
  const totalValue = totalShares * currentPrice;
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

  const reasons: string[] = [];
  let action: PortfolioAdvice["action"];
  let actionLabel: string;
  let summary: string;

  const atr = analysis.indicators.atr14 || 0;
  const support = analysis.priceTarget.support;
  const resistance = analysis.priceTarget.resistance;

  // Decision logic based on P/L and technical signals
  if (profitLossPercent <= -10) {
    // Deep loss territory
    if (analysis.score >= 20) {
      action = "AVERAGING_DOWN";
      actionLabel = "Pertimbangkan Averaging Down";
      summary = `Anda rugi ${profitLossPercent.toFixed(2)}% namun sinyal teknikal masih positif (score: ${analysis.score}). Anda bisa pertimbangkan averaging down untuk menurunkan harga rata-rata.`;
      reasons.push(`Kerugian sudah ${profitLossPercent.toFixed(2)}% tapi trend teknikal menunjukkan potensi rebound`);
      reasons.push(`AI score positif di ${analysis.score} — sinyal mayoritas bullish`);
      if (analysis.indicators.rsi14 && analysis.indicators.rsi14 < 35) {
        reasons.push(`RSI ${analysis.indicators.rsi14.toFixed(1)} mengindikasikan oversold — potensi rebound`);
      }
      reasons.push("Averaging down hanya disarankan jika fundamental perusahaan masih baik");
    } else if (analysis.score <= -20) {
      action = "CUT_LOSS";
      actionLabel = "Disarankan Cut Loss";
      summary = `Anda rugi ${profitLossPercent.toFixed(2)}% dan sinyal teknikal juga negatif (score: ${analysis.score}). Sebaiknya cut loss untuk menghindari kerugian lebih besar.`;
      reasons.push(`Kerugian sudah ${profitLossPercent.toFixed(2)}% dan terus melebar`);
      reasons.push(`AI score negatif di ${analysis.score} — mayoritas sinyal bearish`);
      if (analysis.indicators.rsi14 && analysis.indicators.rsi14 > 50) {
        reasons.push("RSI masih tinggi — belum menunjukkan tanda-tanda reversal");
      }
      if (analysis.indicators.sma20 && analysis.indicators.sma50 && analysis.indicators.sma20 < analysis.indicators.sma50) {
        reasons.push("Death Cross (SMA20 < SMA50) — tren turun masih berlanjut");
      }
      reasons.push("Disarankan memotong kerugian dan mengalokasikan ke saham dengan prospek lebih baik");
    } else {
      action = "HOLD";
      actionLabel = "Tahan & Pantau";
      summary = `Anda rugi ${profitLossPercent.toFixed(2)}% tapi sinyal teknikal belum jelas (score: ${analysis.score}). Tahan posisi dan pantau perkembangan.`;
      reasons.push(`Kerugian di ${profitLossPercent.toFixed(2)}% — belum terlalu dalam`);
      reasons.push("Sinyal teknikal mixed — tunggu konfirmasi arah tren");
      reasons.push("Pasang stop loss di bawah level support untuk membatasi risiko");
    }
  } else if (profitLossPercent <= -5) {
    // Moderate loss
    if (analysis.score <= -30) {
      action = "CUT_LOSS";
      actionLabel = "Pertimbangkan Cut Loss";
      summary = `Anda rugi ${profitLossPercent.toFixed(2)}% dan sinyal teknikal sangat negatif (score: ${analysis.score}). Pertimbangkan cut loss sebelum kerugian membesar.`;
      reasons.push(`Kerugian ${profitLossPercent.toFixed(2)}% dengan tren negatif yang kuat`);
      reasons.push(`AI score sangat negatif di ${analysis.score}`);
      reasons.push("Lebih baik memotong kerugian kecil daripada menunggu kerugian besar");
    } else if (analysis.score >= 20) {
      action = "HOLD";
      actionLabel = "Tahan — Potensi Recovery";
      summary = `Anda rugi ${profitLossPercent.toFixed(2)}% namun sinyal teknikal positif (score: ${analysis.score}). Ada potensi recovery.`;
      reasons.push("Sinyal teknikal menunjukkan potensi pembalikan harga");
      reasons.push(`AI score positif di ${analysis.score}`);
      reasons.push("Tahan posisi dengan pasang stop loss di level support");
    } else {
      action = "HOLD";
      actionLabel = "Tahan & Pantau";
      summary = `Kerugian ${profitLossPercent.toFixed(2)}% masih dalam batas wajar. Pantau perkembangan sinyal teknikal.`;
      reasons.push("Kerugian masih dalam batas toleransi normal");
      reasons.push("Sinyal teknikal belum memberikan konfirmasi jelas");
      reasons.push("Pasang stop loss untuk manajemen risiko");
    }
  } else if (profitLossPercent >= 20) {
    // Big profit
    if (analysis.score <= -20) {
      action = "TAKE_PROFIT";
      actionLabel = "Disarankan Take Profit";
      summary = `Selamat! Keuntungan sudah ${profitLossPercent.toFixed(2)}% dan sinyal teknikal mulai negatif (score: ${analysis.score}). Saatnya mengamankan profit.`;
      reasons.push(`Keuntungan ${profitLossPercent.toFixed(2)}% — sudah sangat baik`);
      reasons.push(`Sinyal teknikal berubah negatif (score: ${analysis.score})`);
      if (analysis.indicators.rsi14 && analysis.indicators.rsi14 > 65) {
        reasons.push(`RSI ${analysis.indicators.rsi14.toFixed(1)} mendekati overbought — potensi koreksi`);
      }
      reasons.push("Amankan sebagian atau seluruh profit sebelum koreksi");
    } else if (analysis.score >= 30) {
      action = "HOLD";
      actionLabel = "Tahan — Let Profit Run";
      summary = `Keuntungan ${profitLossPercent.toFixed(2)}% dan tren masih sangat positif (score: ${analysis.score}). Biarkan profit berjalan dengan trailing stop.`;
      reasons.push(`Profit sudah ${profitLossPercent.toFixed(2)}% dan masih ada momentum naik`);
      reasons.push("Sinyal teknikal sangat positif — tren masih kuat");
      reasons.push("Gunakan trailing stop loss untuk mengunci profit");
    } else {
      action = "TAKE_PROFIT";
      actionLabel = "Pertimbangkan Take Profit Sebagian";
      summary = `Keuntungan sudah ${profitLossPercent.toFixed(2)}%. Pertimbangkan jual sebagian untuk mengamankan profit.`;
      reasons.push(`Profit ${profitLossPercent.toFixed(2)}% sudah cukup signifikan`);
      reasons.push("Jual sebagian (50%) untuk mengamankan profit, tahan sisanya");
      reasons.push("Pasang trailing stop loss untuk sisa posisi");
    }
  } else if (profitLossPercent >= 10) {
    // Moderate profit
    if (analysis.score <= -30) {
      action = "TAKE_PROFIT";
      actionLabel = "Disarankan Take Profit";
      summary = `Profit ${profitLossPercent.toFixed(2)}% dan tren mulai berbalik negatif (score: ${analysis.score}). Amankan keuntungan Anda.`;
      reasons.push("Profit sudah lumayan dan sinyal mulai bearish");
      reasons.push("Lebih baik amankan profit sebelum tergerus koreksi");
    } else {
      action = "HOLD";
      actionLabel = "Tahan dengan Trailing Stop";
      summary = `Profit ${profitLossPercent.toFixed(2)}%. Tahan posisi dengan trailing stop loss untuk mengunci keuntungan.`;
      reasons.push("Profit dalam range bagus — masih ada potensi naik");
      reasons.push("Pasang trailing stop di bawah harga saat ini");
    }
  } else if (profitLossPercent >= 0) {
    // Small profit / breakeven
    if (analysis.score >= 20) {
      action = "ADD_POSITION";
      actionLabel = "Bisa Tambah Posisi";
      summary = `Posisi Anda dekat breakeven (+${profitLossPercent.toFixed(2)}%) dengan sinyal positif (score: ${analysis.score}). Bisa pertimbangkan menambah posisi.`;
      reasons.push("Posisi dekat breakeven — risiko rendah untuk menambah");
      reasons.push("Sinyal teknikal positif mendukung kenaikan");
      reasons.push("Tambah posisi bertahap dengan tetap menjaga risk management");
    } else {
      action = "HOLD";
      actionLabel = "Tahan";
      summary = `Posisi Anda +${profitLossPercent.toFixed(2)}%. Tahan dan tunggu sinyal yang lebih jelas.`;
      reasons.push("Profit minimal — belum perlu mengambil tindakan");
      reasons.push("Pantau perkembangan dan pasang stop loss di level support");
    }
  } else {
    // Small loss (0 to -5%)
    if (analysis.score >= 20) {
      action = "HOLD";
      actionLabel = "Tahan — Potensi Rebound";
      summary = `Kerugian kecil (${profitLossPercent.toFixed(2)}%) dan sinyal teknikal masih positif. Potensi rebound.`;
      reasons.push("Kerugian masih sangat kecil");
      reasons.push("Sinyal teknikal mendukung kenaikan harga");
    } else {
      action = "HOLD";
      actionLabel = "Tahan & Pantau";
      summary = `Kerugian kecil (${profitLossPercent.toFixed(2)}%). Pantau perkembangan teknikal.`;
      reasons.push("Kerugian masih dalam batas normal");
      reasons.push("Siapkan stop loss untuk antisipasi");
    }
  }

  // Suggested stop loss & take profit
  let suggestedStopLoss: number | null = null;
  let suggestedTakeProfit: number | null = null;

  if (support && support < currentPrice) {
    suggestedStopLoss = Math.round(support * 0.98); // 2% below support
  } else if (atr > 0) {
    suggestedStopLoss = Math.round(currentPrice - atr * 2);
  }

  if (resistance && resistance > currentPrice) {
    suggestedTakeProfit = Math.round(resistance);
  } else if (atr > 0) {
    suggestedTakeProfit = Math.round(currentPrice + atr * 3);
  }

  return {
    action,
    actionLabel,
    summary,
    reasons,
    profitLoss,
    profitLossPercent,
    totalValue,
    totalCost,
    suggestedStopLoss,
    suggestedTakeProfit,
  };
}

// ============================================================
// Main Component
// ============================================================

export default function IdxAIRecommendationPanel({ symbol, currentPrice }: Props) {
  const [analysis, setAnalysis] = useState<IdxAIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portfolio state
  const [lots, setLots] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [portfolioAdvice, setPortfolioAdvice] = useState<PortfolioAdvice | null>(null);
  const [showPortfolio, setShowPortfolio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const data = await idxApi.getAIAnalysis(symbol);
        if (!cancelled) setAnalysis(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal menganalisis");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalysis();
    return () => { cancelled = true; };
  }, [symbol]);

  const handlePortfolioSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) return;
    const lotsNum = parseInt(lots);
    const avgNum = parseFloat(avgPrice);
    if (!lotsNum || lotsNum <= 0 || !avgNum || avgNum <= 0) return;

    const price = currentPrice || analysis.priceTarget.targetPrice || 0;
    // Get current price from the AI analysis data if not provided
    // We need a real current price - use indicators or support/resistance as proxy
    let effectivePrice = price;
    if (!effectivePrice && analysis.indicators.sma20) {
      effectivePrice = analysis.indicators.sma20;
    }

    const advice = generatePortfolioAdvice(lotsNum, avgNum, effectivePrice, analysis);
    setPortfolioAdvice(advice);
    setShowPortfolio(true);
  }, [lots, avgPrice, currentPrice, analysis]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="text-center py-4">
          <p className="text-error-500 font-medium mb-1">Gagal Menganalisis</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const config = RECOMMENDATION_CONFIG[analysis.recommendation];
  const scoreColor = analysis.score >= 20 ? "text-success-500" : analysis.score <= -20 ? "text-error-500" : "text-warning-500";
  const code = symbol.replace(".JK", "");

  return (
    <div className="space-y-6">
      {/* Main Recommendation Card */}
      <div className={`rounded-2xl border p-6 ${config.borderColor} ${config.bgColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center`}>
              <span className="text-white text-lg font-bold">{config.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Rekomendasi AI
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analisis teknikal otomatis
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className={`text-2xl font-bold ${config.textColor}`}>
              {config.labelId}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Confidence: {analysis.confidence}%
            </p>
          </div>
        </div>

        {/* Score Gauge */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Strong Sell</span>
            <span className={`text-sm font-bold ${scoreColor}`}>
              Score: {analysis.score > 0 ? "+" : ""}{analysis.score}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Strong Buy</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 w-full rounded-full relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 dark:border-white rounded-full shadow-md"
                style={{ left: `${Math.max(2, Math.min(98, (analysis.score + 100) / 2))}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {analysis.summary}
        </p>

        {/* Risk & Time Horizon */}
        <div className="flex flex-wrap gap-3 mt-4">
          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
            analysis.riskLevel === "LOW" ? "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400"
            : analysis.riskLevel === "HIGH" ? "bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400"
            : "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400"
          }`}>
            Risiko: {analysis.riskLevel === "LOW" ? "Rendah" : analysis.riskLevel === "HIGH" ? "Tinggi" : "Sedang"}
          </span>
          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {analysis.timeHorizon}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Portfolio Position Advisor */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-brand-200 bg-white p-6 dark:border-brand-500/30 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
              Saran Posisi Portofolio
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Masukkan posisi Anda di {code} untuk mendapat saran hold / take profit / cut loss
            </p>
          </div>
        </div>

        <form onSubmit={handlePortfolioSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Jumlah Lot
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                placeholder="cth: 10"
                className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30"
              />
              <p className="text-xs text-gray-400 mt-1">1 lot = 100 lembar saham</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Harga Rata-rata Beli (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="cth: 5323.5"
                className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30"
              />
              <p className="text-xs text-gray-400 mt-1">Harga average pembelian Anda</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!lots || !avgPrice || parseInt(lots) <= 0 || parseFloat(avgPrice) <= 0}
            className="w-full sm:w-auto h-11 px-8 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Analisis Posisi Saya
          </button>
        </form>

        {/* Portfolio Advice Result */}
        {showPortfolio && portfolioAdvice && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Action Badge */}
            <div className={`rounded-xl p-5 ${
              portfolioAdvice.action === "CUT_LOSS"
                ? "bg-error-50 border border-error-200 dark:bg-error-500/10 dark:border-error-500/30"
                : portfolioAdvice.action === "TAKE_PROFIT"
                ? "bg-success-50 border border-success-200 dark:bg-success-500/10 dark:border-success-500/30"
                : portfolioAdvice.action === "ADD_POSITION" || portfolioAdvice.action === "AVERAGING_DOWN"
                ? "bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30"
                : "bg-warning-50 border border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <span className={`text-lg font-bold ${
                  portfolioAdvice.action === "CUT_LOSS" ? "text-error-600 dark:text-error-400"
                  : portfolioAdvice.action === "TAKE_PROFIT" ? "text-success-600 dark:text-success-400"
                  : portfolioAdvice.action === "ADD_POSITION" || portfolioAdvice.action === "AVERAGING_DOWN" ? "text-brand-600 dark:text-brand-400"
                  : "text-warning-600 dark:text-warning-400"
                }`}>
                  {portfolioAdvice.actionLabel}
                </span>
                <span className={`text-lg font-bold ${portfolioAdvice.profitLossPercent >= 0 ? "text-success-500" : "text-error-500"}`}>
                  {portfolioAdvice.profitLossPercent >= 0 ? "+" : ""}{portfolioAdvice.profitLossPercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {portfolioAdvice.summary}
              </p>
            </div>

            {/* P/L Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Modal</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatRupiah(portfolioAdvice.totalCost)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nilai Saat Ini</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatRupiah(portfolioAdvice.totalValue)}</p>
              </div>
              <div className={`p-3 rounded-xl ${portfolioAdvice.profitLoss >= 0 ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Profit / Loss</p>
                <p className={`text-sm font-bold ${portfolioAdvice.profitLoss >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                  {portfolioAdvice.profitLoss >= 0 ? "+" : ""}{formatRupiah(portfolioAdvice.profitLoss)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${portfolioAdvice.profitLossPercent >= 0 ? "bg-success-50 dark:bg-success-500/10" : "bg-error-50 dark:bg-error-500/10"}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Return</p>
                <p className={`text-sm font-bold ${portfolioAdvice.profitLossPercent >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>
                  {portfolioAdvice.profitLossPercent >= 0 ? "+" : ""}{portfolioAdvice.profitLossPercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Reasons */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.02]">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Alasan:</h4>
              <ul className="space-y-2">
                {portfolioAdvice.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Levels */}
            {(portfolioAdvice.suggestedStopLoss || portfolioAdvice.suggestedTakeProfit) && (
              <div className="grid grid-cols-2 gap-3">
                {portfolioAdvice.suggestedStopLoss && (
                  <div className="p-3 rounded-xl border border-error-200 bg-error-50 dark:bg-error-500/10 dark:border-error-500/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Stop Loss</p>
                    <p className="text-sm font-bold text-error-600 dark:text-error-400">{formatRupiah(portfolioAdvice.suggestedStopLoss)}</p>
                  </div>
                )}
                {portfolioAdvice.suggestedTakeProfit && (
                  <div className="p-3 rounded-xl border border-success-200 bg-success-50 dark:bg-success-500/10 dark:border-success-500/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Take Profit</p>
                    <p className="text-sm font-bold text-success-600 dark:text-success-400">{formatRupiah(portfolioAdvice.suggestedTakeProfit)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price Target */}
      {(analysis.priceTarget.support || analysis.priceTarget.resistance) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
            Target Harga
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-error-50 dark:bg-error-500/10">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Support</p>
              <p className="text-sm font-bold text-error-500">{formatRupiah(analysis.priceTarget.support)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target</p>
              <p className="text-sm font-bold text-brand-500">{formatRupiah(analysis.priceTarget.targetPrice)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-success-50 dark:bg-success-500/10">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resistance</p>
              <p className="text-sm font-bold text-success-500">{formatRupiah(analysis.priceTarget.resistance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Signals */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
          Sinyal Teknikal ({analysis.signals.length} Indikator)
        </h3>
        <div className="space-y-2">
          {analysis.signals.map((signal, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
            >
              <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                signal.signal === "bullish"
                  ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                  : signal.signal === "bearish"
                  ? "bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                <span className="text-xs font-bold">
                  {signal.signal === "bullish" ? "+" : signal.signal === "bearish" ? "-" : "="}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {signal.indicator}
                  </p>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    signal.signal === "bullish"
                      ? "text-success-600 bg-success-50 dark:text-success-400 dark:bg-success-500/10"
                      : signal.signal === "bearish"
                      ? "text-error-600 bg-error-50 dark:text-error-400 dark:bg-error-500/10"
                      : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700"
                  }`}>
                    {signal.signal}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {signal.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Indicators Summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
          Indikator Teknikal
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <IndicatorCard
            label="RSI (14)"
            value={analysis.indicators.rsi14?.toFixed(1) || "-"}
            status={
              analysis.indicators.rsi14
                ? analysis.indicators.rsi14 < 30 ? "oversold" : analysis.indicators.rsi14 > 70 ? "overbought" : "normal"
                : "normal"
            }
          />
          <IndicatorCard
            label="MACD"
            value={analysis.indicators.macd?.histogram.toFixed(2) || "-"}
            status={
              analysis.indicators.macd
                ? analysis.indicators.macd.histogram > 0 ? "bullish" : "bearish"
                : "normal"
            }
          />
          <IndicatorCard
            label="SMA 20"
            value={analysis.indicators.sma20 ? formatRupiah(analysis.indicators.sma20) : "-"}
            status="normal"
          />
          <IndicatorCard
            label="SMA 50"
            value={analysis.indicators.sma50 ? formatRupiah(analysis.indicators.sma50) : "-"}
            status="normal"
          />
          <IndicatorCard
            label="SMA 200"
            value={analysis.indicators.sma200 ? formatRupiah(analysis.indicators.sma200) : "-"}
            status="normal"
          />
          <IndicatorCard
            label="ATR (14)"
            value={analysis.indicators.atr14?.toFixed(0) || "-"}
            status="normal"
          />
          {analysis.indicators.bollingerBands && (
            <>
              <IndicatorCard
                label="BB Upper"
                value={formatRupiah(analysis.indicators.bollingerBands.upper)}
                status="normal"
              />
              <IndicatorCard
                label="BB Lower"
                value={formatRupiah(analysis.indicators.bollingerBands.lower)}
                status="normal"
              />
            </>
          )}
          {analysis.indicators.stochastic && (
            <IndicatorCard
              label="Stochastic %K"
              value={analysis.indicators.stochastic.k.toFixed(1)}
              status={
                analysis.indicators.stochastic.k < 20 ? "oversold"
                : analysis.indicators.stochastic.k > 80 ? "overbought"
                : "normal"
              }
            />
          )}
          <IndicatorCard
            label="Volume Trend"
            value={analysis.indicators.volumeTrend === "high" ? "Tinggi" : analysis.indicators.volumeTrend === "low" ? "Rendah" : "Normal"}
            status={analysis.indicators.volumeTrend === "high" ? "bullish" : analysis.indicators.volumeTrend === "low" ? "bearish" : "normal"}
          />
          {analysis.indicators.priceChange5d !== null && (
            <IndicatorCard
              label="Change 5D"
              value={`${analysis.indicators.priceChange5d > 0 ? "+" : ""}${analysis.indicators.priceChange5d.toFixed(2)}%`}
              status={analysis.indicators.priceChange5d > 0 ? "bullish" : analysis.indicators.priceChange5d < 0 ? "bearish" : "normal"}
            />
          )}
          {analysis.indicators.priceChange20d !== null && (
            <IndicatorCard
              label="Change 20D"
              value={`${analysis.indicators.priceChange20d > 0 ? "+" : ""}${analysis.indicators.priceChange20d.toFixed(2)}%`}
              status={analysis.indicators.priceChange20d > 0 ? "bullish" : analysis.indicators.priceChange20d < 0 ? "bearish" : "normal"}
            />
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> Rekomendasi ini dihasilkan secara otomatis berdasarkan analisis teknikal dan bukan merupakan saran investasi.
          Selalu lakukan riset mandiri dan konsultasikan dengan penasihat keuangan sebelum mengambil keputusan investasi.
          Kinerja masa lalu tidak menjamin hasil di masa depan.
        </p>
      </div>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "bullish" | "bearish" | "oversold" | "overbought" | "normal";
}) {
  const statusStyles = {
    bullish: "border-success-200 dark:border-success-500/30",
    bearish: "border-error-200 dark:border-error-500/30",
    oversold: "border-success-300 dark:border-success-500/40",
    overbought: "border-error-300 dark:border-error-500/40",
    normal: "border-gray-200 dark:border-gray-700",
  };

  const valueColor = {
    bullish: "text-success-500",
    bearish: "text-error-500",
    oversold: "text-success-600 dark:text-success-400",
    overbought: "text-error-600 dark:text-error-400",
    normal: "text-gray-800 dark:text-white/90",
  };

  return (
    <div className={`p-3 rounded-xl border bg-white dark:bg-white/[0.03] ${statusStyles[status]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${valueColor[status]}`}>{value}</p>
      {status !== "normal" && (
        <p className="text-[10px] font-medium mt-0.5 uppercase tracking-wide text-gray-400">
          {status}
        </p>
      )}
    </div>
  );
}
