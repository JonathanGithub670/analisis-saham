"use client";

import { useState, useEffect, useCallback } from "react";
import { idxApi, type IdxStockQuote, type IdxHistoryItem } from "@/services/idxApi";
import IdxStockChart from "./IdxStockChart";
import IdxAIRecommendationPanel from "./IdxAIRecommendation";
import IdxFairValue from "./IdxFairValue";
import IdxStockChat from "./IdxStockChat";

const RANGES = [
  { label: "1M", value: "1mo", interval: "1d" },
  { label: "3M", value: "3mo", interval: "1d" },
  { label: "6M", value: "6mo", interval: "1d" },
  { label: "1Y", value: "1y", interval: "1wk" },
  { label: "5Y", value: "5y", interval: "1mo" },
];

function formatRupiah(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("id-ID");
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatBigNumber(value: number | null) {
  if (value === null || value === undefined) return "-";
  if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2)}M`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(2)}Jt`;
  return formatRupiah(value);
}

interface Props {
  symbol: string;
  onBack: () => void;
}

export default function IdxStockDetail({ symbol, onBack }: Props) {
  const [quote, setQuote] = useState<IdxStockQuote | null>(null);
  const [history, setHistory] = useState<IdxHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState("6mo");
  const [chartType, setChartType] = useState<"candlestick" | "line">("candlestick");
  const [activeTab, setActiveTab] = useState<"overview" | "fundamental" | "profile" | "ai-analysis" | "fair-value" | "chat">("overview");

  const fetchData = useCallback(async (range: string, interval: string) => {
    setLoading(true);
    setError(null);
    try {
      const [quoteData, historyData] = await Promise.all([
        idxApi.getStock(symbol),
        idxApi.getHistory(symbol, range, interval),
      ]);
      setQuote(quoteData);
      setHistory(historyData.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data saham");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const r = RANGES.find((r) => r.value === activeRange) || RANGES[2];
    fetchData(r.value, r.interval);
  }, [symbol, activeRange, fetchData]);

  if (loading && !quote) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
        <div className="h-[420px] rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-50 dark:bg-error-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-error-500 text-lg font-semibold mb-1">Gagal Memuat Data</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
          Kembali
        </button>
      </div>
    );
  }

  if (!quote) return null;

  const isUp = quote.change >= 0;
  const code = symbol.replace(".JK", "");

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Kembali ke pencarian
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
            <span className="text-xl font-bold text-brand-500">{code.substring(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">{code}</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-brand-50 text-brand-500 rounded-md dark:bg-brand-500/10 dark:text-brand-400">
                IDX
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{quote.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-800 dark:text-white/90">
            {formatRupiah(quote.price)}
          </p>
          <p className={`text-sm font-semibold ${isUp ? "text-success-500" : "text-error-500"}`}>
            {isUp ? "+" : ""}{formatRupiah(quote.change)} ({isUp ? "+" : ""}{quote.changePercent?.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Open" value={formatRupiah(quote.open)} />
        <StatCard label="High" value={formatRupiah(quote.high)} className="text-success-500" />
        <StatCard label="Low" value={formatRupiah(quote.low)} className="text-error-500" />
        <StatCard label="Prev Close" value={formatRupiah(quote.previousClose)} />
        <StatCard label="Volume" value={formatNumber(quote.volume)} />
        <StatCard label="Market Cap" value={quote.marketCapFmt || formatBigNumber(quote.marketCap)} />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setActiveRange(r.value)}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                activeRange === r.value
                  ? "bg-white text-brand-500 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setChartType("candlestick")}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              chartType === "candlestick"
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Candlestick
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              chartType === "line"
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="mb-6">
          <IdxStockChart
            data={history}
            symbol={symbol}
            chartType={chartType}
            currency={quote.currency}
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
        {([
          { key: "overview", label: "Ringkasan" },
          { key: "fundamental", label: "Fundamental" },
          { key: "fair-value", label: "Harga Wajar" },
          { key: "ai-analysis", label: "Rekomendasi AI" },
          { key: "chat", label: "Chat AI" },
          { key: "profile", label: "Profil" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trading Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Informasi Trading</h3>
            <div className="space-y-3">
              <InfoRow label="52-Week High" value={formatRupiah(quote.fiftyTwoWeekHigh)} />
              <InfoRow label="52-Week Low" value={formatRupiah(quote.fiftyTwoWeekLow)} />
              <InfoRow label="MA 50 Hari" value={formatRupiah(quote.fiftyDayAverage)} />
              <InfoRow label="MA 200 Hari" value={formatRupiah(quote.twoHundredDayAverage)} />
              <InfoRow label="Avg Volume" value={formatNumber(quote.averageVolume)} />
              <InfoRow label="Beta" value={quote.beta?.toFixed(2) || "-"} />
            </div>
          </div>

          {/* Valuation */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Valuasi</h3>
            <div className="space-y-3">
              <InfoRow label="P/E Ratio (TTM)" value={quote.trailingPE?.toFixed(2) || "-"} />
              <InfoRow label="Forward P/E" value={quote.forwardPE?.toFixed(2) || "-"} />
              <InfoRow label="P/B Ratio" value={quote.priceToBook?.toFixed(2) || "-"} />
              <InfoRow label="Book Value" value={formatRupiah(quote.bookValue)} />
              <InfoRow label="Dividend Yield" value={quote.dividendYieldFmt || "-"} />
              <InfoRow label="Market Cap" value={quote.marketCapFmt || formatBigNumber(quote.marketCap)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "fundamental" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Performance */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Kinerja Keuangan</h3>
            <div className="space-y-3">
              <InfoRow label="Total Pendapatan" value={quote.totalRevenueFmt || formatBigNumber(quote.totalRevenue)} />
              <InfoRow label="Pertumbuhan Pendapatan" value={formatPercent(quote.revenueGrowth)} />
              <InfoRow label="Pertumbuhan EPS (Q)" value={formatPercent(quote.earningsQuarterlyGrowth)} />
              <InfoRow label="Enterprise Value" value={quote.enterpriseValueFmt || formatBigNumber(quote.enterpriseValue)} />
            </div>
          </div>

          {/* Margins & Health */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Margin & Kesehatan</h3>
            <div className="space-y-3">
              <InfoRow label="Gross Margin" value={formatPercent(quote.grossMargins)} />
              <InfoRow label="Operating Margin" value={formatPercent(quote.operatingMargins)} />
              <InfoRow label="Profit Margin" value={formatPercent(quote.profitMargins)} />
              <InfoRow label="Return on Equity" value={formatPercent(quote.returnOnEquity)} />
              <InfoRow label="Debt to Equity" value={quote.debtToEquity?.toFixed(2) || "-"} />
              <InfoRow label="Current Ratio" value={quote.currentRatio?.toFixed(2) || "-"} />
            </div>
          </div>

          {/* Analyst */}
          {quote.recommendationKey && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Rekomendasi Analis</h3>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${
                  quote.recommendationKey === "buy" || quote.recommendationKey === "strong_buy"
                    ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                    : quote.recommendationKey === "sell" || quote.recommendationKey === "strong_sell"
                    ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
                    : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
                }`}>
                  {quote.recommendationKey.replace("_", " ")}
                </span>
                {quote.targetMeanPrice && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Target Harga: <span className="font-semibold text-gray-800 dark:text-white/90">{formatRupiah(quote.targetMeanPrice)}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "fair-value" && <IdxFairValue quote={quote} />}

      {activeTab === "ai-analysis" && (
        <IdxAIRecommendationPanel symbol={symbol} currentPrice={quote.price} />
      )}

      {activeTab === "chat" && <IdxStockChat quote={quote} />}

      {activeTab === "profile" && (
        <CompanyProfile quote={quote} code={code} />
      )}
    </div>
  );
}

function CompanyProfile({ quote, code }: { quote: IdxStockQuote; code: string }) {
  const [expanded, setExpanded] = useState(false);

  const addressParts = [quote.address1, quote.city, quote.zip, quote.country].filter(
    (v): v is string => !!v
  );
  const fullAddress = addressParts.join(", ");

  const summary = quote.longBusinessSummary || "";
  const summaryIsLong = summary.length > 480;
  const displaySummary = expanded || !summaryIsLong ? summary : summary.slice(0, 480) + "…";

  const hasContact = quote.website || quote.phone || fullAddress;
  const officers = quote.companyOfficers || [];

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-brand-50/30 p-6 dark:border-gray-800 dark:from-white/[0.03] dark:to-brand-500/[0.05]">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            <span className="text-2xl font-bold text-white">{code.substring(0, 2)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">{quote.name}</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-brand-50 text-brand-600 rounded-md dark:bg-brand-500/10 dark:text-brand-400">
                {code}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Tercatat di {quote.exchange || "IDX"} • Mata uang {quote.currency}
            </p>
            <div className="flex flex-wrap gap-2">
              {quote.sector && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  {quote.sector}
                </span>
              )}
              {quote.industry && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  {quote.industry}
                </span>
              )}
              {quote.fullTimeEmployees && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  {formatNumber(quote.fullTimeEmployees)} karyawan
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Informasi Umum
          </h3>
          <div className="space-y-1">
            <InfoRow label="Simbol" value={quote.symbol} />
            <InfoRow label="Kode" value={code} />
            <InfoRow label="Nama Lengkap" value={quote.name} />
            <InfoRow label="Sektor" value={quote.sector || "-"} />
            <InfoRow label="Industri" value={quote.industry || "-"} />
            <InfoRow label="Bursa" value={quote.exchange || "-"} />
            <InfoRow label="Mata Uang" value={quote.currency} />
            <InfoRow
              label="Karyawan"
              value={quote.fullTimeEmployees ? formatNumber(quote.fullTimeEmployees) : "-"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Kontak & Alamat
          </h3>
          {hasContact ? (
            <div className="space-y-4">
              {quote.website && (
                <ContactItem
                  icon="globe"
                  label="Website"
                  value={quote.website}
                  href={quote.website}
                />
              )}
              {quote.phone && (
                <ContactItem
                  icon="phone"
                  label="Telepon"
                  value={quote.phone}
                  href={`tel:${quote.phone}`}
                />
              )}
              {fullAddress && (
                <ContactItem icon="pin" label="Alamat Kantor Pusat" value={fullAddress} />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Informasi kontak tidak tersedia</p>
          )}
        </div>
      </div>

      {/* Ringkasan Pasar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Ringkasan Pasar
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox
            label="Kapitalisasi Pasar"
            value={quote.marketCapFmt || formatBigNumber(quote.marketCap)}
          />
          <MetricBox label="Harga Saat Ini" value={formatRupiah(quote.price)} />
          <MetricBox
            label="52W High"
            value={formatRupiah(quote.fiftyTwoWeekHigh)}
            valueClass="text-success-500"
          />
          <MetricBox
            label="52W Low"
            value={formatRupiah(quote.fiftyTwoWeekLow)}
            valueClass="text-error-500"
          />
        </div>
      </div>

      {/* Direksi / Company Officers */}
      {officers.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Direksi & Eksekutif Kunci
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {officers.map((o, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {(o.name || "?").substring(0, 1)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                    {o.name || "-"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {o.title || "-"}
                  </p>
                  {(o.age || o.totalPay) && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {o.age ? `Usia ${o.age}` : ""}
                      {o.age && o.totalPay ? " • " : ""}
                      {o.totalPay ? `Kompensasi ${formatBigNumber(o.totalPay)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About / Business Summary */}
      {summary && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Tentang Perusahaan
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {displaySummary}
          </p>
          {summaryIsLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              {expanded ? "Tampilkan lebih sedikit" : "Baca selengkapnya"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`text-sm font-bold text-gray-800 dark:text-white/90 ${valueClass || ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: "globe" | "phone" | "pin";
  label: string;
  value: string;
  href?: string;
}) {
  const icons = {
    globe: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    ),
    phone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    ),
    pin: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </>
    ),
  };

  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-brand-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
        >
          {icons[icon]}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand-500 hover:text-brand-600 break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-800 dark:text-white/90 break-words">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-gray-800 dark:text-white/90 ${className || ""}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-500 hover:text-brand-600 truncate max-w-[200px]">
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium text-gray-800 dark:text-white/90">{value}</span>
      )}
    </div>
  );
}
