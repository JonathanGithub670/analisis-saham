// ============================================================
// Fair value calculations (pure functions, client & server safe)
// Extracted from components/idx/IdxFairValue.tsx so it can be reused by
// the stock-context builder.
// ============================================================

import type { IdxStockQuote } from "@/services/idxApi";

export interface FairValueMethod {
  name: string;
  label: string;
  description: string;
  value: number | null;
  formula: string;
}

export interface FairValueResult {
  methods: FairValueMethod[];
  consensus: number | null;
  lowRange: number | null;
  highRange: number | null;
  currentPrice: number;
  upsidePercent: number | null;
  verdict:
    | "STRONG_UNDERVALUED"
    | "UNDERVALUED"
    | "FAIR"
    | "OVERVALUED"
    | "STRONG_OVERVALUED";
  verdictLabel: string;
  verdictColor: string;
  verdictBg: string;
  explanation: string;
}

export function calculateFairValue(
  currentPrice: number,
  quote: IdxStockQuote
): FairValueResult | null {
  if (!currentPrice || currentPrice <= 0) return null;

  const eps = quote.epsTrailingTwelveMonths;
  const bvps = quote.bookValue;
  const analystTarget = quote.targetMeanPrice;

  const methods: FairValueMethod[] = [];

  // 1. Graham Number: sqrt(22.5 * EPS * BVPS)
  if (eps && eps > 0 && bvps && bvps > 0) {
    methods.push({
      name: "graham",
      label: "Graham Number",
      description: "Formula klasik Benjamin Graham untuk saham defensif",
      value: Math.sqrt(22.5 * eps * bvps),
      formula: `√(22.5 × ${eps.toFixed(2)} × ${bvps.toFixed(2)})`,
    });
  }

  // 2. P/E Fair Value: 15 × EPS
  if (eps && eps > 0) {
    methods.push({
      name: "pe",
      label: "P/E Fair Value",
      description: "EPS dikali P/E wajar 15x (standar Graham)",
      value: 15 * eps,
      formula: `15 × ${eps.toFixed(2)} (EPS)`,
    });
  }

  // 3. P/B Fair Value: 1.5 × Book Value
  if (bvps && bvps > 0) {
    methods.push({
      name: "pb",
      label: "P/B Fair Value",
      description: "Book Value dikali P/B wajar 1.5x (standar Graham)",
      value: 1.5 * bvps,
      formula: `1.5 × ${bvps.toFixed(2)} (BVPS)`,
    });
  }

  // 4. Analyst Target
  if (analystTarget && analystTarget > 0) {
    methods.push({
      name: "analyst",
      label: "Target Analis",
      description: "Harga target rata-rata dari konsensus analis",
      value: analystTarget,
      formula: "Rata-rata proyeksi analis",
    });
  }

  if (methods.length === 0) return null;

  const validValues = methods
    .map((m) => m.value)
    .filter((v): v is number => v !== null && v > 0);
  if (validValues.length === 0) return null;

  const consensus =
    validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
  const lowRange = Math.min(...validValues);
  const highRange = Math.max(...validValues);
  const upsidePercent = ((consensus - currentPrice) / currentPrice) * 100;

  let verdict: FairValueResult["verdict"];
  let verdictLabel: string;
  let verdictColor: string;
  let verdictBg: string;
  let explanation: string;

  if (upsidePercent >= 25) {
    verdict = "STRONG_UNDERVALUED";
    verdictLabel = "Sangat Murah (Deep Value)";
    verdictColor = "text-success-600 dark:text-success-400";
    verdictBg =
      "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-500/30";
    explanation = `Harga saat ini jauh di bawah nilai wajarnya. Berdasarkan konsensus metode valuasi, saham ini berpotensi naik ~${upsidePercent.toFixed(1)}% menuju fair value. Kondisi ini menarik untuk value investor, namun pastikan fundamental perusahaan masih sehat.`;
  } else if (upsidePercent >= 10) {
    verdict = "UNDERVALUED";
    verdictLabel = "Undervalued (Murah)";
    verdictColor = "text-success-600 dark:text-success-400";
    verdictBg =
      "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-500/30";
    explanation = `Harga saat ini berada di bawah nilai wajar. Potensi upside ~${upsidePercent.toFixed(1)}% menuju fair value konsensus. Saham ini relatif menarik dari sisi valuasi.`;
  } else if (upsidePercent >= -10) {
    verdict = "FAIR";
    verdictLabel = "Fairly Valued (Wajar)";
    verdictColor = "text-warning-600 dark:text-warning-400";
    verdictBg =
      "bg-warning-50 border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30";
    explanation = `Harga saat ini sudah mendekati nilai wajarnya (selisih ${upsidePercent >= 0 ? "+" : ""}${upsidePercent.toFixed(1)}%). Saham ini diperdagangkan pada valuasi yang wajar — tidak murah, tidak mahal.`;
  } else if (upsidePercent >= -25) {
    verdict = "OVERVALUED";
    verdictLabel = "Overvalued (Mahal)";
    verdictColor = "text-error-600 dark:text-error-400";
    verdictBg =
      "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error-500/30";
    explanation = `Harga saat ini di atas nilai wajar (selisih ${upsidePercent.toFixed(1)}%). Saham ini relatif mahal dari sisi valuasi fundamental. Berhati-hatilah saat membeli di harga saat ini.`;
  } else {
    verdict = "STRONG_OVERVALUED";
    verdictLabel = "Sangat Mahal (Bubble Risk)";
    verdictColor = "text-error-600 dark:text-error-400";
    verdictBg =
      "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error-500/30";
    explanation = `Harga saat ini jauh di atas nilai wajar (selisih ${upsidePercent.toFixed(1)}%). Saham ini diperdagangkan pada premium yang tinggi. Risiko koreksi harga cukup besar jika sentimen pasar berubah.`;
  }

  return {
    methods,
    consensus,
    lowRange,
    highRange,
    currentPrice,
    upsidePercent,
    verdict,
    verdictLabel,
    verdictColor,
    verdictBg,
    explanation,
  };
}
