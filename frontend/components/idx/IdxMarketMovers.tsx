"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { idxApi, type IdxTopMover } from "@/services/idxApi";

interface Props {
  onSelectStock: (symbol: string) => void;
}

type Tab = "gainers" | "losers" | "active";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function IdxMarketMovers({ onSelectStock }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("gainers");
  const [gainers, setGainers] = useState<IdxTopMover[]>([]);
  const [losers, setLosers] = useState<IdxTopMover[]>([]);
  const [active, setActive] = useState<IdxTopMover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [g, l, a] = await Promise.all([
          idxApi.getTopGainers(),
          idxApi.getTopLosers(),
          idxApi.getMostActive(),
        ]);
        setGainers(g);
        setLosers(l);
        setActive(a);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "gainers", label: "Top Gainers" },
    { key: "losers", label: "Top Losers" },
    { key: "active", label: "Most Active" },
  ];

  const currentData = activeTab === "gainers" ? gainers : activeTab === "losers" ? losers : active;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Market Movers
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Data dari IDX & Yahoo Finance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Data */}
      {!loading && currentData.length > 0 && (
        <div className="space-y-1">
          {currentData.slice(0, 10).map((stock, idx) => (
            <Link
              key={stock.code}
              href={`/analisis/${stock.code}`}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-brand-500">
                  {stock.code.substring(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {stock.code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {stock.name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formatRupiah(stock.close)}
                </p>
                <p className={`text-xs font-semibold ${
                  stock.changePercent >= 0 ? "text-success-500" : "text-error-500"
                }`}>
                  {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                </p>
              </div>
              {activeTab === "active" && (
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs text-gray-400">Vol</p>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {(stock.volume / 1_000_000).toFixed(1)}M
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && currentData.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          Data belum tersedia saat ini.
        </p>
      )}
    </div>
  );
}
