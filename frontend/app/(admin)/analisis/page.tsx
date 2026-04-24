"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import IdxSearchBox from "@/components/idx/IdxSearchBox";
import IdxMarketMovers from "@/components/idx/IdxMarketMovers";
import { idxApi, type IdxPopularStock, type IdxMarketIndex } from "@/services/idxApi";

const SECTORS = ["All", "Banking", "Telco", "Consumer", "Mining", "Technology", "Property", "Healthcare", "Energy", "Automotive"];

function symbolToSlug(symbol: string): string {
  // BBCA.JK -> BBCA, TLKM.JK -> TLKM
  return symbol.replace(".JK", "").toUpperCase();
}

export default function AnalisisPage() {
  const router = useRouter();
  const [popularStocks, setPopularStocks] = useState<IdxPopularStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<IdxMarketIndex[]>([]);
  const [activeSector, setActiveSector] = useState("All");
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [manualSymbol, setManualSymbol] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoadingMarket(true);
      try {
        const [stocks, indices] = await Promise.all([
          idxApi.getPopularStocks(),
          idxApi.getMarketIndices(),
        ]);
        setPopularStocks(stocks);
        setMarketIndices(indices);
      } catch {
        // silently fail
      } finally {
        setLoadingMarket(false);
      }
    }
    loadData();
  }, []);

  const handleSelect = (symbol: string) => {
    router.push(`/analisis/${symbolToSlug(symbol)}`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSymbol.trim()) return;
    const sym = manualSymbol.trim().toUpperCase().replace(".JK", "");
    router.push(`/analisis/${sym}`);
    setManualSymbol("");
  };

  const filteredStocks =
    activeSector === "All"
      ? popularStocks
      : popularStocks.filter((s) => s.sector === activeSector);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Analisis Saham Indonesia
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Cari dan analisis saham yang terdaftar di Bursa Efek Indonesia (IDX) dengan data real-time dari Yahoo Finance, Alpha Vantage, dan IDX.
          Dilengkapi rekomendasi AI berdasarkan analisis teknikal.
        </p>
      </div>

      {/* Market Indices */}
      {marketIndices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {marketIndices.map((idx) => (
            <div
              key={idx.symbol}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{idx.name}</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90 mt-1">
                    {idx.price?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`text-right`}>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                    idx.change >= 0
                      ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                      : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
                  }`}>
                    {idx.change >= 0 ? (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                    {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent?.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingMarket && marketIndices.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Search Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          Cari Saham
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ketik kode saham atau nama perusahaan. Saham IDX otomatis ditandai.
        </p>

        <div className="max-w-xl">
          <IdxSearchBox onSelect={(symbol) => handleSelect(symbol)} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <form onSubmit={handleManualSubmit} className="flex gap-3 max-w-xl">
            <input
              type="text"
              value={manualSymbol}
              onChange={(e) => setManualSymbol(e.target.value)}
              placeholder="Atau ketik kode langsung (cth: BBCA, TLKM, PTRO)"
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <button
              type="submit"
              className="h-11 px-6 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Analisis
            </button>
          </form>
        </div>
      </div>

      {/* Market Movers */}
      <div className="mb-6">
        <IdxMarketMovers onSelectStock={handleSelect} />
      </div>

      {/* Popular IDX Stocks */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          Saham Populer IDX
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Pilih saham untuk melihat detail harga, chart, dan informasi fundamental.
        </p>

        {/* Sector Filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSector === sector
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {filteredStocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => handleSelect(stock.symbol)}
              className="flex flex-col items-start p-4 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50/50 transition-all text-left group dark:border-gray-800 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors">
                <span className="text-xs font-bold text-brand-500">{stock.code.substring(0, 2)}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{stock.code}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{stock.name}</p>
              <span className="mt-2 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded dark:bg-gray-800 dark:text-gray-400">
                {stock.sector}
              </span>
            </button>
          ))}
        </div>

        {filteredStocks.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            Tidak ada saham di sektor ini.
          </p>
        )}
      </div>
    </div>
  );
}
