"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import StockCard from "@/components/stocks/StockCard";
import type { StockQuote } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const POPULAR_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStocks() {
      setLoading(true);
      const results: StockQuote[] = [];
      for (const symbol of POPULAR_SYMBOLS) {
        try {
          const quote = await api.getStock(symbol);
          results.push(quote);
        } catch {
          // skip
        }
      }
      setStocks(results);
      setLoading(false);
    }
    fetchStocks();
  }, []);

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Welcome back, {user?.username}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening with the market today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "US Stocks", value: "8,000+", color: "text-brand-500" },
          { label: "Indicators", value: "4+", color: "text-success-500" },
          { label: "AI Model", value: "Random Forest", color: "text-theme-purple-500" },
          { label: "Powered By", value: "Rust + Axum", color: "text-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Popular Stocks */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Popular Stocks</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time quotes from Alpha Vantage</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : stocks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stocks.map((stock, index) => (
            <StockCard key={stock.symbol} quote={stock} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">Unable to fetch stock data. Make sure the backend is running.</p>
        </div>
      )}
    </div>
  );
}
