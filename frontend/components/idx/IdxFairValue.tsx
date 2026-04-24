"use client";

import type { IdxStockQuote } from "@/services/idxApi";

interface Props {
  quote: IdxStockQuote;
}

function formatRupiah(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

interface FairValueMethod {
  name: string;
  label: string;
  description: string;
  value: number | null;
  formula: string;
}

interface FairValueResult {
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

function calculateFairValue(
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

export default function IdxFairValue({ quote }: Props) {
  const fairValue = calculateFairValue(quote.price, quote);

  if (!fairValue) {
    const diag = [
      { label: "EPS (TTM)", value: quote.epsTrailingTwelveMonths, ok: !!(quote.epsTrailingTwelveMonths && quote.epsTrailingTwelveMonths > 0) },
      { label: "Book Value (BVPS)", value: quote.bookValue, ok: !!(quote.bookValue && quote.bookValue > 0) },
      { label: "Target Analis", value: quote.targetMeanPrice, ok: !!(quote.targetMeanPrice && quote.targetMeanPrice > 0) },
      { label: "P/E Ratio", value: quote.trailingPE, ok: !!(quote.trailingPE && quote.trailingPE > 0) },
      { label: "P/B Ratio", value: quote.priceToBook, ok: !!(quote.priceToBook && quote.priceToBook > 0) },
    ];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
            Fair Value Tidak Dapat Dihitung
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Salah satu sebab berikut: (1) data fundamental belum berhasil diambil
            dari Yahoo Finance, (2) perusahaan sedang merugi (EPS negatif), atau
            (3) saham belum dicover analis.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
            Diagnostik Data Fundamental
          </h4>
          <div className="space-y-2">
            {diag.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${d.ok ? "bg-success-500" : "bg-error-500"}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{d.label}</span>
                </div>
                <span className={`text-sm font-mono font-semibold ${d.ok ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
                  {d.value !== null && d.value !== undefined
                    ? typeof d.value === "number"
                      ? d.value.toFixed(2)
                      : String(d.value)
                    : "null"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Fair value membutuhkan minimal satu dari: EPS positif, Book Value positif,
            atau Target Analis. Jika semua menunjukkan <code>null</code>, periksa log
            server backend untuk melihat status fetch Yahoo Finance API.
          </p>
        </div>
      </div>
    );
  }

  const range =
    fairValue.lowRange && fairValue.highRange
      ? fairValue.highRange - fairValue.lowRange
      : 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-brand-50/30 p-6 dark:border-gray-800 dark:from-white/[0.03] dark:to-brand-500/[0.05]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
              Harga Wajar Saham
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Estimasi nilai intrinsik saham {quote.symbol.replace(".JK", "")}{" "}
              berdasarkan analisis fundamental multi-metode
            </p>
          </div>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className={`rounded-2xl border p-6 ${fairValue.verdictBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className={`text-xl font-bold ${fairValue.verdictColor}`}>
            {fairValue.verdictLabel}
          </span>
          {fairValue.upsidePercent !== null && (
            <span
              className={`text-xl font-bold ${
                fairValue.upsidePercent >= 0
                  ? "text-success-500"
                  : "text-error-500"
              }`}
            >
              {fairValue.upsidePercent >= 0 ? "+" : ""}
              {fairValue.upsidePercent.toFixed(2)}% potensi
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {fairValue.explanation}
        </p>
      </div>

      {/* Summary Grid: Current vs Fair Value */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            Harga Saat Ini
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatRupiah(fairValue.currentPrice)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Market Price</p>
        </div>
        <div className="p-5 rounded-2xl bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30">
          <p className="text-xs text-brand-600 dark:text-brand-400 mb-1.5">
            Fair Value (Konsensus)
          </p>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {formatRupiah(fairValue.consensus)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Range: {formatRupiah(fairValue.lowRange)} –{" "}
            {formatRupiah(fairValue.highRange)}
          </p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            fairValue.upsidePercent !== null && fairValue.upsidePercent >= 0
              ? "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-500/30"
              : "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error-500/30"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            Selisih dari Wajar
          </p>
          <p
            className={`text-2xl font-bold ${
              fairValue.upsidePercent !== null && fairValue.upsidePercent >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-error-600 dark:text-error-400"
            }`}
          >
            {fairValue.upsidePercent !== null && fairValue.upsidePercent >= 0
              ? "+"
              : ""}
            {fairValue.consensus !== null
              ? formatRupiah(
                  Math.round(fairValue.consensus - fairValue.currentPrice)
                )
              : "-"}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {fairValue.upsidePercent !== null && fairValue.upsidePercent >= 0
              ? "+"
              : ""}
            {fairValue.upsidePercent?.toFixed(2)}% dari harga saat ini
          </p>
        </div>
      </div>

      {/* Price Position Bar */}
      {fairValue.lowRange &&
        fairValue.highRange &&
        fairValue.lowRange !== fairValue.highRange && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
              Posisi Harga terhadap Range Valuasi
            </h3>
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Low: {formatRupiah(fairValue.lowRange)}</span>
              <span>High: {formatRupiah(fairValue.highRange)}</span>
            </div>
            <div className="relative h-4 bg-gradient-to-r from-success-400 via-warning-400 to-error-400 rounded-full overflow-visible mb-2">
              {(() => {
                const pad = range * 0.5;
                const min = (fairValue.lowRange as number) - pad;
                const max = (fairValue.highRange as number) + pad;
                const total = max - min;
                const currentPos = Math.max(
                  0,
                  Math.min(
                    100,
                    ((fairValue.currentPrice - min) / total) * 100
                  )
                );
                const consensusPos =
                  fairValue.consensus !== null
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          ((fairValue.consensus - min) / total) * 100
                        )
                      )
                    : 50;
                return (
                  <>
                    <div
                      className="absolute top-1/2 w-1 h-6 bg-gray-800 dark:bg-white rounded"
                      style={{
                        left: `${consensusPos}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute top-1/2 w-5 h-5 bg-white border-2 border-brand-500 rounded-full shadow-md"
                      style={{
                        left: `${currentPos}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-brand-500 bg-white" />
                Harga Saat Ini
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-0.5 h-3.5 bg-gray-800 dark:bg-white" />
                Fair Value Konsensus
              </span>
            </div>
          </div>
        )}

      {/* Method Breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
          Metode Valuasi yang Digunakan
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {fairValue.methods.length} metode dikombinasikan untuk mendapatkan
          konsensus fair value
        </p>
        <div className="space-y-3">
          {fairValue.methods.map((m) => {
            const diff =
              m.value !== null
                ? ((m.value - fairValue.currentPrice) /
                    fairValue.currentPrice) *
                  100
                : null;
            return (
              <div
                key={m.name}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-gray-800 dark:text-white/90">
                    {m.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-brand-600 dark:text-brand-400">
                      {formatRupiah(
                        m.value !== null ? Math.round(m.value) : null
                      )}
                    </p>
                    {diff !== null && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          diff >= 0
                            ? "text-success-600 bg-success-50 dark:text-success-400 dark:bg-success-500/10"
                            : "text-error-600 bg-error-50 dark:text-error-400 dark:bg-error-500/10"
                        }`}
                      >
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {m.description}
                </p>
                <code className="text-[11px] text-gray-400 font-mono block">
                  {m.formula}
                </code>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fundamental Inputs Used */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
          Data Fundamental yang Digunakan
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DataBox
            label="EPS (TTM)"
            value={
              quote.epsTrailingTwelveMonths !== null
                ? quote.epsTrailingTwelveMonths.toFixed(2)
                : "-"
            }
            hint="Earnings per Share"
          />
          <DataBox
            label="BVPS"
            value={
              quote.bookValue !== null ? quote.bookValue.toFixed(2) : "-"
            }
            hint="Book Value per Share"
          />
          <DataBox
            label="P/E Ratio"
            value={
              quote.trailingPE !== null ? quote.trailingPE.toFixed(2) : "-"
            }
            hint="Price to Earnings"
          />
          <DataBox
            label="P/B Ratio"
            value={
              quote.priceToBook !== null
                ? quote.priceToBook.toFixed(2)
                : "-"
            }
            hint="Price to Book"
          />
          <DataBox
            label="Target Analis"
            value={formatRupiah(quote.targetMeanPrice)}
            hint="Konsensus analis"
          />
          <DataBox
            label="ROE"
            value={
              quote.returnOnEquity !== null
                ? `${(quote.returnOnEquity * 100).toFixed(2)}%`
                : "-"
            }
            hint="Return on Equity"
          />
          <DataBox
            label="Profit Margin"
            value={
              quote.profitMargins !== null
                ? `${(quote.profitMargins * 100).toFixed(2)}%`
                : "-"
            }
            hint="Margin laba bersih"
          />
          <DataBox
            label="Revenue Growth"
            value={
              quote.revenueGrowth !== null
                ? `${(quote.revenueGrowth * 100).toFixed(2)}%`
                : "-"
            }
            hint="Pertumbuhan pendapatan"
          />
        </div>
      </div>

      {/* Penjelasan Metode */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
          Memahami Metode Valuasi
        </h3>
        <div className="space-y-4">
          <MethodExplanation
            title="Graham Number"
            formula="√(22.5 × EPS × BVPS)"
            body="Diciptakan oleh Benjamin Graham (mentor Warren Buffett) dalam buku The Intelligent Investor. Konstanta 22.5 berasal dari batas maksimal P/E (15) dikali batas maksimal P/B (1.5). Formula ini cocok untuk perusahaan stabil dengan earning dan book value positif."
          />
          <MethodExplanation
            title="P/E Fair Value"
            formula="15 × EPS"
            body="Graham menyarankan P/E wajar untuk saham defensif adalah maksimal 15x. Jika EPS positif, maka harga wajarnya adalah 15 dikali EPS tahunan. Metode ini mengabaikan pertumbuhan, sehingga konservatif."
          />
          <MethodExplanation
            title="P/B Fair Value"
            formula="1.5 × Book Value per Share"
            body="P/B (Price to Book) maksimal 1.5x adalah batas Graham untuk saham defensif. Book Value merepresentasikan nilai buku ekuitas per saham. Metode ini sangat cocok untuk sektor perbankan dan asuransi."
          />
          <MethodExplanation
            title="Target Analis"
            formula="Konsensus analis profesional"
            body="Harga target rata-rata dari para analis sekuritas yang mengcover saham ini. Mereka menggunakan model DCF, multiple comparable, dan proyeksi earning yang lebih kompleks. Hanya tersedia untuk saham yang dicover analis."
          />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> Perhitungan fair
          value ini adalah estimasi berdasarkan rumus valuasi klasik dan data
          fundamental terkini. Hasil ini bukan rekomendasi jual/beli dan tidak
          menjamin harga akan bergerak menuju nilai wajar tersebut. Faktor
          makro, sentimen pasar, dan pertumbuhan masa depan dapat membuat harga
          berbeda signifikan dari fair value. Selalu lakukan riset mandiri dan
          konsultasikan dengan penasihat keuangan sebelum berinvestasi.
        </p>
      </div>
    </div>
  );
}

function DataBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-800 dark:text-white/90">
        {value}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

function MethodExplanation({
  title,
  formula,
  body,
}: {
  title: string;
  formula: string;
  body: string;
}) {
  return (
    <div className="pl-4 border-l-2 border-brand-300 dark:border-brand-500/40">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
          {title}
        </h4>
        <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {formula}
        </code>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
